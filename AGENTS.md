# AGENTS.md

## Workflow

Apply changes one at a time, each followed by `npm test`. When tests pass:
1. Remove throwaway probe/debug artifacts (e.g. `_*.cjs`, `_dbg.js`) — use them only to investigate; never leave them in the tree at task end. Then re-run `npm run lint && npm test` so the tracked tree stays clean.
2. Lint (`npm run lint`).
3. Commit the working tree after *every* successful change, so any step is revertable without losing prior work.

Order matters: **lint -> test**. Tests run via Jest; there's no typecheck or separate formatter — ESLint owns formatting (see below).

## Commands

- Test: `npm test`  ·  Lint: `npm run lint`
- Show version/help before MathJax init: `node tex2mml.cjs -v` / `-h`
- Convert TeX/MathML from stdin, locale via `-l`: `node tex2mml.cjs -l ru < input.tex`, `< input.html`
- Read the document from a file instead of stdin (for clients that cap how much they can pipe on stdin — e.g. MediaWiki), via `-f <path>`; combine with `-l`. Default input is still **stdin** when no `-f` is given.

## What to edit — config files, not the script

Conversion behavior is **data-driven**. Custom macros (`\AA`, `\C`, …) and enabled TeX packages (`ams`, `empheq`, `physics`, `mhchem`, …), delimiters (`$…$`, `\(...\)`, `\[…\]`), `maxBuffer`, and the HTML tags/classes skipped while scanning stdin all live in config — **edit those, don't hard-code options into `tex2mml.cjs`.**

- Top-level runtime config: `config.json` (loaded via `require('./config.json')`).
- Locale overrides/macros: `locales/<lang>.json`, loaded via `require('./locales/' + locale + '.json')`; unknown/missing locales fall back to `ru.json` (`tex2mml.cjs:228`). **Default locale is now `ru`** (`tex2mml.cjs:195`) — the `-l en` path still exists but isn't default.

Locale macros are redefinitions of names already in `config.json`, so macro counts stay stable across locales (that's why tests pass for either default).

## Input modes (auto-detected by regex in `inputType`, tex2mml.cjs:73)

The document is read from **stdin** by default, or from a file with `-f <path>` when the client caps how much it can pipe on stdin (e.g. MediaWiki). The content type is then auto-detected and handled as one of these modes:

- **TeX** — a standalone equation → one `<math …></math>` with the source embedded in `<annotation encoding="application/x-tex">`.
- **HTML tags** (`<tag>…</tag>` blocks) → same tag structure, each formula as `<math>`.
- **HTML** (optional `<!doctype>` + `<html>…</html>`) → full page with every formula replaced by `<math>`, doctype/non-latin preserved verbatim.

In HTML/tags modes a leading `<script>window.MathJax = {…}</script>` block in the document — whether read from stdin or via `-f <path>` — is parsed and its object merged over `config.json` (`@js-util/config-object-merge`); `options.menuOptions` is stripped from any such override before merging (tex2mml.cjs:133).

## Test suite — safety nets you must not break

Tests live at `test/tex2mml.test.js`. They assert end-to-end, so every macro stays wired. Two non-obvious traps when adding macros:

- **Argument-taking custom macros in `config.json` MUST be listed in the `takeArgument` set** (`test/tex2mml.test.js:135`). The config-macro test invokes each as `\name` (no args) unless its name is there; a required-but-unlisted arg → MathJax emits `<merror>` and the "0 errors" assertion fails.
- **Locale macros are invoked with NO argument** (`test/tex2mml.test.js:94`). Keep them abbreviation-style / arg-free, or their conversion test fails.

Both suites iterate over all macro keys in `config.json`'s and each locale's `tex.macros`, so newly added names are covered automatically — you only need to update the sets above for macros that take arguments. Malformed input (e.g. `\left(`) is expected to produce exactly one `<merror>` per equation, not a crash.

## Formatting / lint rules

ESLint enforces and auto-fixes formatting (`npm run lint -- --fix`): **tab indentation**, single quotes with `avoidEscape`, braces/parens/spacing around `{}`, no trailing spaces, max 1 blank line, lowercase/camelCase constants (no SCREAMING_CAPS). Don't hand-count whitespace — let the linter fix it before committing. Config: `eslint.config.mjs`. Excludes `.opencode/` and `node_modules/`.

## Architecture / deploy notes (lower priority)

- Entry point is the bundled CommonJS script `tex2mml.cjs`; runtime deps are `@mathjax/src` + `@js-util/config-object-merge`; build via webpack/terser.
- A key non-obvious detail in `tex2mml.cjs`: mhchem's output-side renderer registration (`rendererExtensions`/`extraLoads`) is stripped so CHTML isn't an active jax — this tool serializes raw MathML and would otherwise crash reading rendered DOM nodes (tex2mml.cjs:40).
- Containerisation: `Dockerfile` + `docker-compose.yml` run the bundled `.cjs` as a busybox httpd CGI server on port 80 returning `text/mathml`, wired into MediaWiki via the MathJax/External Data extensions.
