import type { ESLint } from 'eslint'

import { mustUseResult } from './rules/must-use-result'

export const rules = { 'must-use-result': mustUseResult }

export default { rules } as unknown as ESLint.Plugin
