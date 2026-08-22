# @ninoseki/eslint-plugin-neverthrow

[![npm version](https://badge.fury.io/js/@ninoseki%2Feslint-plugin-neverthrow.svg)](https://badge.fury.io/js/@ninoseki%2Feslint-plugin-neverthrow)

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

export default defineConfig(...tseslint.configs.recommended, {
  plugins: { neverthrow },
  rules: {
    'neverthrow/must-use-result': 'error',
  },
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
    },
  },
})
```

## Rules

### Possible Errors

| Rule ID                                                       | Description                                                                               |     |
| :------------------------------------------------------------ | :---------------------------------------------------------------------------------------- | :-: |
| [neverthrow/must-use-result](./docs/rules/must-use-result.md) | Not handling neverthrow result is a possible error because errors could remain unhandled. | ⭐️  |
