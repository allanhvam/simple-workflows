import js from "@eslint/js";
import { importX } from "eslint-plugin-import-x";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import { configs } from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...configs.recommended,
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
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
            "@typescript-eslint/no-import-type-side-effects": "error",
            "import-x/extensions": ["error", "always", { ignorePackages: true, pattern: { ts: "always", js: "never" } }],
        },
    },
    {
        ignores: ["lib/**"],
    },
];

export default config;