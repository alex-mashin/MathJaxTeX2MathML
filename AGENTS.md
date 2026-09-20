# AGENTS.md

## Workflow

Changes are applied one at a time, each followed by `npm test`. When tests pass, in order:
1. Remove throwaway probe/debug artifacts created during the task (e.g. `_*.cjs`, `_dbg.js`) — use them only to investigate, then delete as soon as they're no longer needed and never leave them in the working tree at end of task; re-run `npm run lint && npm test` so the tracked tree stays clean.
2. Lint (`npm run lint`).
3. Commit the working tree — commit after *every* successful change so any step can be reverted without losing prior work.

## Core Commands

- **Run tests**: `npm test`
- **Lint**: `npm run lint`

Order matters: `lint -> test`.

## Architecture

- **Entry point**: `/tex2mml.cjs` (bundled CommonJS script with MathJax v4)
- **Runtime config**: `config.json`, loaded via `require('./config.json')` and passed to `MathJax.init()` — defines the TeX packages, custom macros (`\AA`, `\C`, etc.), inline/display delimiters, and HTML options (`skipHtmlTags`, `ignoreHtmlClass`) used during conversion
- **Runtime dependencies**: `@mathjax/src`, plus `@js-util/config-object-merge` for deep-config merging in HTML mode
- **Build tools**: webpack, terser-webpack-plugin (dev dependencies)
- **Container/CGI**: `Dockerfile` + `docker-compose.yml` containerise the tool; the Alpine image installs Node and runs the bundled `.cjs` as an HTTP CGI server (busybox httpd, port 80) returning `text/mathml`, wired into a MediaWiki install via the MathJax extension's External Data / `$wgmjUseCDN`. The compose template orchestrates mediawiki/frontend/mathjax services.

## Configuration

The MathJax configuration lives in the top-level `config.json`. It shapes both TeX and HTML processing: custom macros, enabled packages (`ams`, `empheq`, `physics`, ...), math delimiters (`$...$`, `\(...\)`, etc.), `maxBuffer`, and which HTML tags/classes are skipped or ignored when scanning stdin. When changing conversion behavior (new macros/packages/tag handling), edit this file rather than hard-coding options in `tex2mml.cjs`. In HTML mode only, a leading `<script>window.MathJax = {…}</script>` block on stdin is parsed and its object merged over `config.json` (`@js-util/config-object-merge`) so the page can override packages/macros/delimiters — `options.menuOptions` is stripped from any such override before merging.

## Usage Patterns

| Command                         | Purpose                                       |
|---------------------------------|-----------------------------------------------|
| `node tex2mml.cjs -v`           | Show version                                  |
| `node tex2mml.cjs -h`           | Show help                                     |
| `node tex2mml.cjs < input.tex`  | Convert TeX from stdin                        |
| `node tex2mml.cjs < input.html` | Process HTML file with TeX formulas via stdin |

## Input Handling

- **TeX mode**: Standalone equation
- **HTML mode**: Auto-detected with a regex (`tex2mml.cjs`) — an optional `<!doctype>` followed by a matching `<tag>…</tag>` ⇒ HTML, otherwise TeX. Output is a full `<html>…</html>` page with each formula rendered as `<math …></math>`

## Test Suite

Located at `test/tex2mml.test.js`. Key tests verify:
- Version (`-v`) shows MathJax version (4.1.x)
- Help (`-h`) flag works before MathJax initialization
- TeX/HTML auto-detection via isHTML()
- **HTML processing from stdin produces `<html>...</html>` containing as many `<math ...>...</math>` tags, as there are teX formulas in HTML (4 for the bundled example)**; each produced element also carries its original source via an `<annotation encoding="application/x-tex">` tag (mirroring the TeX-mode assertion below)
- HTML output preserves a leading `<!DOCTYPE html>` and non-latin characters verbatim when present on stdin
- TeX processing from stdin produces one `<math ...>...</math>` tag whose source is embedded via an `<annotation encoding="application/x-tex">` carrying the original LaTeX (e.g. `e = m c ^ 2`)
- **Every macro in `config.json`'s `tex.macros`** — iterates over all keys, invokes each as inline `\(...\)` inside a minimal HTML page, and asserts output has exactly `<macros.length>` `<math …></math>` elements (one per macro), each carrying its own source annotation. This is the safety net that keeps custom macros wired end-to-end

## Code Formatting

All formatting is enforced and auto-fixed by ESLint (`npm run lint -- --fix`). Rules live in `.eslintrc.json` — do not hand-count tabs, spaces, or blank lines; let the linter fix them before committing. See `npm run lint -- --fix`.