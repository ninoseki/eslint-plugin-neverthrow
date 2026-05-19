import { TSESTree } from '@typescript-eslint/types'
import type { TSESLint } from '@typescript-eslint/utils'
import { ESLintUtils, type ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { unionTypeParts } from 'tsutils'
import { TypeChecker } from 'typescript'

export enum MessageIds {
  MUST_USE = 'mustUseResult',
}

function matchAny(nodeTypes: string[]) {
  return `:matches(${nodeTypes.join(', ')})`
}
const resultSelector = matchAny([
  // 'Identifier',
  'CallExpression',
  'NewExpression',
  'AwaitExpression',
])

const resultProperties = ['mapErr', 'map', 'andThen', 'orElse', 'match', 'unwrapOr']

const handledMethods = ['match', 'unwrapOr', '_unsafeUnwrap']

const checkedMethods = ['isOk', 'isErr']

function isResultLike(
  checker: TypeChecker,
  parserServices: ParserServicesWithTypeInformation,
  node?: TSESTree.Node | null,
): boolean {
  if (!node) return false
  const tsNodeMap = parserServices.esTreeNodeToTSNodeMap.get(node)
  const type = checker.getTypeAtLocation(tsNodeMap)

  for (const ty of unionTypeParts(checker.getApparentType(type))) {
    if (resultProperties.map((p) => ty.getProperty(p)).every((p) => p !== undefined)) {
      return true
    }
  }
  return false
}

function findMemberName(node?: TSESTree.MemberExpression): string | null {
  if (!node) return null
  if (node.property.type !== 'Identifier') return null

  return node.property.name
}

function isMemberCalledFn(node?: TSESTree.MemberExpression): boolean {
  if (node?.parent?.type !== 'CallExpression') return false
  return node.parent.callee === node
}

function isHandledResult(node: TSESTree.Node): boolean {
  if (node.type === 'AwaitExpression') {
    return isHandledResult(node.argument)
  }

  const memberExpression = node.parent
  if (memberExpression?.type === 'MemberExpression') {
    const methodName = findMemberName(memberExpression)
    const methodIsCalled = isMemberCalledFn(memberExpression)
    if (methodName && handledMethods.includes(methodName) && methodIsCalled) {
      return true
    }
    const parent = node.parent?.parent // search for chain method .map().handler
    if (parent && parent?.type !== 'ExpressionStatement') {
      return isHandledResult(parent)
    }
  }
  return false
}

function isCheckedResult(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier' && node.parent?.type === 'MemberExpression') {
    const propertyName =
      node.parent.property.type === 'Identifier' ? node.parent.property.name : null
    const parentIsCalledExpression = node.parent.parent?.type === 'CallExpression'
    return !!propertyName && checkedMethods.includes(propertyName) && parentIsCalledExpression
  }
  return false
}

const endTransverse = ['BlockStatement', 'Program']

function getAssignation(
  checker: TypeChecker,
  parserServices: ParserServicesWithTypeInformation,
  node: TSESTree.Node,
): TSESTree.Identifier | undefined {
  if (
    node.type === 'VariableDeclarator' &&
    isResultLike(checker, parserServices, node.init) &&
    node.id.type === 'Identifier'
  ) {
    return node.id
  }
  if (endTransverse.includes(node.type) || !node.parent) {
    return undefined
  }
  return getAssignation(checker, parserServices, node.parent)
}

function isReturned(node: TSESTree.Node): boolean {
  if (node.type === 'ArrowFunctionExpression') {
    return true
  }
  if (node.type === 'ReturnStatement') {
    return true
  }
  if (node.type === 'BlockStatement') {
    return false
  }
  if (node.type === 'Program') {
    return false
  }
  if (node.type === 'AwaitExpression') {
    if (!node.parent) {
      return false
    }
    return isReturned(node.parent)
  }
  if (!node.parent) {
    return false
  }
  return isReturned(node.parent)
}

const ignoreParents = [
  'ClassDeclaration',
  'FunctionDeclaration',
  'MethodDefinition',
  'ClassProperty',
]

function handleAssignation(
  context: TSESLint.RuleContext<MessageIds, []>,
  checker: TypeChecker,
  parserServices: ParserServicesWithTypeInformation,
  node: TSESTree.Node,
  reportAs: TSESTree.Node = node,
): boolean {
  const assignedTo = getAssignation(checker, parserServices, node)
  const currentScope = context.sourceCode.getScope(node)

  if (assignedTo) {
    const variable = currentScope.set.get(assignedTo.name)
    const references = variable?.references.filter((ref) => ref.identifier !== assignedTo) ?? []

    reportAs = variable?.references[0]?.identifier ?? reportAs

    return references.some(
      (ref) => !processSelector(context, checker, parserServices, ref.identifier, reportAs, true),
    )
  }

  return false
}

function processSelector(
  context: TSESLint.RuleContext<MessageIds, []>,
  checker: TypeChecker,
  parserServices: ParserServicesWithTypeInformation,
  node: TSESTree.Node,
  reportAs = node,
  isReferenceNode = false,
): boolean {
  if (node.parent?.type.startsWith('TS')) {
    return false
  }
  if (node.parent && ignoreParents.includes(node.parent.type)) {
    return false
  }

  if (node.type === 'AwaitExpression') {
    if (!isResultLike(checker, parserServices, node.argument)) {
      return false
    }
  } else {
    if (!isResultLike(checker, parserServices, node)) {
      return false
    }
  }

  // skip CallExpression inside an AwaitExpression to avoid duplicate reports
  if (node.type === 'CallExpression' && node.parent?.type === 'AwaitExpression') {
    return false
  }

  if (isHandledResult(node)) {
    return false
  }

  if (isCheckedResult(node)) {
    return false
  }

  if (isReturned(node)) {
    return false
  }

  const anyHandled = handleAssignation(context, checker, parserServices, node, reportAs)
  if (anyHandled) {
    return false
  }

  if (!isReferenceNode) {
    context.report({
      node: reportAs,
      messageId: MessageIds.MUST_USE,
    })
  }
  return true
}

export const mustUseResult = ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    docs: {
      description:
        'Not handling neverthrow result is a possible error because errors could remain unhandleds.',
    },
    messages: {
      mustUseResult: 'Result must be handled with either of match, unwrapOr or _unsafeUnwrap.',
    },
    schema: [],
    type: 'problem',
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()
    return {
      [resultSelector](node: TSESTree.Node) {
        return processSelector(context, checker, services, node)
      },
    }
  },
})
