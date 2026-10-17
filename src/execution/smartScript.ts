import type { HistoryState } from '../domain/history'
import { dispatch, stateAt } from '../domain/history'
import type { ArrayObject, BoardObject } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import type { Result } from '../domain/result'

export type SmartScriptError = { code: 'unsupported_syntax' | 'unsupported_input' | 'missing_array' | 'ambiguous_mapping' | 'step_limit' | 'invalid_history'; message: string; line: number }
export type SmartScriptEvent = { line: number; variables: Record<string, number>; operation: BoardOperation }
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

function fail(code: SmartScriptError['code'], message: string, line: number): Result<never, SmartScriptError> {
  return { ok: false, error: { code, message, line } }
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value)
}

type ScriptOperand = { kind: 'array-value' } | { kind: 'variable'; name: string } | { kind: 'number'; value: number }
type ScriptStatement =
  | { kind: 'visit'; line: number }
  | { kind: 'accumulate'; line: number; variable: string; operand: ScriptOperand }
  | { kind: 'conditional'; line: number; left: ScriptOperand; operator: '<' | '<=' | '>' | '>=' | '===' | '!=='; right: ScriptOperand; consequent: ScriptStatement[]; alternate: ScriptStatement[] }

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

  function parseOperand(sourceValue: string): ScriptOperand | undefined {
    const arrayIndex = /^values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]$/.exec(sourceValue)
    if (arrayIndex?.[1] === indexName) return { kind: 'array-value' }
    if (isSafeIdentifier(sourceValue) && (sourceValue === indexName || Object.hasOwn(variables, sourceValue))) return { kind: 'variable', name: sourceValue }
    if (/^-?\d+(?:\.\d+)?$/.test(sourceValue)) {
      const value = Number(sourceValue)
      if (Number.isFinite(value)) return { kind: 'number', value }
    }
    return undefined
  }

  const body: ScriptStatement[] = []
  let statementCount = 0
  const blocks: Array<{ statements: ScriptStatement[]; conditional?: Extract<ScriptStatement, { kind: 'conditional' }>; alternateOpen?: boolean }> = [{ statements: body }]
  for (let index = loopLineIndex + 1; index < lines.length - 1; index += 1) {
    const line = lines[index].trim()
    const sourceLine = index + 1
    const currentBlock = blocks.at(-1)!
    const condition = /^if\s*\(\s*(values\s*\[\s*[A-Za-z_$][\w$]*\s*\]|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?)\s*(===|!==|<=|>=|<|>)\s*(values\s*\[\s*[A-Za-z_$][\w$]*\s*\]|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?)\s*\)\s*\{$/.exec(line)
    if (condition) {
      const left = parseOperand(condition[1])
      const right = parseOperand(condition[3])
      if (!left || !right) return fail('unsupported_syntax', 'Conditions may compare values[i], a declared number, or a numeric literal.', sourceLine)
      const conditional: Extract<ScriptStatement, { kind: 'conditional' }> = {
        kind: 'conditional', line: sourceLine, left, operator: condition[2] as Extract<ScriptStatement, { kind: 'conditional' }>['operator'],
        right, consequent: [], alternate: [],
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
      if (!parseOperand(argument)) return fail('unsupported_syntax', `Use highlight(${indexName}); or visit(values[${indexName}]);.`, sourceLine)
      currentBlock.statements.push({ kind: 'visit', line: sourceLine })
      statementCount += 1
      continue
    }
    const assignment = /^([A-Za-z_$][\w$]*)\s*\+=\s*(values\s*\[\s*[A-Za-z_$][\w$]*\s*\]|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?)\s*;$/.exec(line)
    if (assignment && isSafeIdentifier(assignment[1]) && Object.hasOwn(variables, assignment[1])) {
      const operand = parseOperand(assignment[2])
      if (!operand) return fail('unsupported_syntax', 'Accumulators can add values[i], a declared number, the loop index, or a numeric literal.', sourceLine)
      currentBlock.statements.push({ kind: 'accumulate', line: sourceLine, variable: assignment[1], operand })
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
  const array = current.value.objects.find((object): object is ArrayObject => object.id === arrayObjectId && object.type === 'array')
  if (!array) return fail('missing_array', 'Select an array object before running this script.', 1)
  const selectedArray = array

  const matchingPointers = current.value.objects.filter((object): object is Extract<BoardObject, { type: 'pointer' }> =>
    object.type === 'pointer' && object.targetObjectId === selectedArray.id && object.name === indexName,
  )
  if (matchingPointers.length > 1) return fail('ambiguous_mapping', `More than one pointer named ${indexName} targets this array. Rename or remove the duplicate pointer.`, 1)
  const pointer = matchingPointers[0]
  variables[indexName] = initialIndex
  const iterationCount = Math.max(0, selectedArray.values.length - initialIndex)
  if (iterationCount > maxIterations) return fail('step_limit', `This loop needs ${iterationCount} iterations; the current limit is ${maxIterations}.`, 1)
  if (iterationCount * statementCount * (pointer ? 2 : 1) > HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 1)

  let nextHistory = history
  const events: SmartScriptEvent[] = []
  function applyStep(line: number, index: number): SmartScriptError | null {
    const snapshot = { ...variables }
    const operations: BoardOperation[] = [{ type: 'array/set-highlight', objectId: selectedArray.id, indices: [index] }]
    if (pointer) operations.push({ type: 'pointer/move', objectId: pointer.id, index })
    for (const operation of operations) {
      if (events.length >= HARD_EVENT_LIMIT) return { code: 'step_limit', message: `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, line }
      const changed = dispatch(nextHistory, operation)
      if (!changed.ok) return { code: 'invalid_history', message: changed.error.message, line }
      nextHistory = changed.value
      events.push({ line, variables: snapshot, operation })
    }
    return null
  }

  function readOperand(operand: ScriptOperand, index: number, line: number): { value: number } | { error: SmartScriptError } {
    const value = operand.kind === 'array-value' ? selectedArray.values[index]
      : operand.kind === 'variable' ? variables[operand.name]
        : operand.value
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { error: { code: 'unsupported_input', message: 'Conditional expressions and numeric accumulators require finite numeric values.', line } }
    }
    return { value }
  }

  function execute(statements: ScriptStatement[], index: number): SmartScriptError | null {
    for (const statement of statements) {
      variables[indexName] = index
      if (statement.kind === 'conditional') {
        const left = readOperand(statement.left, index, statement.line)
        if ('error' in left) return left.error
        const right = readOperand(statement.right, index, statement.line)
        if ('error' in right) return right.error
        const comparison = left.value - right.value
        const condition = statement.operator === '<' ? comparison < 0
          : statement.operator === '<=' ? comparison <= 0
            : statement.operator === '>' ? comparison > 0
              : statement.operator === '>=' ? comparison >= 0
                : statement.operator === '===' ? comparison === 0
                  : comparison !== 0
        const conditionStep = applyStep(statement.line, index)
        if (conditionStep) return conditionStep
        const branchError = execute(condition ? statement.consequent : statement.alternate, index)
        if (branchError) return branchError
        continue
      }

      if (statement.kind === 'accumulate') {
        const operand = readOperand(statement.operand, index, statement.line)
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

  for (let index = initialIndex; index < selectedArray.values.length; index += 1) {
    const error = execute(body, index)
    if (error) return { ok: false, error }
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
      events.push({ line, variables: { ...variables }, operation })
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

export function runSmartScript(source: string, history: HistoryState, arrayObjectId: string): Result<SmartScriptRun, SmartScriptError> {
  return /^\s*let\s+target\s*=/.test(source) ? runBinarySearch(source, history, arrayObjectId) : runArrayTraversal(source, history, arrayObjectId)
}
