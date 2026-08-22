import {
  AST_NODE_TYPES,
  ESLintUtils,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils'
import { unionConstituents } from 'ts-api-utils'
import type { TypeChecker } from 'typescript'

import { createRule } from '../utils'

export enum MessageIds {
  MUST_USE = 'mustUseResult',
}

function matchAny(nodeTypes: AST_NODE_TYPES[]) {
  return `:matches(${nodeTypes.join(', ')})`
}
const resultSelector = matchAny([
  // AST_NODE_TYPES.Identifier,
  AST_NODE_TYPES.CallExpression,
  AST_NODE_TYPES.NewExpression,
  AST_NODE_TYPES.AwaitExpression,
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

  for (const ty of unionConstituents(checker.getApparentType(type))) {
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

function isSafeTryCallee(callee: TSESTree.Expression): boolean {
  if (callee.type === 'Identifier') {
    return callee.name === 'safeTry'
  }

  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name === 'safeTry'
  }

  return false
}

function isInsideSafeTryYield(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node
  let foundYieldDelegate = false

  while (current?.parent) {
    const parent: TSESTree.Node = current.parent

    if (parent.type === 'YieldExpression' && parent.argument === current) {
      if (!parent.delegate) {
        return false
      }
      foundYieldDelegate = true
    }

    if (
      foundYieldDelegate &&
      (parent.type === 'FunctionExpression' || parent.type === 'ArrowFunctionExpression')
    ) {
      const callExpression = parent.parent
      if (!callExpression || callExpression.type !== 'CallExpression') {
        return false
      }

      if (!callExpression.arguments.includes(parent)) {
        return false
      }

      return isSafeTryCallee(callExpression.callee)
    }

    if (parent.type === 'Program') {
      return false
    }

    current = parent
  }

  return false
}

function isHandledResult(node: TSESTree.Node): boolean {
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
  if (node.type === 'AwaitExpression') {
    return isHandledResult(node.argument)
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

function getEnclosingResultCall(
  checker: TypeChecker,
  parserServices: ParserServicesWithTypeInformation,
  node: TSESTree.Node,
): TSESTree.CallExpression | null {
  const array = node.parent
  if (array?.type !== 'ArrayExpression') return null
  if (!array.elements.includes(node as TSESTree.Expression)) return null
  const call = array.parent
  if (call?.type !== 'CallExpression' || !call.arguments.includes(array)) return null
  if (!isResultLike(checker, parserServices, call)) return null
  return call
}

const endTransverse: AST_NODE_TYPES[] = [AST_NODE_TYPES.BlockStatement, AST_NODE_TYPES.Program]

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

// a Result held in one of these can't be tracked to its use sites, so reporting
// it would be a false positive whenever it is handled elsewhere (e.g. `this.r`).
// These arrays are checked with `includes`, which -- unlike an `===` comparison
// against a literal -- gets no compile-time checking from a plain `string[]`.
// Spelling them with the enum is what makes a future AST rename fail the build,
// as `ClassProperty` silently did not after its typescript-eslint v5 rename.
const ignoreParents: AST_NODE_TYPES[] = [
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.MethodDefinition,
  AST_NODE_TYPES.PropertyDefinition,
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

  if (!isResultLike(checker, parserServices, node)) {
    return false
  }

  // skip CallExpression inside an AwaitExpression to avoid duplicate reports
  if (node.type === 'CallExpression' && node.parent?.type === 'AwaitExpression') {
    return false
  }

  if (isHandledResult(node)) {
    return false
  }

  if (isInsideSafeTryYield(node)) {
    return false
  }

  if (isCheckedResult(node)) {
    return false
  }

  if (isReturned(node)) {
    return false
  }

  // delegate to a wrapping Result-returning call (e.g. combine([...]))
  if (getEnclosingResultCall(checker, parserServices, node)) {
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

export const mustUseResult = createRule({
  name: 'must-use-result',
  meta: {
    docs: {
      description:
        'Not handling neverthrow result is a possible error because errors could remain unhandled.',
      recommended: true,
      requiresTypeChecking: true,
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
