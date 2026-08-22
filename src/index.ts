import { readFileSync } from 'node:fs'

import type { ESLint } from 'eslint'

import { mustUseResult } from './rules/must-use-result'

const { name, version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string }

export const rules = {
  'must-use-result': mustUseResult,
}

const plugin: ESLint.Plugin = {
  meta: { name, version },
  // cast from TypeScript Rule Module to ESLint RuleDefinition. otherwise TS can't verify the type directly.
  rules: rules as unknown as ESLint.Plugin['rules'],
}

export default plugin
