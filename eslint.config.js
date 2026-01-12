import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/semi": ["error", "always"],
            "@typescript-eslint/consistent-type-imports": "error",
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@typescript-eslint/no-explicit-any": "off",
            "quotes": ["error", "double", {
                avoidEscape: true,
                allowTemplateLiterals: true,
            }],
            "@stylistic/member-delimiter-style": "error",
        },
    },
    {
        plugins: {
            onlyWarn,
        },
    },
    {
        ignores: ["lib/**"],
    },
];

export default config;