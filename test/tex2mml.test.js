const { execSync } = require( 'child_process' );
const cli = `tex2mml.cjs`;
function run( command, input = null ) {
	return execSync( `node ${cli} ${command}`, { encoding: 'utf8', input } );
}

const { writeFileSync, rmSync } = require( 'node:fs' );
const path = require( 'path' );
const { tmpdir } = require( 'os' );
const [ writeTemp, removeTemp ] = ( () => {
	const files = [];
	return [
		( contents, extension ) => {
			const filepath = path.join( tmpdir(), `tex2mml-${process.pid}-${Date.now()}.${extension}` );
			writeFileSync( filepath, contents, 'utf8' );
			files.push( filepath );
			return filepath;
		},
		() => {
			for ( const filepath of files ) {
				try {
					rmSync( filepath, { force: true } );
				} catch ( e ) { /* ignore cleanup errors */ }
			}
		}
	];
} )();
function removeFile( filepath ) {
	try {
		rmSync( filepath, { force: true } );
	} catch ( e ) { /* ignore cleanup errors */ }
}

test( '-v flag shows version', () => {
	const output = run( '-v' );
	expect( output.trim() ).toContain( '4.1' );
} )

test( '-h flag shows help', () => {
	const output = run( '-h' );
	expect( output ).toContain( 'stdin' );
} )

const formulas = [ 'e = m c ^ 2', '\\left( x \\right)', '\\ce{ CO2 + C -> 2 CO }', '\\bra \\psi' ];
const errors = [ '\\left(', '\\sqrt' ];
const embeddings = [
	{ open: '\\(', close: '\\)', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '$', close: '$', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '\\[', close: '\\]', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '$$', close: '$$', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '\\begin{equation}', close: '\\end{equation}', intro: { ru: 'Свободное окружение', en: 'Free environment' } }
];
const escapeSomeHtml = ( ( replacements ) => {
	const regex = new RegExp( '[' + Object.keys( replacements ).join( '' ) + ']', 'g' );
	return ( str ) => str.replace( regex, ( ch ) => '&' + replacements[ch] + ';' );
} ) ( { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' } );
numErrors = ( output ) => ( output.match( /<merror /g ) || [] ).length;

const cleans = [];

for ( const lang of [ 'ru', 'en' ] ) {
	let counter = 0;
	let words = [];

	const inner = ( ( lang ) => {
		let inner = '<ul>';
		for ( const syntax of embeddings ) {
			const word = syntax.intro[lang];
			for ( const tex of formulas ) {
				const invoke = syntax.open + tex + syntax.close;
				inner += '\n<li>' + word + ': <code>' + invoke + '</code> &rarr; ' + invoke + '</li>';
				counter ++;
				words.push( word );
			}
		}
		return inner + '\n</ul>';
	} )( lang );
	const innerTmp = writeTemp( inner, `${lang}.tags` );

	const html = '<html><head><title>TeX to MathML test</title></head><body>' + inner + '</body></html>';
	const htmlTmp = writeTemp( html, `${lang}.html` );

	const htmlInvocations = {
		stdin: [ `-l ${lang}`, html ],
		path: [ `-l ${lang} -f '${htmlTmp}'`, null ]
	};
	for ( const [ mode, invocation ] of Object.entries( htmlInvocations ) )  {
		test( `Processed complete HTML (${mode} mode) contains one <html>
			and as many <math> tags as there were TeX formulas (${counter}) with TeX annotations;
			and no errors: ${lang}`,
		() => {
			const output = run( ...invocation ).toString();
			expect( output ).toContain( '<html' );
			const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
			expect( mathTags ).toBe( counter );
			for ( const tex of formulas ) {
				const escaped = escapeSomeHtml( tex );
				expect( output ).toContain( `<annotation encoding="application/x-tex">${escaped}</annotation>` );
			}
			expect( numErrors( output ) ).toBe( 0 );
		} );

		test( `Processed complete HTML (${mode} mode) preserves Unicode as-is: ${lang}`, () => {
			const output = run( ...invocation );
			for ( const word of words ) {
				expect( output.toString() ).toContain( word );
			}
		} );
	}

	const tagsInvocations = {
		stdin: [ `-l ${lang}`, inner ],
		path: [ `-l ${lang} -f '${innerTmp}'`, null ]
	};
	for ( const [ mode, invocation ] of Object.entries( tagsInvocations ) )  {
		test( `Processed HTML tags (${mode}) contain
			as many <math> tags as there were TeX formulas (${counter}) with TeX annotations,
			and no errors: ${lang}`,
		() => {
			const output = run( ...invocation ).toString();
			const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
			expect( mathTags ).toBe( counter );
			for ( const tex of formulas ) {
				const escaped = escapeSomeHtml( tex );
				expect( output ).toContain( `<annotation encoding="application/x-tex">${escaped}</annotation>` );
			}
			expect( numErrors( output ) ).toBe( 0 );
		} );
	}

	test( `Processed complete HTML (stdin mode) preserves doctype: ${lang}`, () => {
		let doctype = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
		"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`
		const output = run( '', doctype + html );
		expect( output.toString() ).toContain( doctype );
	} );

	const locale = require( '../locales/' + lang + '.json' );
	const macros = Object.keys( locale );
	test( 'Test that all macros from locales/' + lang + '.json (' + macros.length + ') are converted without errors', () => {
		let html = '<html><head><title>Test</title></head><body><ul>';
		for ( const macro of macros ) {
			const invoke = '\\( \\' + macro + ' \\)';
			html += '\n<li>' + macro + ': <code>' + invoke + '</code> &rarr; ' + invoke + '</li>';
		}
		html += '</ul></body></html>';
		const output = run( '', html ).toString();
		expect( output ).toContain( '<html' );
		const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
		expect( mathTags ).toBe( macros.length );
		for ( const macro of macros ) {
			const escaped = escapeSomeHtml( macroTest( macro ) );
			expect( output ).toContain( `<annotation encoding="application/x-tex"> ${escaped} </annotation>` );
		}
		expect( numErrors( output ) ).toBe( 0 );
	} );

	cleans.push( innerTmp, htmlTmp );
}

test( 'Process TeX contains one <math> tag with TeX annotation, and no error', () => {
	for ( const tex of formulas ) {
		const output = run( '', tex ).toString();
		const mathTags = ( output.match( /<math/g ) || [] ).length;
		expect( mathTags ).toBe( 1 );
		const escaped = escapeSomeHtml( tex );
		expect( output ).toContain( `<annotation encoding="application/x-tex">${escaped}</annotation>` );
		expect( numErrors( output ) ).toBe( 0 );
	}
} );

test( 'Process TeX with errors contains one <math> tag with TeX annotation, and one error', () => {
	for ( const tex of errors ) {
		const output = run( '', tex ).toString();
		const mathTags = ( output.match( /<math/g ) || [] ).length;
		expect( mathTags ).toBe( 1 );
		const escaped = escapeSomeHtml( tex );
		expect( output ).toContain( `<annotation encoding="application/x-tex">${escaped}</annotation>` );
		expect( numErrors( output ) ).toBe( 1 );
	}
} );

const config = require( '../config.json' );
const macros = Object.keys( config.tex.macros );
const takeArgument = new Set( [ 'ba', 'bc', 'bp', 'bs', 'ceil', 'floor', 'of' ] );
const macroTest = ( macro ) => '\\' + macro + ( takeArgument.has( macro ) ? '{ x }' : '' );
test( 'Test that all macros from config.js (' + macros.length + ') are converted without errors', () => {
	let html = '<html><head><title>Test</title></head><body><ul>';
	for ( const macro of macros ) {
		const invoke = '\\( ' + macroTest( macro ) + ' \\)';
		html += '\n<li>' + macro + ': <code>' + invoke + '</code> &rarr; ' + invoke + '</li>';
	}
	html += '</ul></body></html>';
	const output = run( '', html ).toString();
	expect( output ).toContain( '<html' );
	const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
	expect( mathTags ).toBe( macros.length );
	for ( const macro of macros ) {
		const escaped = escapeSomeHtml( macroTest( macro ) );
		expect( output ).toContain( `<annotation encoding="application/x-tex"> ${escaped} </annotation>` );
	}
	expect( numErrors( output ) ).toBe( 0 );
} );

const addedMacros = {
	'glory': '\\mbox{ Glory to Alexander Mashin! }',
	'tenthousand': '\\mbox{ 玛信 萬歲 }'
};
test( 'Test that all additional macros from <script> (' + Object.keys( addedMacros ).length + ') are converted', () => {
	let html = '<html><head><title>Test</title>';
	const injectedConfig = config;
	Object.assign( injectedConfig.tex.macros, addedMacros );
	injectedConfig.options.menuOptions = {
		settings: {
			zoom: 'DoubleClick',
			semantics: true
		},
		annotationTypes: {
			TeX: [ 'TeX', 'LaTeX', 'application/x-tex' ],
			OpenMath: [ 'OpenMath' ]
		}
	};
	html = html + '<script>window.MathJax = ' + JSON.stringify( injectedConfig ) + ';</script></head><body><ul>';
	const entries = Object.entries( addedMacros );
	for ( const [ macro, _ ] of entries ) {
		const invoke = '\\( \\' + macro + ' \\)';
		html += '\n<li>' + macro + ': <code>' + invoke + '</code> &rarr; ' + invoke + '</li>';
	}
	html += '</ul></body></html>';
	const output = run( '', html ).toString();
	expect( output ).toContain( '<html' );
	const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
	expect( mathTags ).toBe( Object.keys( addedMacros ).length );
	for ( const [ macro, _ ] of entries ) {
		const escaped = escapeSomeHtml( macro );
		expect( output ).toContain( `<annotation encoding="application/x-tex"> \\${escaped} </annotation>` );
	}
	expect( numErrors( output ) ).toBe( 0 );
} );

const bussproofs = `\\begin{prooftree}
	\\AxiomC{}
	\\RightLabel{Hyp$^{1}$}
	\\UnaryInfC{$P$}
	\\AXC{$P\\to Q$}
	\\RL{$\\to_E$}
	\\BIC{$Q^2$}
	\\AXC{$Q\\to R$}
	\\RL{$\\to_E$}
	\\BIC{$R$}
	\\AXC{$Q$}
	\\RL{Rit$^2$}
	\\UIC{$Q$}
	\\RL{$\\wedge_I$}
	\\BIC{$Q\\wedge R$}
	\\RL{$\\to_I$$^1$}
	\\UIC{$P\\to Q\\wedge R$}
\\end{prooftree}`;
const html_with_bussproofs = `<html><head><title>bussproofs</title></head><body>${bussproofs}</body></html>`;
test( 'HTML with bussproofs contains one <math> tag with a TeX annotation, and no errors', () => {
	const output = run( '', html_with_bussproofs ).toString();
	const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
	expect( mathTags ).toBe( 1 );
	const escaped = escapeSomeHtml( bussproofs );
	expect( output ).toContain( `<annotation encoding="application/x-tex">${escaped}</annotation>` );
	expect( numErrors( output ) ).toBe( 0 );
} );

afterAll( removeTemp );