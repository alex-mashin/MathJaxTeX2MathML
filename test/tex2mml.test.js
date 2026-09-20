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

const formulas = [ 'e = m c ^ 2' ];
const embeddings = [
	{ open: '\\(', close: '\\)', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '$', close: '$', intro: { ru: 'Внутристрочная формула', en: 'Inline formula' } },
	{ open: '\\[', close: '\\]', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '$$', close: '$$', intro: { ru: 'Выносная формула', en: 'Display formula' } },
	{ open: '\\begin{equation}', close: '\\end{equation}', intro: { ru: 'Свободное окружение', en: 'Free environment' } }
];

for ( const lang of [ 'ru', 'en' ] ) {
	let counter = 0;
	let words = [];
	const html = ( ( lang ) => {
		let html = '<html><head><title>TeX to MathML test</title></head><body><ul>';
		for ( const syntax of embeddings ) {
			const word = syntax.intro[lang];
			for ( const tex of formulas ) {
				const invoke = syntax.open + tex + syntax.close;
				html += '\n<li>' + word + ': <code>' + invoke + '</code> &rarr; ' + invoke + '</li>';
				counter ++;
				words.push( word );
			}
		}
		return html + '\n</ul></body></html>';
	} )( lang );
	words = [ ...new Set( words ) ];

	test( 'Process HTML from stdin contains one <html> as many <math> tags as there were TeX formulas (' + counter + ') with TeX annotations: ' + lang, () => {
		const output = run( '', html ).toString();
		expect( output ).toContain( '<html' );
		const mathTags = ( output.match( /<math[^>]*>.+?<\/math>/gs ) || [] ).length;
		expect( mathTags ).toBe( counter );
		for ( const tex of formulas ) {
			expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
		}
	} );

	test( 'Process HTML from stdin preserves doctype: ' + lang, () => {
		let doctype = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
		"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`
		const output = run( '', doctype + '\n' + html );
		expect( output.toString() ).toContain( doctype );
	} );

	test( 'Process HTML from stdin preserves Unicode as-is: ' + lang, () => {
		const output = run( '', html );
		for ( const word of words ) {
			expect( output.toString() ).toContain( word );
		}
	} );
}

test( 'Process TeX from stdin contains one <math> tag with TeX annotation', () => {
	for ( const tex of formulas ) {
		const output = run( '', tex ).toString();
		const mathTags = ( output.match( /<math/g ) || [] ).length;
		expect( mathTags ).toBe( 1 );
		expect( output ).toContain( `<annotation encoding="application/x-tex">${tex}</annotation>` );
	}
} );

const macros = Object.keys( require( '../config.json' ).tex.macros );
test( 'Test that all macros from config.js (' + macros.length + ') are converted', () => {
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
	 	expect( output ).toContain( `<annotation encoding="application/x-tex"> \\${macro} </annotation>` );
	}
} );

const addedMacros = {
	'glory': '\\mbox{ Glory to Alexander Mashin! }',
	'tenthousand': '\\mbox{ 玛信 萬歲 }'
};
test( 'Test that all additional macros from <script> (' + Object.keys( addedMacros ).length + ') are converted', () => {
	let html = '<html><head><title>Test</title>';
	const inject = JSON.stringify( addedMacros ).slice( 1, -1 );
	const script = `<script>window.MathJax = {
		"loader": {
			"load": [
				"input/tex",
				"[tex]/amscd",
				"[tex]/bbox",
				"[tex]/braket",
				"[tex]/cancel",
				"[tex]/centernot",
				"[tex]/colortbl",
				"[tex]/empheq",
				"[tex]/fontsizev3",
				"[tex]/gensymb",
				"[tex]/mathtools",
				"[tex]/mhchem",
				"[tex]/physics",
				"[tex]/tagformat",
				"[tex]/textcomp",
				"[tex]/upgreek",
				"[tex]/verb"
			]
		},
		"options": {
			"skipHtmlTags": [
				"script",
				"noscript",
				"style",
				"textarea",
				"pre",
				"code",
				"annotation",
				"annotation-xml",
				"tt",
				"nowiki",
				"kbd",
				"syntaxhighlight",
				"plantuml"
			],
			"ignoreHtmlClass": [
				"tex2jax_ignore",
				"diff"
			],
			"menuOptions": {
				"settings": {
					"zoom": "DoubleClick",
					"semantics": true
				},
				"annotationTypes": {
					"TeX": [ "TeX", "LaTeX", "application/x-tex" ],
					"OpenMath": [ "OpenMath" ]
				}
			}
		},
		"tex": {
			"packages": [
				"ams",
				"amscd",
				"base",
				"bbox",
				"braket",
				"cancel",
				"centernot",
				"colortbl",
				"empheq",
				"fontsizev3",
				"gensymb",
				"mathtools",
				"mhchem",
				"newcommand",
				"physics",
				"require",
				"tagformat",
				"textcomp",
				"textmacros",
				"upgreek",
				"verb"
			],
			"inlineMath": [
				[ "\\(", "\\)" ],
				[ "$", "$" ]
			],
			"displayMath": [
				[ "$$", "$$" ],
				[ "\\[", "\\]" ]
			],
			"tags": "ams",
			"maxBuffer": 10240,
			"macros": {
				"Ai": "\\operatorname{Ai}",
				"Alpha": "\\mbox{\\unicode{x0391}}",
				"Beta": "\\mbox{\\unicode{x0392}}",
				"Bi": "\\operatorname{Bi}",
				"C": "\\mathbb{C}",
				"Chi": "\\mbox{\\unicode{x03A7}}",
				"Ci": "\\operatorname{Ci}",
				"Coppa": "\\mbox{\\unicode{x03D8}}",
				"D": "\\mathbb{D}",
				"Ei": "\\operatorname{Ei}",
				"Epsilon": "\\mbox{\\unicode{x0395}}",
				"Erf": "\\operatorname{Erf}",
				"Eta": "\\mbox{\\unicode{x0397}}",
				"F": "\\mathbb{F}",
				"H": "\\mathbb{H}",
				"Hom": "\\operatorname{Hom}",
				"Ind": "\\operatorname{Ind}",
				"Iota": "\\mbox{\\unicode{x0399}}",
				"J": "\\mathbb{J}",
				"Kappa": "\\mbox{\\unicode{x039A}}",
				"Koppa": "\\mbox{\\unicode{x03DE}}",
				"Larr": "\\Leftarrow",
				"Left": "\\Leftarrow",
				"Li": "\\operatorname{Li}",
				"Mu": "\\mbox{\\unicode{x039C}}",
				"N": "\\mathbb{N}",
				"Nu": "\\mbox{\\unicode{x039D}}",
				"O": "\\mathbb{O}",
				"Omicron": "\\mbox{\\unicode{x039F}}",
				"P": "\\mbox{\\unicode{x00B6}}",
				"Q": "\\mathbb{Q}",
				"R": "\\mathbb{R}",
				"Rarr": "\\Rightarrow",
				"Rho": "\\mbox{\\unicode{x03A1}}",
				"Sampi": "\\mbox{\\unicode{x03E0}}",
				"Si": "\\operatorname{ Si }",
				"Stigma": "\\mbox{\\unicode{x03DA}}",
				"Tau": "\\mbox{\\unicode{x03A4}}",
				"Wr": "\\operatorname{ Wr }",
				"Ypsilon": "\\mbox{\\unicode{x03A5}}",
				"Z": "\\mathbb{Z}",
				"Zeta": "\\mbox{\\unicode{x0396}}",
				"am": "\\operatorname{ am }",
				"and" : "\\land",
				"arcctg": "\\operatorname{ arccot }",
				"arcgd": "\\operatorname{ arcgd }",
				"arch": "\\operatorname{ arcosh }",
				"arctg": "\\operatorname{ arctan }",
				"arcth": "\\operatorname{ arcotanh }",
				"arsh": "\\operatorname{ arsinh }",
				"arth": "\\operatorname{ artanh }",
				"ba": "\\left< #1 \\right>",
				"bc": "\\left\\lbrace #1 \\right\\rbrace",
				"bp": "\\left( #1 \\right)",
				"bs": "\\left[ #1 \\right]",
				"ceil": "\\left\\lceil #1 \\right\\rceil",
				"ch": "\\operatorname{ cosh }",
				"clubs": "\\clubsuit",
				"cd": "\\operatorname{ cd }",
				"cn": "\\operatorname{ cn }",
				"const": "\\operatorname{ const }",
				"coppa": "\\mbox{\\unicode{x03D9}}",
				"cs": "\\operatorname{ cs }",
				"ctg": "\\operatorname{ cot }",
				"cth": "\\operatorname{ cotanh }",
				"dalembert": "\\Box",
				"dc": "\\operatorname{ dc }",
				"del": "\\nabla",
				"diag": "\\operatorname{ diag }",
				"diamonds": "{ \\color{ red } \\diamondsuit }",
				"dn": "\\operatorname{ dn }",
				"ds": "\\operatorname{ ds }",
				"empty": "\\emptyset",
				"erfc": "\\operatorname{ erfc }",
				"erfi": "\\operatorname{ erfi }",
				"euro": "\\mbox{\\unicode{x20AC}}",
				"fint": "{\\huge\\unicode{x2A0F}}",
				"floor": "\\left\\lfloor #1 \\right\\rfloor",
				"gd": "\\operatorname{ gd }",
				"hearts": "{ \\color{ red } \\heartsuit }",
				"helm": "\\operatorname{ helm }",
				"ind": "\\operatorname{ind}",
				"intBar": "\\operatorname*{ \\huge\\unicode{x2A0E} }",
				"intbar": "\\operatorname*{ \\huge\\unicode{x2A0D} }",
				"intcap": "\\operatorname*{ \\huge\\unicode{x2A19} }",
				"intclockwise": "\\operatorname*{ \\huge\\unicode{x2231} }",
				"intctrclockwise": "\\operatorname*{ \\huge\\unicode{x2a11} }",
				"intcup": "\\operatorname*{ \\huge\\unicode{x2A1A} }",
				"koppa": "\\mbox{\\unicode{x03DF}}",
				"lam": "\\lambda",
				"larr": "\\leftarrow",
				"left": "\\leftarrow",
				"li": "\\operatorname{li}",
				"lowint": "\\operatorname*{ \\huge\\unicode{x2A1C} }",
				"nc": "\\operatorname{ nc }",
				"nd": "\\operatorname{ nd }",
				"ns": "\\operatorname{ ns }",
				"oiiint": "\\operatorname*{ \\huge\\unicode{x2230} }",
				"oiint": "\\operatorname*{ \\huge\\unicode{x222F} }",
				"ointclockwise": "\\operatorname*{ \\huge\\unicode{x2232} }",
				"ointctrclockwise": "\\operatorname*{ \\huge\\unicode{x2233} }",
				"of": "\\left( #1 \\right)",
				"or": "\\lor",
				"ord": "\\operatorname{ ord }",
				"rarr": "\\rightarrow",
				"rect": "\\operatorname{ rect }",
				"rot": "\\curl",
				"sampi": "\\mbox{\\unicode{x03E1}}",
				"sgn": "\\operatorname{ sgn }",
				"sh": "\\operatorname{ sinh }",
				"si": "\\operatorname{ si }",
				"sign": "\\operatorname{ sgn }",
				"sinc": "\\operatorname{ sinc }",
				"sc": "\\operatorname{ sc }",
				"sd": "\\operatorname{ sd }",
				"sn": "\\operatorname{ sn }",
				"spades": "\\spadesuit",
				"sqint": "\\operatorname*{ \\huge\\unicode{x2A16} }",
				"stigma": "\\mbox{\\unicode{x03DB}}",
				"sub": "\\subset",
				"sube": "\\subseteq",
				"supe": "\\supseteq",
				"surfintegral": "\\operatorname*{ \\huge\\unicode{x222F} }",
				"textvisiblespace": "\\mbox{\\unicode{x2423}}",
				"tg": "\\operatorname{ tan }",
				"th": "\\operatorname{ tanh }",
				"thetasym": "\\mbox{\\unicode{x03D1}}",
				"up": "\\operatorname{ up }",
				"upint": "\\operatorname*{ \\huge\\unicode{x2A1B} }",
				"varoiiint": "\\operatorname*{ \\huge\\unicode{x2230} }",
				"varoiint": "\\operatorname*{ \\huge\\unicode{x222F} }",
				"varointclockwise": "\\operatorname*{ \\huge\\unicode{x2232} }",
				"varointctrclockwise": "\\operatorname*{ \\huge\\unicode{x2A11} }",
				"vline": "\\mbox{\\unicode{x007C}}",
				"volintegral": "\\operatorname*{ \\huge\\unicode{x2230} }",
				"weierp": "\\wp",
				"ypsilon": "\\mbox{\\unicode{x03C5}}",
				"zn": "\\operatorname{ zn }",
				${inject}
			}
		},
		"startup": {
			"typeset": true
		}
	}</script>`;
	html = html + script + '</head><body><ul>';
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
} );