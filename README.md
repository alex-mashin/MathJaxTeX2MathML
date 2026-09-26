# MathJax TeX to MathML

A command-line tool for converting TeX expressions to MathML using MathJax 4.1.

## Installation

```bash
git clone https://github.com/alex-mashin/MathJaxTeX2MathML.git
cd MathJaxTeX2MathML
npm i
```

## Usage

Reads input from **stdin**, or from a file with `-f <path>` when the client cannot safely pipe all of it on stdin. A standalone equation is treated as TeX; any input that resembles HTML or XML markup (even incomplete) is processed as an HTML page:

```bash
# Show version / help
node tex2mml.cjs -v           # Print the MathJax/MathML tool version
node tex2mml.cjs -h           # Show this help message

# Convert a single TeX equation to embedded MathML (reads from stdin), render with English conventions about function naming:
echo 'e = m c ^ 2' | node tex2mml.cjs -l en > output.mml

# Render an HTML page containing formulas; each formula becomes <math …></math> and its original source is added as an <annotation>,
# render with Russian (default) conventions about function naming:
node tex2mml.cjs -l ru < input.html > output.html

# Read the document from a file instead of stdin — useful when clients such as MediaWiki cap how much data they can pipe on another program's stdin:
node tex2mml.cjs -l ru -f input.html > output.html

# Run tests:
npm test
```

### Custom macros

- `config.json` defines 124 custom `\newcommand`-style macros. They fall into these rough groups (the full list lives in `config.json`; every macro is covered by an end-to-end test):

  - **Uppercase Greek letters** that look like Latin capitals: `\Alpha`, `\Beta`, `\Chi`, …
  - **Double-struck / blackboard number sets and groups**: `\N`→ℕ, `\Z`→ℤ, `\Q`→ℚ, `\R`→ℝ, `\C`→ℂ (plus `\D`, `\F`, `\H`, `\O`).
  - **Special analytic functions** as operator names: Airy `Ai`/`Bi`, exponential integral `Ei`, sine/cosine integrals `Si`/`Ci`, error function `Erf`/`erfc`/`erfi`, logarithmic integral `Li`.
  - **Jacobi elliptic / auxiliary operators**: `cn`, `dn`, `sn`, plus related operator names.
  - **Arrows & relations**, logical connectives, set membership: `\larr`, `\rarr`, `\and`, `\or`, `\emptyset` (`\empty`), subset/superset forms.
  - **Suits and symbols**: club/spade/heart/diamond card suits (hearts & diamonds in red), euro `€`.

- `locale/ru.json` (re-)defines 82 custom `\newcommand`-style macros -- trig / hyperbolic abbreviations -- in Russian style: `\tg`→tan, `\ctg`→cot; `\sh` / `\ch` / `\th` → sinh/cosh/tanh; and their inverse forms (`arsh`, `arch`, …).

- `locale/en.json` defines 14 custom `\newcommand`-style macros -- Russian-style trig / hyperbolic abbreviations displayed following English tradition.


### Enabled TeX packages

TeX processing is configured through `config.json` and `locales/(lang).json` — the enabled packages, custom macros, math delimiters (`$…$`, `\(...\)`, `\[…\]`, `$$ … $$`) and which HTML tags/classes are skipped while scanning stdin.

- **amsmath** — AMS maths facilities; also pulls in `amsbsy` (bold symbols), `amsopn` (operator names) and `amstext`. <https://www.ctan.org/pkg/amsmath>
- **mathtools** — extensible brackets/arrows, `\coloneqq`, starred matrices, more environments. Built on amsmath; repository at <https://github.com/latex3/mathtools>. <https://www.ctan.org/pkg/mathtools>
- **empheq** — box/highlight equations and side material (`\begin{empheq}`); part of the mathtools bundle, same repo. <https://www.ctan.org/pkg/empheq>
- **amscd** — AMS commutative diagrams (ships with amsmath). <https://www.ctan.org/pkg/amscd>
- **colortbl** — colour rows/columns/cells in tables; by David Carlisle. <https://www.ctan.org/pkg/colortbl>
- **gensymb** — generic unit symbols usable in text and math (`\degree`, `\ohm`, …). <https://www.ctan.org/pkg/gensymb>
- **upgreek** — upright Greek letters (`\upalpha`, …); part of the `was` bundle. <https://www.ctan.org/pkg/upgreek>
- **textcomp** — text Companion-font symbols (copyright, section markers, …). <https://www.ctan.org/pkg/textcomp>
- **physics** — clean notation for quantum-mechanical bra-ket (`\bra \psi`), derivatives and the nabla by Sergio C. de la Barrerat. <https://ctan.org/pkg/physics?lang=en>
- **mhchem** — chemical formulas (`\ce{ CO2 + C -> 2 CO }`), chemical formulas. <https://github.com/mhchem/MathJax-mhchem>
- **bussprofs** — proof trees in the style of the sequent calculus; by Samuel R. Buss. Only in HTML/tags modes. <https://www.ctan.org/pkg/bussproofs>
- **verb** — inline verbatim inside math via `\verb`. <https://docs.mathjax.org/en/latest/input/tex/extensions/verb.html>
- **tagformat** — customise equation tags (e.g. the body of `\tag{…}`). <https://docs.mathjax.org/en/latest/input/tex/extensions/tagformat.html>
- **centernot** — centered negations such as `\cancel` and related notations by Heiko Oberdiek. <https://www.ctan.org/pkg/centernot>
- **newcommand**, **textmacros**, **require**, **base** — core TeX machinery (custom commands, text macros, runtime package loading via `\require`, and the base math engine) handled by MathJax's input handler. <https://www.mathjax.org/>

### TeX → MathML example

Input:

```bash
echo 'E = m c ^ 2' | node tex2mml.cjs
```

Output (formatted for readability):

```xml
<math xmlns="http://www.w3.org/1998/Math/MathML" data-latex="E = m c ^ 2" display="block"><semantics><mrow>
  <mi data-latex="E">E</mi>
  <mo data-latex="=">=</mo>
  <mi data-latex="m">m</mi>
  <msup data-latex="c^2">
    <mi data-latex="c">c</mi>
    <mn data-latex="2">2</mn>
  </msup>
</mrow><annotation encoding="application/x-tex">E = m c ^ 2</annotation></semantics></math>
```

The `<annotation encoding="application/x-tex">` tag carries the original TeX source, so downstream consumers can round-trip back to LaTeX.

### HTML mode example

```bash
node tex2mml.cjs < input.html > output.html
```

given `input.html`:

```html
<html><head><title>Demo</title></head><body>
<p>The energy is \(E = m c ^ 2\).</p>
</body></html>
```

 produces:
 
```html
<html><head><title>Demo</title></head><body>
<p>The energy is <math xmlns="http://www.w3.org/1998/Math/MathML" data-latex="E = m c ^ 2"><semantics><mrow>
  <mi data-latex="E">E</mi>
  <mo data-latex="=">=</mo>
  <mi data-latex="m">m</mi>
  <msup data-latex="c^2">
    <mi data-latex="c">c</mi>
    <mn data-latex="2">2</mn>
  </msup>
</mrow><annotation encoding="application/x-tex">E = m c ^ 2</annotation></semantics></math>.</p>
</body></html>
```


## Integration

This script works server-side, or Dockerised (use `Dockerfile` and `docker-compose.yml` in this case).

It was developed to use with MediaWiki (External Data and MathJax extensions), but presumably, can work with other frameworks.

### Reading from a file instead of stdin (`-f`)

Some clients — notably MediaWiki feeding data into the external converter — cap how much they will put on another program's **stdin**. When that is a concern, pass `-f <path>` to read the document from a temporary file rather than stdin:

```bash
node tex2mml.cjs -l ru -f /tmp/input.html > output.html
```

The client owns creation and cleanup of such temp files; `tex2mml.cjs` only reads them. By default (no `-f`) input still comes from **stdin**.

## Implementation details

The script requires `node.js` and `npm`.

The bundled `.cjs` script depends only on `@mathjax/src` and `@js-util/config-object-merge`;
it defines small flat functions (`inputType`, `tex2mml`, `convertTeX`, `typesetTags`, `typesetHTML`, `renderMathML`) rather than bundling large utility objects.

## Author

This application is based on:

 - the code from [MathJax Demos Node](https://github.com/mathjax/MathJax-demos-node), radically refactored,
 - the conversion script for MathJax 3, previously distributed with [MathJax](https://github.com/alex-mashin/MathJax) extension for MediaWiki.

An AI assistant (OpenCode) was used to help coding.

**Author:** Alexander Mashin

**License:** MIT

This repository is published openly on GitHub at <https://github.com/alex-mashin/MathJaxTeX2MathML.git>.

Copyright (c) 2021-2026 Alexander Mashin