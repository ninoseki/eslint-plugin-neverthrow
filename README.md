# @ninoseki/eslint-plugin-neverthrow

[eslint-plugin-neverthrow](https://github.com/mdbetancourt/eslint-plugin-neverthrow) but works with ESLint v9.

## Installation

```bash
npm install --save-dev @ninoseki/eslint-plugin-neverthrow @typescript-eslint/parser
```

## Requirements

- ESLint v9+
- `@typescript-eslint/parser`

## Usage

```ts
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import neverthrow from "@ninoseki/eslint-plugin-neverthrow";
import typescriptEslintParser from "@typescript-eslint/parser";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { neverthrow },
    rules: {
      "neverthrow/must-use-result": "error",
    },
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
);
```

## Rules

Same as https://github.com/mdbetancourt/eslint-plugin-neverthrow/tree/master?tab=readme-ov-file#rules.
