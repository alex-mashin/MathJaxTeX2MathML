export default [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
        },

        rules: {
            indent: ["error", "tab"],
            "space-infix-ops": "error",

            "keyword-spacing": [
                "error",
                {
                    before: true,
                    after: true,
                },
            ],

            "brace-style": [
                "error",
                "1tbs",
                {
                    allowSingleLine: false,
                },
            ],

            quotes: [
                "error",
                "single",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true,
                },
            ],

            "no-trailing-spaces": ["error", { skipBlankLines: false }],

            "no-multiple-empty-lines": ["error", { max: 1 }],

            "space-in-parens": ["error", "always"],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "always"],

            "no-restricted-syntax": [
                "error",
                {
                    selector: "Identifier[name=/^(?![Jj]SON$)[A-Z][A-Z0-9_]*$/]",
                    message: "Use lowercase/camelCase identifiers for constants, not SCREAMING_CAPS names.",
                },
            ],
        },
    },
    { ignores: ["**/.opencode/**", "**/node_modules/**", "**/eslint.config.mjs"] }
];
