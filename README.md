# @ninoseki/eslint-plugin-neverthrow

[eslint-plugin-neverthrow](https://github.com/mdbetancourt/eslint-plugin-neverthrow) but works with ESLint v10.

## Installation

```bash
npm install --save-dev @ninoseki/eslint-plugin-neverthrow typescript-eslint
```

## Requirements

- ESLint v10+
- `typescript-eslint`

## Usage

```ts
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import neverthrow from '@ninoseki/eslint-plugin-neverthrow'

export default defineConfig(
  ...tseslint.configs.recommended,
  {
    plugins: { neverthrow },
    rules: {
      'neverthrow/must-use-result': 'error',
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
)
```

## Rules

Same as https://github.com/mdbetancourt/eslint-plugin-neverthrow/tree/master?tab=readme-ov-file#rules.
