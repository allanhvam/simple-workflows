module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "standard-with-typescript",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "quotes": "off",
        "@typescript-eslint/quotes": ["error", "double"],
        "space-before-function-paren": "off",
        "@typescript-eslint/space-before-function-paren": "off",
        "@typescript-eslint/lines-between-class-members": "off",
        "semi": "off",
        "@typescript-eslint/semi": ["error", "always"],
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/strict-boolean-expressions": "off",
        "@typescript-eslint/no-confusing-void-expression": "off",
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/comma-dangle": ["error","always-multiline"],
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-extraneous-class": "off"
    }
}
