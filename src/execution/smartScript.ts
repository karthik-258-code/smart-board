import type { HistoryState } from '../domain/history'
import { dispatch, stateAt } from '../domain/history'
import type { ArrayObject, BinaryTreeObject, BoardObject, ContainerObject, GraphObject, HeapObject, LinkedListObject } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import type { Result } from '../domain/result'

export type SmartScriptError = { code: 'unsupported_syntax' | 'unsupported_input' | 'missing_array' | 'ambiguous_mapping' | 'step_limit' | 'invalid_history'; message: string; line: number }
export type SmartScriptEvent = { line: number; variables: Record<string, number>; inspection?: { index: number; value: string | number }; operation: BoardOperation }
export type SmartScriptRun = { history: HistoryState; events: SmartScriptEvent[]; arrayName: string; indexName: string }

const HARD_ITERATION_LIMIT = 1000
const HARD_SOURCE_LENGTH_LIMIT = 10_000
const HARD_BODY_STATEMENT_LIMIT = 100
const HARD_EVENT_LIMIT = 5_000

export const binarySearchTemplate = [
  'let target = 11;',
  'let low = 0;',
  'let high = values.length - 1;',
  'while (low <= high) {',
  '  let mid = Math.floor((low + high) / 2);',
  '  highlight(mid);',
  '  if (values[mid] === target) {',
  '    found = mid;',
  '    break;',
  '  } else if (values[mid] < target) {',
  '    low = mid + 1;',
  '  } else {',
  '    high = mid - 1;',
  '  }',
  '}',
].join('\n')

export const heapExtractionTemplate = [
  'while (heap.values.length > 0) {',
  '  extractTop();',
  '}',
].join('\n')

export const breadthFirstSearchTemplate = [
  'let start = "A";',
  'let queue = [start];',
  'let visited = [start];',
  'while (queue.length > 0) {',
  '  let current = queue.shift();',
  '  highlight(current);',
  '  for (let neighbor of graph.neighbors(current)) {',
  '    if (!visited.includes(neighbor)) {',
  '      visited.push(neighbor);',
  '      queue.push(neighbor);',
  '    }',
  '  }',
  '}',
].join('\n')

export const depthFirstSearchTemplate = [
  'let start = "A";',
  'let stack = [start];',
  'let visited = [];',
  'while (stack.length > 0) {',
  '  let current = stack.pop();',
  '  if (!visited.includes(current)) {',
  '    visited.push(current);',
  '    highlight(current);',
  '    for (let neighbor of graph.neighbors(current)) {',
  '      if (!visited.includes(neighbor)) {',
  '        stack.push(neighbor);',
  '      }',
  '    }',
  '  }',
  '}',
].join('\n')

export const preorderTraversalTemplate = [
  'function preorder(node) {',
  '  if (node === null) return;',
  '  highlight(node);',
  '  preorder(node.left);',
  '  preorder(node.right);',
  '}',
  'preorder(tree.root);',
].join('\n')

export const inorderTraversalTemplate = [
  'function inorder(node) {',
  '  if (node === null) return;',
  '  inorder(node.left);',
  '  highlight(node);',
  '  inorder(node.right);',
  '}',
  'inorder(tree.root);',
].join('\n')

export const postorderTraversalTemplate = [
  'function postorder(node) {',
  '  if (node === null) return;',
  '  postorder(node.left);',
  '  postorder(node.right);',
  '  highlight(node);',
  '}',
  'postorder(tree.root);',
].join('\n')

export const levelOrderTraversalTemplate = [
  'function levelOrder(node) {',
  '  if (node === null) return;',
  '  let queue = [node];',
  '  while (queue.length > 0) {',
  '    let current = queue.shift();',
  '    highlight(current);',
  '    if (current.left !== null) queue.push(current.left);',
  '    if (current.right !== null) queue.push(current.right);',
  '  }',
  '}',
  'levelOrder(tree.root);',
].join('\n')

function fail(code: SmartScriptError['code'], message: string, line: number): Result<never, SmartScriptError> {
  return { ok: false, error: { code, message, line } }
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value)
}

type ScriptExpression =
  | { kind: 'array-value' }
  | { kind: 'variable'; name: string }
  | { kind: 'number'; value: number }
  | { kind: 'binary'; operator: '+' | '-' | '*' | '/' | '%'; left: ScriptExpression; right: ScriptExpression }
type ScriptCondition =
  | { kind: 'comparison'; left: ScriptExpression; operator: '<' | '<=' | '>' | '>=' | '===' | '!=='; right: ScriptExpression }
  | { kind: 'logical'; operator: '&&' | '||'; left: ScriptCondition; right: ScriptCondition }
type ScriptStatement =
  | { kind: 'visit'; line: number; indexExpression: ScriptExpression; pointerName?: string }
  | { kind: 'loop-control'; line: number; control: 'break' | 'continue' }
  | { kind: 'accumulate'; line: number; variable: string; expression: ScriptExpression }
  | { kind: 'conditional'; line: number; condition: ScriptCondition; consequent: ScriptStatement[]; alternate: ScriptStatement[] }

/** Executes a deliberately small, non-evaluating Smart Script subset. */
export function runArrayTraversal(
  source: string,
  history: HistoryState,
  arrayObjectId: string,
  options: { maxIterations?: number } = {},
): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Script source is limited to ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const maxIterations = options.maxIterations ?? HARD_ITERATION_LIMIT
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > HARD_ITERATION_LIMIT) {
    return fail('step_limit', `Iteration limit must be between 1 and ${HARD_ITERATION_LIMIT}.`, 1)
  }

  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const loopPattern = /^\s*for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*;\s*\1\s*<\s*([A-Za-z_$][\w$]*)\.length\s*;\s*\1\+\+\s*\)\s*\{\s*$/
  const loopLineIndex = lines.findIndex((line) => loopPattern.test(line))
  if (loopLineIndex < 0) return fail('unsupported_syntax', 'Expected: for (let i = 0; i < values.length; i++) {', 1)
  const loop = loopPattern.exec(lines[loopLineIndex])!

  const indexName = loop[1]
  if (!isSafeIdentifier(indexName)) return fail('unsupported_syntax', 'This variable name is reserved by the script runtime.', loopLineIndex + 1)
  const initialIndex = Number(loop[2])
  if (!Number.isSafeInteger(initialIndex)) return fail('step_limit', 'The loop start index must be a safe integer.', 1)
  const arrayName = loop[3]
  if (arrayName !== 'values') return fail('unsupported_syntax', 'The only supported array variable is values.', 1)
  if (lines.at(-1)?.trim() !== '}') return fail('unsupported_syntax', 'The loop must end with a closing brace on its own line.', lines.length)
  const variables: Record<string, number> = {}
  for (let lineIndex = 0; lineIndex < loopLineIndex; lineIndex += 1) {
    const declaration = /^\s*let\s+([A-Za-z_$][\w$]*)\s*=\s*(-?\d+)\s*;\s*$/.exec(lines[lineIndex])
    if (!declaration || !isSafeIdentifier(declaration[1]) || declaration[1] === indexName || declaration[1] === 'values' || Object.hasOwn(variables, declaration[1])) {
      return fail('unsupported_syntax', 'Before the loop, only unique integer declarations such as let total = 0; are supported.', lineIndex + 1)
    }
    const initialValue = Number(declaration[2])
    if (!Number.isSafeInteger(initialValue)) return fail('unsupported_syntax', 'Declared variable values must be safe integers.', lineIndex + 1)
    variables[declaration[1]] = initialValue
  }

  function parseExpression(sourceValue: string): ScriptExpression | undefined {
    sourceValue = sourceValue.trim()
    const tokens: string[] = []
    const tokenPattern = /\s*(values\s*\[\s*[A-Za-z_$][\w$]*\s*\]|(?:\d+(?:\.\d*)?|\.\d+)|[A-Za-z_$][\w$]*|[()+\-*/%])/gy
    let cursor = 0
    while (cursor < sourceValue.length) {
      tokenPattern.lastIndex = cursor
      const match = tokenPattern.exec(sourceValue)
      if (!match) return undefined
      tokens.push(match[1])
      cursor = tokenPattern.lastIndex
      if (tokens.length > 256) return undefined
    }
    if (tokens.length === 0) return undefined

    let tokenIndex = 0
    let nesting = 0
    const precedence = (operator: string) => operator === '+' || operator === '-' ? 1 : operator === '*' || operator === '/' || operator === '%' ? 2 : 0
    function parsePrimary(): ScriptExpression | undefined {
      const token = tokens[tokenIndex++]
      if (!token) return undefined
      if (token === '+' || token === '-') {
        const right = parsePrimary()
        if (!right) return undefined
        return token === '+' ? right : { kind: 'binary', operator: '-', left: { kind: 'number', value: 0 }, right }
      }
      if (token === '(') {
        nesting += 1
        if (nesting > 32) return undefined
        const expression = parseBinary(1)
        nesting -= 1
        if (tokens[tokenIndex++] !== ')') return undefined
        return expression
      }
      const arrayIndex = /^values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]$/.exec(token)
      if (arrayIndex?.[1] === indexName) return { kind: 'array-value' }
      if (isSafeIdentifier(token) && (token === indexName || Object.hasOwn(variables, token))) return { kind: 'variable', name: token }
      if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
        const value = Number(token)
        if (Number.isFinite(value)) return { kind: 'number', value }
      }
      return undefined
    }
    function parseBinary(minPrecedence: number): ScriptExpression | undefined {
      let left = parsePrimary()
      if (!left) return undefined
      while (true) {
        const operator = tokens[tokenIndex]
        const operatorPrecedence = operator ? precedence(operator) : 0
        if (!operator || operatorPrecedence < minPrecedence) break
        tokenIndex += 1
        const right = parseBinary(operatorPrecedence + 1)
        if (!right) return undefined
        left = { kind: 'binary', operator: operator as '+' | '-' | '*' | '/' | '%', left, right }
      }
      return left
    }
    const expression = parseBinary(1)
    return expression && tokenIndex === tokens.length ? expression : undefined
  }

  let conditionDepth = 0
  function parseCondition(sourceValue: string): ScriptCondition | undefined {
    sourceValue = sourceValue.trim()
    conditionDepth += 1
    if (conditionDepth > 32) { conditionDepth -= 1; return undefined }
    try {
      let depth = 0
      let enclosesAll = sourceValue.startsWith('(') && sourceValue.endsWith(')')
      for (let cursor = 0; cursor < sourceValue.length; cursor += 1) {
        if (sourceValue[cursor] === '(') depth += 1
        else if (sourceValue[cursor] === ')') depth -= 1
        if (depth === 0 && cursor < sourceValue.length - 1) enclosesAll = false
        if (depth < 0) return undefined
      }
      if (depth !== 0) return undefined
      if (enclosesAll) return parseCondition(sourceValue.slice(1, -1))

      function findTopLevel(operators: string[]): { index: number; operator: string } | undefined {
        let nested = 0
        for (let cursor = 0; cursor < sourceValue.length; cursor += 1) {
          if (sourceValue[cursor] === '(') nested += 1
          else if (sourceValue[cursor] === ')') nested -= 1
          else if (nested === 0) {
            const operator = operators.find((candidate) => sourceValue.startsWith(candidate, cursor))
            if (operator) return { index: cursor, operator }
          }
        }
        return undefined
      }

      const logical = findTopLevel(['||']) ?? findTopLevel(['&&'])
      if (logical) {
        const left = parseCondition(sourceValue.slice(0, logical.index))
        const right = parseCondition(sourceValue.slice(logical.index + logical.operator.length))
        if (left && right) return { kind: 'logical', operator: logical.operator as '&&' | '||', left, right }
        return undefined
      }
      const comparison = findTopLevel(['===', '!==', '<=', '>=', '<', '>'])
      if (!comparison) return undefined
      const left = parseExpression(sourceValue.slice(0, comparison.index))
      const right = parseExpression(sourceValue.slice(comparison.index + comparison.operator.length))
      return left && right
        ? { kind: 'comparison', left, operator: comparison.operator as '<' | '<=' | '>' | '>=' | '===' | '!==', right }
        : undefined
    } finally {
      conditionDepth -= 1
    }
  }

  const body: ScriptStatement[] = []
  let statementCount = 0
  const blocks: Array<{ statements: ScriptStatement[]; conditional?: Extract<ScriptStatement, { kind: 'conditional' }>; alternateOpen?: boolean }> = [{ statements: body }]
  for (let index = loopLineIndex + 1; index < lines.length - 1; index += 1) {
    const line = lines[index].trim()
    const sourceLine = index + 1
    const currentBlock = blocks.at(-1)!
    const condition = /^if\s*\((.*)\)\s*\{$/.exec(line)
    if (condition) {
      const parsedCondition = parseCondition(condition[1])
      if (!parsedCondition) return fail('unsupported_syntax', 'Conditions may compare numeric expressions with <, <=, >, >=, ===, or !== and combine them with && or ||.', sourceLine)
      const conditional: Extract<ScriptStatement, { kind: 'conditional' }> = {
        kind: 'conditional', line: sourceLine, condition: parsedCondition, consequent: [], alternate: [],
      }
      currentBlock.statements.push(conditional)
      blocks.push({ statements: conditional.consequent, conditional, alternateOpen: false })
      statementCount += 1
      continue
    }
    if (/^}\s*else\s*{$/.test(line)) {
      const frame = blocks.at(-1)
      if (!frame?.conditional || frame.alternateOpen) return fail('unsupported_syntax', 'An else block must follow one if block.', sourceLine)
      frame.statements = frame.conditional.alternate
      frame.alternateOpen = true
      continue
    }
    if (line === '}') {
      if (blocks.length === 1) return fail('unsupported_syntax', 'Unexpected closing brace inside the loop.', sourceLine)
      blocks.pop()
      continue
    }
    if (!line || line.startsWith('//')) return fail('unsupported_syntax', 'Blank lines and comments are not supported inside Smart Script blocks.', sourceLine)

    const visit = /^\s*(?:highlight\(\s*([A-Za-z_$][\w$]*|values\s*\[\s*[A-Za-z_$][\w$]*\s*\])\s*\)|visit\(\s*(values\s*\[\s*[A-Za-z_$][\w$]*\s*\])\s*\))\s*;\s*$/.exec(line)
    if (visit) {
      const argument = visit[1] ?? visit[2]
      const indexExpression = parseExpression(argument)
      if (!indexExpression) return fail('unsupported_syntax', `Use highlight(${indexName});, highlight(a declared numeric variable);, or visit(values[${indexName}]);.`, sourceLine)
      currentBlock.statements.push({
        kind: 'visit', line: sourceLine, indexExpression,
        pointerName: visit[1] && visit[1] !== indexName && Object.hasOwn(variables, visit[1]) ? visit[1] : undefined,
      })
      statementCount += 1
      continue
    }
    if (line === 'break;' || line === 'continue;') {
      currentBlock.statements.push({ kind: 'loop-control', line: sourceLine, control: line.slice(0, -1) as 'break' | 'continue' })
      statementCount += 1
      continue
    }
    const assignment = /^([A-Za-z_$][\w$]*)\s*\+=\s*(.*?)\s*;$/.exec(line)
    if (assignment && isSafeIdentifier(assignment[1]) && Object.hasOwn(variables, assignment[1])) {
      const expression = parseExpression(assignment[2])
      if (!expression) return fail('unsupported_syntax', 'Accumulators may use values[i], declared numbers, numeric literals, and +, -, *, /, %, with parentheses.', sourceLine)
      currentBlock.statements.push({ kind: 'accumulate', line: sourceLine, variable: assignment[1], expression })
      statementCount += 1
      continue
    }
    return fail('unsupported_syntax', `Use if/else blocks, highlight(${indexName});, visit(values[${indexName}]);, or a declared numeric accumulator.`, sourceLine)
  }
  if (blocks.length !== 1) return fail('unsupported_syntax', 'Every if block must be closed before the loop ends.', lines.length - 1)
  if (statementCount === 0) return fail('unsupported_syntax', 'The loop body must contain a supported statement.', loopLineIndex + 2)
  if (statementCount > HARD_BODY_STATEMENT_LIMIT) return fail('step_limit', `A loop may contain at most ${HARD_BODY_STATEMENT_LIMIT} statements.`, 1)

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const currentDocument = current.value
  const target = currentDocument.objects.find((object): object is ArrayObject | ContainerObject | LinkedListObject =>
    object.id === arrayObjectId && (object.type === 'array' || object.type === 'container' || object.type === 'linked-list'),
  )
  if (!target) return fail('missing_array', 'Select an array, stack, queue, or linked list before running this script.', 1)
  const selectedTarget = target
  const values = selectedTarget.type === 'linked-list' ? selectedTarget.nodes.map((node) => node.value) : selectedTarget.values

  const matchingPointers = selectedTarget.type === 'array' ? currentDocument.objects.filter((object): object is Extract<BoardObject, { type: 'pointer' }> =>
    object.type === 'pointer' && object.targetObjectId === selectedTarget.id && object.name === indexName,
  ) : []
  if (matchingPointers.length > 1) return fail('ambiguous_mapping', `More than one pointer named ${indexName} targets this array. Rename or remove the duplicate pointer.`, 1)
  const pointer = matchingPointers[0]
  variables[indexName] = initialIndex
  let nextHistory = history
  const events: SmartScriptEvent[] = []
  function applyStep(line: number, index: number, mappedPointerName?: string): SmartScriptError | null {
    const snapshot = { ...variables }
    const pointers = mappedPointerName
      ? currentDocument.objects.filter((object): object is Extract<BoardObject, { type: 'pointer' }> =>
        object.type === 'pointer' && object.targetObjectId === selectedTarget.id && object.name === mappedPointerName,
      )
      : pointer ? [pointer] : []
    if (pointers.length > 1) return { code: 'ambiguous_mapping', message: `More than one pointer named ${mappedPointerName ?? indexName} targets this array. Rename or remove the duplicate pointer.`, line }
    const operations: BoardOperation[] = [selectedTarget.type === 'array'
      ? { type: 'array/set-highlight', objectId: selectedTarget.id, indices: [index] }
      : selectedTarget.type === 'container'
        ? { type: 'container/set-current-index', objectId: selectedTarget.id, index }
        : { type: 'linked-list/set-current-node', objectId: selectedTarget.id, nodeId: selectedTarget.nodes[index].id }]
    if (pointers[0]) operations.push({ type: 'pointer/move', objectId: pointers[0].id, index })
    for (const operation of operations) {
      if (events.length >= HARD_EVENT_LIMIT) return { code: 'step_limit', message: `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, line }
      const changed = dispatch(nextHistory, operation)
      if (!changed.ok) return { code: 'invalid_history', message: changed.error.message, line }
      nextHistory = changed.value
      events.push({ line, variables: snapshot, inspection: { index, value: values[index] }, operation })
    }
    return null
  }

  function evaluateExpression(expression: ScriptExpression, index: number, line: number): { value: number } | { error: SmartScriptError } {
    if (expression.kind === 'binary') {
      const left = evaluateExpression(expression.left, index, line)
      if ('error' in left) return left
      const right = evaluateExpression(expression.right, index, line)
      if ('error' in right) return right
      if ((expression.operator === '/' || expression.operator === '%') && right.value === 0) {
        return { error: { code: 'unsupported_input', message: 'Arithmetic expressions cannot divide or take a remainder by zero.', line } }
      }
      const value = expression.operator === '+' ? left.value + right.value
        : expression.operator === '-' ? left.value - right.value
          : expression.operator === '*' ? left.value * right.value
            : expression.operator === '/' ? left.value / right.value
              : left.value % right.value
      return Number.isFinite(value)
        ? { value }
        : { error: { code: 'unsupported_input', message: 'Arithmetic expressions must stay finite.', line } }
    }
    const value = expression.kind === 'array-value' ? values[index]
      : expression.kind === 'variable' ? variables[expression.name]
        : expression.value
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { error: { code: 'unsupported_input', message: 'Conditional expressions and numeric accumulators require finite numeric values.', line } }
    }
    return { value }
  }

  function evaluateCondition(condition: ScriptCondition, index: number, line: number): { value: boolean } | { error: SmartScriptError } {
    if (condition.kind === 'logical') {
      const left = evaluateCondition(condition.left, index, line)
      if ('error' in left) return left
      if (condition.operator === '&&' && !left.value) return { value: false }
      if (condition.operator === '||' && left.value) return { value: true }
      return evaluateCondition(condition.right, index, line)
    }
    const left = evaluateExpression(condition.left, index, line)
    if ('error' in left) return left
    const right = evaluateExpression(condition.right, index, line)
    if ('error' in right) return right
    const value = condition.operator === '<' ? left.value < right.value
      : condition.operator === '<=' ? left.value <= right.value
        : condition.operator === '>' ? left.value > right.value
          : condition.operator === '>=' ? left.value >= right.value
            : condition.operator === '===' ? left.value === right.value
              : left.value !== right.value
    return { value }
  }

  function execute(statements: ScriptStatement[], index: number): SmartScriptError | 'break' | 'continue' | null {
    for (const statement of statements) {
      variables[indexName] = index
      if (statement.kind === 'conditional') {
        const condition = evaluateCondition(statement.condition, index, statement.line)
        if ('error' in condition) return condition.error
        const conditionStep = applyStep(statement.line, index)
        if (conditionStep) return conditionStep
        const branchError = execute(condition.value ? statement.consequent : statement.alternate, index)
        if (branchError) return branchError
        continue
      }

      if (statement.kind === 'loop-control') {
        const stepError = applyStep(statement.line, index)
        if (stepError) return stepError
        return statement.control
      }

      if (statement.kind === 'visit') {
        const evaluatedIndex = statement.indexExpression.kind === 'array-value'
          ? { value: index }
          : evaluateExpression(statement.indexExpression, index, statement.line)
        if ('error' in evaluatedIndex) return evaluatedIndex.error
        if (!Number.isSafeInteger(evaluatedIndex.value) || evaluatedIndex.value < 0 || evaluatedIndex.value >= values.length) {
          return { code: 'unsupported_input', message: 'The highlighted index must be an integer inside the selected structure.', line: statement.line }
        }
        const stepError = applyStep(statement.line, evaluatedIndex.value, statement.pointerName)
        if (stepError) return stepError
        continue
      }

      if (statement.kind === 'accumulate') {
        const operand = evaluateExpression(statement.expression, index, statement.line)
        if ('error' in operand) return operand.error
        const nextValue = variables[statement.variable] + operand.value
        if (!Number.isFinite(nextValue)) return { code: 'unsupported_input', message: 'Accumulator result must stay finite.', line: statement.line }
        variables[statement.variable] = nextValue
      }
      const stepError = applyStep(statement.line, index)
      if (stepError) return stepError
    }
    return null
  }

  let iterationCount = 0
  for (let index = initialIndex; index < values.length; index += 1) {
    iterationCount += 1
    if (iterationCount > maxIterations) return fail('step_limit', `This loop needs more than ${maxIterations} iterations; the current limit is ${maxIterations}.`, 1)
    const outcome = execute(body, index)
    if (outcome === 'break') break
    if (outcome === 'continue') continue
    if (outcome) return { ok: false, error: outcome }
  }

  return { ok: true, value: { history: nextHistory, events, arrayName, indexName } }
}

/** Interprets one canonical binary-search control-flow shape over numeric sorted arrays. */
export function runBinarySearch(
  source: string,
  history: HistoryState,
  arrayObjectId: string,
  options: { maxIterations?: number } = {},
): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Script source is limited to ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const maxIterations = options.maxIterations ?? HARD_ITERATION_LIMIT
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > HARD_ITERATION_LIMIT) {
    return fail('step_limit', `Iteration limit must be between 1 and ${HARD_ITERATION_LIMIT}.`, 1)
  }
  const lines = source.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const targetMatch = /^let target = (-?\d+(?:\.\d+)?);$/.exec(lines[0] ?? '')
  const expected = [
    null, 'let low = 0;', 'let high = values.length - 1;', 'while (low <= high) {',
    'let mid = Math.floor((low + high) / 2);', 'highlight(mid);', 'if (values[mid] === target) {',
    'found = mid;', 'break;', '} else if (values[mid] < target) {', 'low = mid + 1;', '} else {',
    'high = mid - 1;', '}', '}',
  ]
  if (!targetMatch || lines.length !== expected.length || lines.some((line, index) => expected[index] !== null && line !== expected[index])) {
    return fail('unsupported_syntax', 'Use the Binary Search template and change only the numeric target value.', 1)
  }
  const target = Number(targetMatch[1])
  if (!Number.isFinite(target)) return fail('unsupported_input', 'The target must be a finite number.', 1)

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const array = current.value.objects.find((object): object is ArrayObject => object.id === arrayObjectId && object.type === 'array')
  if (!array) return fail('missing_array', 'Select an array object before running this script.', 1)
  const selectedArray = array
  if (!selectedArray.values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return fail('unsupported_input', 'Binary search requires an array containing only finite numbers.', 1)
  }
  for (let index = 1; index < selectedArray.values.length; index += 1) {
    if (Number(selectedArray.values[index - 1]) > Number(selectedArray.values[index])) {
      return fail('unsupported_input', 'Binary search requires values sorted in ascending order.', 1)
    }
  }

  const midPointers = current.value.objects.filter((object): object is Extract<BoardObject, { type: 'pointer' }> =>
    object.type === 'pointer' && object.targetObjectId === selectedArray.id && object.name === 'mid',
  )
  const searchRanges = current.value.objects.filter((object): object is Extract<BoardObject, { type: 'range' }> =>
    object.type === 'range' && object.targetObjectId === selectedArray.id && object.name === 'search',
  )
  if (midPointers.length > 1) return fail('ambiguous_mapping', 'More than one pointer named mid targets this array.', 5)
  if (searchRanges.length > 1) return fail('ambiguous_mapping', 'More than one range named search targets this array.', 4)

  let nextHistory = history
  const events: SmartScriptEvent[] = []
  const variables: Record<string, number> = { target, low: 0, high: array.values.length - 1 }
  let iterations = 0
  let finished = false

  function applyStep(line: number, indices: number[], moveMid = false, updateRange = false): SmartScriptError | null {
    const operations: BoardOperation[] = [{ type: 'array/set-highlight', objectId: selectedArray.id, indices }]
    if (moveMid && midPointers[0]) operations.push({ type: 'pointer/move', objectId: midPointers[0].id, index: variables.mid })
    if (updateRange && searchRanges[0]) {
      const start = Math.min(Math.max(0, variables.low), selectedArray.values.length)
      const endExclusive = Math.max(start, Math.min(variables.high + 1, selectedArray.values.length))
      operations.push({ type: 'range/set', objectId: searchRanges[0].id, start, endExclusive })
    }
    for (const operation of operations) {
      if (events.length >= HARD_EVENT_LIMIT) return { code: 'step_limit', message: `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, line }
      const changed = dispatch(nextHistory, operation)
      if (!changed.ok) return { code: 'invalid_history', message: changed.error.message, line }
      nextHistory = changed.value
      events.push({ line, variables: { ...variables }, inspection: indices.length ? { index: indices.at(-1)!, value: selectedArray.values[indices.at(-1)!] } : undefined, operation })
    }
    return null
  }

  while (!finished) {
    if (variables.low > variables.high) {
      const error = applyStep(4, [], false, true)
      if (error) return { ok: false, error }
      break
    }
    if (iterations >= maxIterations) return fail('step_limit', `The search needs more than ${maxIterations} iterations.`, 4)
    iterations += 1
    {
      const error = applyStep(4, [], false, true)
      if (error) return { ok: false, error }
    }
    variables.mid = Math.floor((variables.low + variables.high) / 2)
    variables.value = Number(selectedArray.values[variables.mid])
    {
      const error = applyStep(5, [variables.mid], true)
      if (error) return { ok: false, error }
    }
    {
      const error = applyStep(6, [variables.mid], true)
      if (error) return { ok: false, error }
    }
    variables.comparison = variables.value - target
    const comparison = variables.comparison
    {
      const error = applyStep(7, [variables.mid])
      if (error) return { ok: false, error }
    }
    if (comparison === 0) {
      variables.found = variables.mid
      for (const line of [8, 9]) {
        const error = applyStep(line, [variables.mid])
        if (error) return { ok: false, error }
      }
      finished = true
    } else if (comparison < 0) {
      {
        const error = applyStep(10, [variables.mid])
        if (error) return { ok: false, error }
      }
      variables.low = variables.mid + 1
      {
        const error = applyStep(11, [variables.mid], false, true)
        if (error) return { ok: false, error }
      }
    } else {
      {
        const error = applyStep(10, [variables.mid])
        if (error) return { ok: false, error }
      }
      {
        const error = applyStep(12, [variables.mid])
        if (error) return { ok: false, error }
      }
      variables.high = variables.mid - 1
      {
        const error = applyStep(13, [variables.mid], false, true)
        if (error) return { ok: false, error }
      }
    }
  }

  return { ok: true, value: { history: nextHistory, events, arrayName: 'values', indexName: 'mid' } }
}

export function runGraphBreadthFirstSearch(source: string, history: HistoryState, graphObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Source cannot exceed ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const lines = source.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const startMatch = /^let start = ("(?:[^"\\]|\\.)*");$/.exec(lines[0] ?? '')
  if (!startMatch) return fail('unsupported_syntax', 'Use the Breadth-first Search template and change only the quoted start label.', 1)
  let startLabel: unknown
  try {
    startLabel = JSON.parse(startMatch[1])
  } catch {
    return fail('unsupported_syntax', 'The start label must be a valid quoted string.', 1)
  }
  if (typeof startLabel !== 'string') return fail('unsupported_input', 'The start label must be a string.', 1)
  const expectedLines = breadthFirstSearchTemplate.replace('let start = "A";', () => `let start = ${JSON.stringify(startLabel)};`).replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const mismatch = expectedLines.findIndex((line, index) => line !== lines[index])
  if (mismatch !== -1 || lines.length !== expectedLines.length) {
    return fail('unsupported_syntax', 'Use the Breadth-first Search template without changing its algorithm.', Math.max(1, mismatch + 1))
  }

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const graph = current.value.objects.find((object): object is GraphObject => object.id === graphObjectId && object.type === 'graph')
  if (!graph) return fail('missing_array', 'Select a graph object before running this script.', 1)
  const starts = graph.nodes.filter((node) => node.label === startLabel)
  if (starts.length === 0) return fail('unsupported_input', `No graph node has the start label ${JSON.stringify(startLabel)}.`, 1)
  if (starts.length > 1) return fail('ambiguous_mapping', `More than one graph node has the start label ${JSON.stringify(startLabel)}.`, 1)

  const adjacency = new Map(graph.nodes.map((node) => [node.id, [] as string[]]))
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to)
    adjacency.get(edge.to)?.push(edge.from)
  }
  const queue = [starts[0].id]
  const discovered = new Set(queue)
  const visited: string[] = []
  let nextHistory = history
  const events: SmartScriptEvent[] = []
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) break
    visited.push(currentId)
    const currentNode = graph.nodes.find((node) => node.id === currentId)
    if (!currentNode) return fail('invalid_history', 'The graph changed while the script was running.', 5)
    const index = graph.nodes.findIndex((node) => node.id === currentId)
    const operation: BoardOperation = { type: 'graph/set-highlighted', objectId: graph.id, nodeIds: [...visited] }
    if (events.length >= HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 6)
    const changed = dispatch(nextHistory, operation)
    if (!changed.ok) return fail('invalid_history', changed.error.message, 6)
    nextHistory = changed.value
    events.push({
      line: 6,
      variables: { visitedCount: visited.length, queueLength: queue.length },
      inspection: { index, value: currentNode.label },
      operation,
    })
    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (discovered.has(neighborId)) continue
      discovered.add(neighborId)
      queue.push(neighborId)
    }
  }

  return { ok: true, value: { history: nextHistory, events, arrayName: 'graph', indexName: 'current' } }
}

export function runGraphDepthFirstSearch(source: string, history: HistoryState, graphObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Source cannot exceed ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const lines = source.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const startMatch = /^let start = ("(?:[^"\\]|\\.)*");$/.exec(lines[0] ?? '')
  if (!startMatch) return fail('unsupported_syntax', 'Use the Depth-first Search template and change only the quoted start label.', 1)
  let startLabel: unknown
  try {
    startLabel = JSON.parse(startMatch[1])
  } catch {
    return fail('unsupported_syntax', 'The start label must be a valid quoted string.', 1)
  }
  if (typeof startLabel !== 'string') return fail('unsupported_input', 'The start label must be a string.', 1)
  const expectedLines = depthFirstSearchTemplate.replace('let start = "A";', () => `let start = ${JSON.stringify(startLabel)};`).replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const mismatch = expectedLines.findIndex((line, index) => line !== lines[index])
  if (mismatch !== -1 || lines.length !== expectedLines.length) {
    const mismatchLine = mismatch >= 0 ? mismatch + 1 : lines.length > expectedLines.length ? expectedLines.length + 1 : 1
    return fail('unsupported_syntax', 'Use the Depth-first Search template without changing its algorithm.', mismatchLine)
  }

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const graph = current.value.objects.find((object): object is GraphObject => object.id === graphObjectId && object.type === 'graph')
  if (!graph) return fail('missing_array', 'Select a graph object before running this script.', 1)
  const starts = graph.nodes.filter((node) => node.label === startLabel)
  if (starts.length === 0) return fail('unsupported_input', `No graph node has the start label ${JSON.stringify(startLabel)}.`, 1)
  if (starts.length > 1) return fail('ambiguous_mapping', `More than one graph node has the start label ${JSON.stringify(startLabel)}.`, 1)

  const adjacency = new Map(graph.nodes.map((node) => [node.id, [] as string[]]))
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to)
    adjacency.get(edge.to)?.push(edge.from)
  }
  const stack = [starts[0].id]
  const visited = new Set<string>()
  const visitedIds: string[] = []
  let nextHistory = history
  const events: SmartScriptEvent[] = []
  while (stack.length > 0) {
    const currentId = stack.pop()
    if (!currentId || visited.has(currentId)) continue
    visited.add(currentId)
    visitedIds.push(currentId)
    const currentNode = graph.nodes.find((node) => node.id === currentId)
    if (!currentNode) return fail('invalid_history', 'The graph changed while the script was running.', 5)
    if (events.length >= HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 8)
    const operation: BoardOperation = { type: 'graph/set-highlighted', objectId: graph.id, nodeIds: [...visitedIds] }
    const changed = dispatch(nextHistory, operation)
    if (!changed.ok) return fail('invalid_history', changed.error.message, 8)
    nextHistory = changed.value
    events.push({
      line: 8,
      variables: { visitedCount: visitedIds.length, stackLength: stack.length },
      inspection: { index: graph.nodes.findIndex((node) => node.id === currentId), value: currentNode.label },
      operation,
    })
    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (!visited.has(neighborId)) stack.push(neighborId)
    }
  }
  return { ok: true, value: { history: nextHistory, events, arrayName: 'graph', indexName: 'current' } }
}

export function runTreeTraversal(source: string, history: HistoryState, treeObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Source cannot exceed ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const templates = [
    { source: preorderTraversalTemplate, order: 'preorder' as const, visitLine: 3 },
    { source: inorderTraversalTemplate, order: 'inorder' as const, visitLine: 4 },
    { source: postorderTraversalTemplate, order: 'postorder' as const, visitLine: 5 },
    { source: levelOrderTraversalTemplate, order: 'level-order' as const, visitLine: 6 },
  ]
  const normalizeTemplate = (value: string) => value.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim()).join('\n')
  const normalized = normalizeTemplate(source)
  const sourceLines = normalized.split('\n')
  const selected = templates.find((template) => normalizeTemplate(template.source) === normalized)
  if (!selected) {
    const candidate = templates.find((template) => normalizeTemplate(template.source).split('\n')[0] === sourceLines[0])
    const expectedLines = candidate ? normalizeTemplate(candidate.source).split('\n') : []
    const mismatch = expectedLines.findIndex((line, index) => line !== sourceLines[index])
    const mismatchLine = mismatch >= 0 ? mismatch + 1 : sourceLines.length > expectedLines.length ? expectedLines.length + 1 : 1
    return fail('unsupported_syntax', 'Use an unchanged preorder, inorder, postorder, or level-order template.', mismatchLine)
  }
  const traversal = selected

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const tree = current.value.objects.find((object): object is BinaryTreeObject => object.id === treeObjectId && object.type === 'binary-tree')
  if (!tree) return fail('missing_array', 'Select a binary tree before running this script.', 1)
  const targetTree = tree

  const nodesById = new Map(targetTree.nodes.map((node) => [node.id, node]))
  const visited: string[] = []
  let nextHistory = history
  const events: SmartScriptEvent[] = []
  function visit(nodeId: string | null): SmartScriptError | null {
    if (!nodeId) return null
    const node = nodesById.get(nodeId)
    if (!node) return { code: 'invalid_history', message: 'The tree changed while the script was running.', line: traversal.visitLine }
    if (traversal.order === 'preorder') {
      const error = record(nodeId)
      if (error) return error
    }
    const left = visit(node.leftId)
    if (left) return left
    if (traversal.order === 'inorder') {
      const error = record(nodeId)
      if (error) return error
    }
    const right = visit(node.rightId)
    if (right) return right
    if (traversal.order === 'postorder') {
      const error = record(nodeId)
      if (error) return error
    }
    return null
  }
  function record(nodeId: string, extraVariables: Record<string, number> = {}): SmartScriptError | null {
    const node = nodesById.get(nodeId)
    if (!node) return { code: 'invalid_history', message: 'The tree changed while the script was running.', line: traversal.visitLine }
    if (events.length >= HARD_EVENT_LIMIT) return { code: 'step_limit', message: `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, line: traversal.visitLine }
    visited.push(nodeId)
    const operation: BoardOperation = { type: 'tree/set-highlighted', objectId: targetTree.id, nodeIds: [...visited] }
    const changed = dispatch(nextHistory, operation)
    if (!changed.ok) return { code: 'invalid_history', message: changed.error.message, line: traversal.visitLine }
    nextHistory = changed.value
    events.push({
      line: traversal.visitLine,
      variables: { visitedCount: visited.length, ...extraVariables },
      inspection: { index: targetTree.nodes.findIndex((candidate) => candidate.id === nodeId), value: node.value },
      operation,
    })
    return null
  }
  let traversalError: SmartScriptError | null = null
  if (traversal.order === 'level-order') {
    const queue = targetTree.rootId ? [targetTree.rootId] : []
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      const node = nodesById.get(nodeId)
      if (!node) return fail('invalid_history', 'The tree changed while the script was running.', traversal.visitLine)
      traversalError = record(nodeId, { queueLength: queue.length })
      if (traversalError) break
      if (node.leftId) queue.push(node.leftId)
      if (node.rightId) queue.push(node.rightId)
    }
  } else {
    traversalError = visit(targetTree.rootId)
  }
  if (traversalError) return { ok: false, error: traversalError }
  return { ok: true, value: { history: nextHistory, events, arrayName: 'tree', indexName: 'node' } }
}

export function runHeapExtraction(source: string, history: HistoryState, heapObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  if (source.length > HARD_SOURCE_LENGTH_LIMIT) return fail('step_limit', `Source cannot exceed ${HARD_SOURCE_LENGTH_LIMIT} characters.`, 1)
  const expectedLines = heapExtractionTemplate.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const sourceLines = source.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const mismatch = expectedLines.findIndex((line, index) => line !== sourceLines[index])
  if (mismatch !== -1 || sourceLines.length !== expectedLines.length) {
    const mismatchLine = mismatch >= 0 ? mismatch + 1 : sourceLines.length > expectedLines.length ? expectedLines.length + 1 : 1
    return fail('unsupported_syntax', 'Use the unchanged heap extraction template.', mismatchLine)
  }
  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const heap = current.value.objects.find((object): object is HeapObject => object.id === heapObjectId && object.type === 'heap')
  if (!heap) return fail('missing_array', 'Select a min or max heap before running this script.', 1)

  let nextHistory = history
  const events: SmartScriptEvent[] = []
  while (true) {
    const state = stateAt(nextHistory, nextHistory.cursor)
    if (!state.ok) return fail('invalid_history', state.error.message, 1)
    const currentHeap = state.value.objects.find((object): object is HeapObject => object.id === heapObjectId && object.type === 'heap')
    if (!currentHeap) return fail('invalid_history', 'The heap changed while the script was running.', 2)
    if (currentHeap.values.length === 0) break
    if (events.length >= HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 2)
    const extractedValue = currentHeap.values[0]
    const operation: BoardOperation = { type: 'heap/extract-top', objectId: currentHeap.id }
    const changed = dispatch(nextHistory, operation)
    if (!changed.ok) return fail('invalid_history', changed.error.message, 2)
    nextHistory = changed.value
    events.push({
      line: 2,
      variables: { extractedValue, heapSize: currentHeap.values.length - 1 },
      inspection: { index: 0, value: extractedValue },
      operation,
    })
  }
  return { ok: true, value: { history: nextHistory, events, arrayName: 'heap', indexName: 'top' } }
}

export function runSmartScript(source: string, history: HistoryState, arrayObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  if (/^\s*while\s*\(\s*heap\.values\.length/.test(source)) return runHeapExtraction(source, history, arrayObjectId)
  if (/^\s*let\s+target\s*=/.test(source)) return runBinarySearch(source, history, arrayObjectId)
  if (/^\s*let\s+start\s*=\s*["']/.test(source)) return /^\s*let\s+stack\s*=/m.test(source)
    ? runGraphDepthFirstSearch(source, history, arrayObjectId)
    : runGraphBreadthFirstSearch(source, history, arrayObjectId)
  if (/^\s*function\s+(preorder|inorder|postorder|levelOrder)\s*\(/.test(source)) return runTreeTraversal(source, history, arrayObjectId)
  return runArrayTraversal(source, history, arrayObjectId)
}
