import pluginVitest from '@vitest/eslint-plugin'
import { globalIgnores } from 'eslint/config'
import { defineConfig } from 'eslint/config'
import skipFormatting from 'eslint-config-prettier/flat'
import pluginEslintPlugin from 'eslint-plugin-eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import * as regexpPlugin from 'eslint-plugin-regexp'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

const mode = process.env.NODE_ENV === 'production' ? 'error' : 'warn'

export default defineConfig(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/coverage/**', '**/docs/**', 'tests/fixtures/neverthrow.d.ts']),

  tseslint.configs.recommended,

  pluginEslintPlugin.configs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['tests/**/*.{test,spec}.ts'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,

  regexpPlugin.configs['flat/recommended'],

  {
    plugins: { 'simple-import-sort': simpleImportSort },

    rules: {
      'simple-import-sort/imports': mode,
      'simple-import-sort/exports': mode,
      'no-console': mode,
      'no-debugger': mode,
    },
  },
)
