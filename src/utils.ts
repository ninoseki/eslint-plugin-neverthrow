import { ESLintUtils } from '@typescript-eslint/utils'

export interface NeverthrowRuleDocs {
  description: string
  recommended?: boolean
  requiresTypeChecking?: boolean
}

export const createRule = ESLintUtils.RuleCreator<NeverthrowRuleDocs>(
  (name) => `https://github.com/ninoseki/eslint-plugin-neverthrow/blob/main/docs/rules/${name}.md`,
)
