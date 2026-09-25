const { execSync } = require( 'child_process' );
const cli = `tex2mml.cjs`;
function run( command, input = null ) {
	return execSync( `node ${cli} ${command}`, { encoding: 'utf8', input } );
}

test( '-v flag shows version', () => {
	const output = run( '-v' );
	expect( output.trim() ).toContain( '4.1' );
} )

test( '-h flag shows help', () => {
	const output = run( '-h' );
	expect( output ).toContain( 'stdin' );
} )

const formulas = [ 'e = m c ^ 2', '\left( x \right)' ];
const errors = [ '\\left(', '\\sqrt' ];
const embeddings = [
	{ open: '\\(', close: '\\)', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '$', close: '$', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '\\[', close: '\\]', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '$$', close: '$$', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '\\begin{equation}', close: '\\end{equation}', intro: { ru: 'Свободное окружение', en: 'Free environment' } }
];
numErrors = ( output ) => ( output.match( /<merror /g ) || [] ).length;

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

	const html = '<html><head><title>TeX to MathML test</title></head><body>' + inner + '</body></html>';

	test( 'Process complete HTML contains one <html> and as many <math> tags as there were TeX formulas (' + counter + ') with TeX annotations, and no errors: ' + lang, () => {
		const output = run( '', html ).toString();
		expect( output ).toContain( '<html' );
		const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
		expect( mathTags ).toBe( counter );
		for ( const tex of formulas ) {
			expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
		}
		expect( numErrors( output ) ).toBe( 0 );
	} );

	test( 'Process HTML tags contain as many <math> tags as there were TeX formulas (' + counter + ') with TeX annotations, and no errors: ' + lang, () => {
		const output = run( '', inner ).toString();
		const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
		expect( mathTags ).toBe( counter );
		for ( const tex of formulas ) {
			expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
		}
		expect( numErrors( output ) ).toBe( 0 );
	} );

	test( 'Process complete HTML preserves doctype: ' + lang, () => {
		let doctype = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
		"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`
		const output = run( '', doctype + '\n' + html );
		expect( output.toString() ).toContain( doctype );
	} );

	test( 'Process complete HTML preserves Unicode as-is: ' + lang, () => {
		const output = run( '', html );
		for ( const word of words ) {
			expect( output.toString() ).toContain( word );
		}
	} );

}

test( 'Process TeX contains one <math> tag with TeX annotation, and no error', () => {
	for ( const tex of formulas ) {
		const output = run( '', tex ).toString();
		const mathTags = ( output.match( /<math/g ) || [] ).length;
		expect( mathTags ).toBe( 1 );
		expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
		expect( numErrors( output ) ).toBe( 0 );
	}
} );

test( 'Process TeX with errors contains one <math> tag with TeX annotation, and one error', () => {
	for ( const tex of errors ) {
		const output = run( '', tex ).toString();
		const mathTags = ( output.match( /<math/g ) || [] ).length;
		expect( mathTags ).toBe( 1 );
		expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
		expect( numErrors( output ) ).toBe( 1 );
	}
} );

const config = require( '../config.json' );
const macros = Object.keys( config.tex.macros );
const macroTest = ( macro ) => '\\' + macro + ( takeArgument.has( macro ) ? '{ x }' : '' );
const takeArgument = new Set( [ 'ba', 'bc', 'bp', 'bs', 'ceil', 'floor', 'of' ] );
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
	 	expect( output ).toContain( '<annotation encoding="application/x-tex"> ' + macroTest( macro ) + ' </annotation>' );
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
	 	expect( output ).toContain( `<annotation encoding="application/x-tex"> \\${macro} </annotation>` );
	}
	expect( numErrors( output ) ).toBe( 0 );
} );