# MathJax TeX to MathML

A command-line tool for converting TeX expressions to MathML using MathJax v4.

## Installation

```bash
git clone https://github.com/alex-mashin/MathJaxTeX2MathML.git
cd MathJaxTeX2MathML
npm i
```

## Usage

Reads input from **stdin**. A standalone equation is treated as TeX; any input that resembles HTML or XML markup is processed as an HTML page:

```bash
# Show version / help
node tex2mml.cjs -v           # Print the MathJax/MathML tool version
node tex2mml.cjs -h           # Show this help message

# Convert a single TeX equation to embedded MathML (reads from stdin)
echo 'e = m c ^ 2' | node tex2mml.cjs > output.mml

# Render an HTML page containing formulas; each formula becomes <math …></math> and its original source is added as an <annotation>
node tex2mml.cjs < input.html > output.html

# Run tests:
npm test
```

### Custom macros

`config.json` defines ~139 custom `\newcommand`-style macros. They fall into these rough groups (the full list lives in `config.json`; every macro is covered by an end-to-end test):

- **Uppercase Greek letters** as literal text, usable outside math mode: `\Alpha`, `\Beta`, `\Chi`, …
- **Double-struck / blackboard number sets and groups**: `\N`→ℕ, `\Z`→ℤ, `\Q`→ℚ, `\R`→ℝ, `\C`→ℂ (plus `\D`, `\F`, `\H`, `\O`).
- **Special analytic functions** as operator names: Airy `Ai`/`Bi`, exponential integral `Ei`, sine/cosine integrals `Si`/`Ci`, error function `Erf`/`erfc`/`erfi`, logarithmic integral `Li`.
- **Russian-style trig / hyperbolic abbreviations** (Cyrillic math convention): `\tg`→tan, `\ctg`→cot; `\sh`/\`\ch\`/\`\th\` → sinh/cosh/tanh; and their inverse forms (`arsh`, `arch`, …).
- **Jacobi elliptic / auxiliary operators**: `cn`, `dn`, `sn`, plus related operator names.
- **Arrows & relations**, logical connectives, set membership: `\larr`, `\rarr`, `\and`, `\or`, `\emptyset` (`\empty`), subset/superset forms.
- **Suits and symbols**: club/spade/heart/diamond card suits (hearts & diamonds in red), euro `€`.

### Enabled TeX packages

TeX processing is configured entirely through `config.json` — the enabled packages, custom macros, math delimiters (`$…$`, `\(...\)`, `\[…\]`, `$$ … $$`) and which HTML tags/classes are skipped while scanning stdin. Two families of packages are loaded:

**LaTeX / CTAN packages (each is a standalone package):**

- **amsmath** — AMS maths facilities; also pulls in `amsbsy` (bold symbols), `amsopn` (operator names) and `amstext`. <https://www.ctan.org/pkg/amsmath>
- **mathtools** — extensible brackets/arrows, `\coloneqq`, starred matrices, more environments. Built on amsmath; repository at <https://github.com/latex3/mathtools>. <https://www.ctan.org/pkg/mathtools>
- **empheq** — box/highlight equations and side material (`\begin{empheq}`); part of the mathtools bundle, same repo. <https://www.ctan.org/pkg/empheq>
- **amscd** — AMS commutative diagrams (ships with amsmath). <https://www.ctan.org/pkg/amscd>
- **colortbl** — colour rows/columns/cells in tables; by David Carlisle. <https://www.ctan.org/pkg/colortbl>
- **gensymb** — generic unit symbols usable in text and math (`\degree`, `\ohm`, …). <https://www.ctan.org/pkg/gensymb>
- **upgreek** — upright Greek letters (`\upalpha`, …); part of the `was` bundle. <https://www.ctan.org/pkg/upgreek>
- **textcomp** — text Companion-font symbols (copyright, section markers, …). <https://www.ctan.org/pkg/textcomp>

**MathJax-native TeX extensions (ship within MathJax's input handler rather than as standalone packages):**

- **physics** — clean notation for quantum-mechanical bra-ket (`\langle x | y \rangle`), derivatives and the nabla, derived from Philip Norness's *physicsTeX* project. <https://www.mathjax.org/>
- **verb** — inline verbatim inside math via `\verb`. <https://docs.mathjax.org/en/latest/tex2mathml.html>
- **tagformat** — customise equation tags (e.g. the body of `\tag{…}`). <https://www.mathjax.org/>
- **centernot** — centered negations such as `\cancel` and related notations. <https://docs.mathjax.org/en/latest/tex2mathml.html>
- **newcommand**, **textmacros**, **require**, **base** — core TeX machinery (custom commands, text macros, runtime package loading via `\require`, and the base math engine) handled by MathJax's input handler. <https://www.mathjax.org/>

### TeX → MathML example

Input:

```bash
echo 'E = m c ^ 2' | node tex2mml.cjs
```

Output (formatted for readability):

```xml
<math xmlns="http://www.w3.org/1998/Math/MathML" data-latex="E = m c ^ 2">
  <annotation encoding="application/x-tex">E = m c ^ 2</annotation>
  ...MathML content...
</math>
```

The `<annotation encoding="application/x-tex">` tag carries the original TeX source, so downstream consumers can round-trip back to LaTeX.

### HTML mode example

Given `input.html`:

```html
<html><head><title>Demo</title></head><body>
<p>The energy is \(E = m c ^ 2\).</p>
</body></html>
```

Running it produces a full `<html>…</html>` document in which every formula has been replaced by its MathML rendering:

```bash
node tex2mml.cjs < input.html > output.html
```

## Integration

This script works server-side, or Dockerised (use `Dockerfile` and `docker-compose.yml` in this case).

It was developed to use with MediaWiki (External Data and MathJax extensions), but presumably, can work with other frameworks.

## Implementation details

The script requires `node.js` and `npm`.

The bundled `.cjs` script depends only on `@mathjax/src` and `@js-util/config-object-merge`;
it defines small flat functions (`isHTML`, `tex2mml`, `convertTeX`, `typesetHTML`, `renderMathML`) rather than bundling large utility objects.

## Author

This application is based on:
 - the code from [MathJax Demos Node](https://github.com/mathjax/MathJax-demos-node), radically refactored,
 - the conversion script for MathJax 3, previously distributed with [MathJax](https://github.com/alex-mashin/MathJax) extension for MediaWiki.
AI assistant (OpenCode) was used to help coding.

**Author:** Alexander Mashin
**License:** MIT

This repository is published openly on GitHub at <https://github.com/alex-mashin/MathJaxTeX2MathML.git>.

Copyright (c) 2021-2026 Alexander Mashin
