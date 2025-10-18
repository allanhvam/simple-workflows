import js from "@eslint/js";
import stylisticTs from "@stylistic/eslint-plugin";
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
            "@stylistic/ts": stylisticTs,
        },
        rules: {
            "@stylistic/ts/semi": ["error", "always"],
            "@typescript-eslint/consistent-type-imports": "error",
            "@stylistic/ts/comma-dangle": ["error", "always-multiline"],
            "@typescript-eslint/no-explicit-any": "off",
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