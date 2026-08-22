import { readFileSync } from 'node:fs'

import type { TSESLint } from '@typescript-eslint/utils'
import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint'

import { mustUseResult } from './rules/must-use-result'

const { name, version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string }

export const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  'must-use-result': mustUseResult,
}

const plugin: FlatConfig.Plugin = {
  meta: { name, version },
  rules,
}

export default plugin
