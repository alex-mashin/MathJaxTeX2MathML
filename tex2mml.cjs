#!/usr/bin/env node

/*************************************************************************
 *
 *  tex2mml.cjs — Uses MathJax v4 to convert TeX expressions into MathML strings.
 *                 A standalone CommonJS script depending only on @mathjax/src; it
 *                 defines small flat functions (isHTML, tex2mml, convertTeX,
 *                 typesetHTML, renderMathML) rather than bundling utility objects.
 *
 * ----------------------------------------------------------------------
 *
 *  Copyright (c) 2021-2026 Alexander Mashin
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 */

const path = require( 'path' );
const MathJax = require( '@mathjax/src/source' );
const merge = require( '@js-util/config-object-merge' ).all;

// mhchem registers as a TEX input package via '[tex]/mhchem'; fontExtension() in that component also records output-side data
// (rendererExtensions + extraLoads pulling '@mathjax/mathjax-mhchem-font-extension/chtml.js') so loading it makes CHTML an active
// renderer on the document. This tool converts TeX to raw MathML, which needs NO output jax — with CHTML registered convertPromise
// returns rendered DOM nodes and SerializedMmlVisitor.visitTree() throws reading their childNodes.length for every equation. Strip
// mhchem's output-side registration so it loads purely as a TEX input handler (enabling \\ce{}), leaving convertPromise returning the
// semantic MML nodes tex2mml.cjs serializes — no active rendering jax, no crash. Companion font component still resolves if present:
const _MathJaxLoader = MathJax.loader;
if ( _MathJaxLoader && typeof _MathJaxLoader.addPackageData === 'function' ) {
	const _addPackageData = _MathJaxLoader.addPackageData.bind( _MathJaxLoader );
	_MathJaxLoader.addPackageData = function ( id, data ) {
		if ( /mhchem/.test( String( id ) ) && data && typeof data === 'object' ) {
			const clean = {};
			for ( const key of Object.keys( data ) ) if ( key !== 'rendererExtensions' && key !== 'extraLoads' ) clean[ key ] = data[ key ];
			return _addPackageData( id, clean );
		}
		return _addPackageData( id, data );
	};
}

// liteDOM resolves entity references (e.g. &rarr;) through its own bundled parser, whose async retry on an
// unknown-named-entity throws inside MathJax's synchronous document parse and aborts the whole conversion.
// We therefore preload every entity set ourselves and translate user-supplied HTML entities up front, so only
// resolved characters (and natively-handled numeric refs) ever reach liteDOM:
const entities = require( '@mathjax/src/cjs/util/Entities.js' );
const entitDir = path.join( __dirname, 'node_modules', '@mathjax/src/cjs/util/entities' );
// Populate the shared entity registry up front so named HTML entities resolve during document conversion.
( () => {
	const files = [ ...'abcdefghijklmnopqrstuvwxyz', 'fr', 'scr', 'opf' ];
	for ( const f of files ) try {
		entities.add( require( path.join( entitDir, f + '.js' ) ), f );
	} catch {}
} )();

const typeTex = 0;
const typeHtml = 1;
const typeTags = 2;
const inputType = ( str ) => {
	if ( /^\s*(<!doctype[^<>]+>\s*)?<(html)(\s+[^<>]+)?>.+<\/html\s*>\s*$/is.test( str ) ) return typeHtml;
	if ( /^\s*(<(?<tag>[a-z-.]+)(\s+[^<>]+)?>.+<\/\k<tag>\s*>)+\s*$/is.test( str ) ) return typeTags;
	return typeTex;
}

// Inject an <annotation> of the original source inside a serialized MathML element string:
const withAnnotation = ( mml, math, adaptor ) => {
	const parsed = adaptor.clone( adaptor.parse( mml, 'text/mathml' ).body.children[0] );
	const tex = math.attributes.attributes['data-latex'];
	const annotation = adaptor.node( 'annotation', { encoding: 'application/x-tex' }, [ adaptor.text( tex ) ] );
	const mrow = adaptor.node( 'mrow' );
	for ( node of adaptor.childNodes( parsed ) ) {
		adaptor.append( mrow, node );
	}
	parsed.children = []; // otherwise, there are still empty text nodes.
	const semantics = adaptor.node( 'semantics' );
	adaptor.append( semantics, mrow );
	adaptor.append( semantics, annotation );
	adaptor.append( parsed, semantics );
	return adaptor.outerHTML( parsed );
};

// Used in both TeX and HTML modes: `math` is the original source to embed as an <annotation> (optional):
const tex2mml = ( node, document ) => {
	try {
		const mml = MathJax.startup.visitor.visitTree( node, document );
		return withAnnotation( mml, node, document.adaptor );
	} catch ( error ) {
		return '<span class="error">' + ( error.message ?? error ) + '</span>';
	}
};

// Used by plain TeX input:
const convertTeX = async ( math, document ) => {
	const node = await document.convertPromise( String( math ) );
	return tex2mml( node, document );
};

// Used by HTML input:
const extractConfig = async ( html, adaptor ) => {
	const scripts = adaptor.getElements( 'script', html );
	for ( const script of scripts ) {
		const content = script.textContent || script.innerText;
		if ( !content ) continue;
		const lines = content.trim().split( '\n' );
		const firstLine = lines[0].trim();
		if (
			firstLine.startsWith( 'window.MathJax =' ) ||
			firstLine.startsWith( 'MathJax =' )
		) {
			const configStr = content
				.replace( /^\s*(window\.)?MathJax\s*=\s*/, '' )
				.replace( /\s*;\s*$/, '' );
			try {
				const parsed = JSON.parse( configStr );
			} catch ( error ) {
				console.error( `Error: Failed to parse MathJax config from HTML: ${error.message}` );
				process.exit( 1 );
			}
			delete parsed.options.menuOptions;
			return parsed;
		}
	}
	return {};
}

const typesetHTML = async ( document ) => {
	await document.renderPromise();
	const adaptor = document.adaptor;
	const doc = document.document;
	const doctype = adaptor.doctype( doc );
	return ( doctype ? doctype + '\n' : '' ) + adaptor.outerHTML( adaptor.root( doc ) );
};

// Used by HTML and tags inpit:
const renderMathML = ( math, document ) => {
	const adaptor = document.adaptor;
	const mml =  tex2mml( math.root, document );
	math.typesetRoot = adaptor.firstChild( adaptor.body( adaptor.parse( mml, 'text/html' ) ) );
};

// Used by tags input:
const typesetTags = async ( document ) => {
	await document.renderPromise();
	const adaptor = document.adaptor;
	const doc = document.document;
	return adaptor.innerHTML( adaptor.root( doc ).children[1] );
};

const typeset = async( input, config ) => {
	await MathJax.init( config ); // initialise MathJax, so we have an adaptor.

	// HTML mode: correcting MathJax after detecting stdin type — re-init with our converter + auto-typesetting of the parsed document:
	const type = inputType( input );
	if ( type !== typeTex ) {
		config.startup.document = input;
		const extracted = await extractConfig( config.startup.document, MathJax.startup.adaptor );
		const merged = merge( [ config, extracted ] );
		merged.options.renderActions = {
			typeset: [
				150,
				( doc ) => {
					for ( const math of doc.math ) {
						renderMathML( math, doc )
					}
				}
			]
		};

		await MathJax.init( merged );
		if ( type === typeHtml ) {
			return await typesetHTML( MathJax.startup.document );
		} else {
			return await typesetTags( MathJax.startup.document );
		}
	} else {
		return await convertTeX( input.trim(), MathJax.startup.document );
	}
};

( async () => {
	let locale = 'ru';
	const args = process.argv.slice( 2 );
	for ( let pos = 0; pos < args.length; pos++ ) {
		const arg = args[pos];
		if ( arg === '-h' || arg === '--help' ) {
			console.log( `tex2mml.cjs [options]
Convert TeX expressions to MathML via stdin.

Options:
-h, --help    Show this help message
-v, --version Show version
-l, --lang    Set locale (optional, default '${locale}')

Input: Read from stdin. Auto-detects HTML vs TeX based on content.` );
			process.exit( 0 );
		} else if ( arg === '-v' || arg === '--version' ) {
			console.log( MathJax.version || '4.1.3' );
			process.exit( 0 );
		} else if ( arg === '-l' || arg === '--lang' ) {
			locale = args[++pos] ?? locale;
		}
	}

	const chunks = [];
	for await ( const chunk of process.stdin ) chunks.push( chunk );
	const input = Buffer.concat( chunks ).toString( 'utf8' );

	const config = require( './config.json' );
	let locale_macros;
	try {
		locale_macros = require( './locales/' + locale + '.json' );
	} catch {
	 	locale_macros = require( './locales/ru.json' );
	}
	config.tex.macros = merge( [ config.tex.macros, locale_macros ] );

	console.log( await typeset( input, config ) );
} )();