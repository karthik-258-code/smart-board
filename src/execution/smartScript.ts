import type { HistoryState } from '../domain/history'
import { dispatch, stateAt } from '../domain/history'
import type { ArrayObject, BoardObject } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import type { Result } from '../domain/result'

export type SmartScriptError = { code: 'unsupported_syntax' | 'missing_array' | 'ambiguous_mapping' | 'step_limit' | 'invalid_history'; message: string; line: number }
export type SmartScriptEvent = { line: number; variables: Record<string, number>; operation: BoardOperation }
export type SmartScriptRun = { history: HistoryState; events: SmartScriptEvent[]; arrayName: string; indexName: string }

const HARD_ITERATION_LIMIT = 1000
const HARD_SOURCE_LENGTH_LIMIT = 10_000
const HARD_BODY_STATEMENT_LIMIT = 100
const HARD_EVENT_LIMIT = 5_000

function fail(code: SmartScriptError['code'], message: string, line: number): Result<never, SmartScriptError> {
  return { ok: false, error: { code, message, line } }
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value)
}

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

  const body = lines.slice(loopLineIndex + 1, -1).map((line, index) => {
    const sourceLine = loopLineIndex + index + 2
    if (/^\s*(?:highlight\(\s*(?:([A-Za-z_$][\w$]*)|values\s*\[\s*([A-Za-z_$][\w$]*)\s*\])\s*\)|visit\(\s*values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]\s*\))\s*;\s*$/.test(line)) {
      const match = /^\s*(?:highlight\(\s*(?:([A-Za-z_$][\w$]*)|values\s*\[\s*([A-Za-z_$][\w$]*)\s*\])\s*\)|visit\(\s*values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]\s*\))\s*;\s*$/.exec(line)!
      if ((match[1] && match[1] !== indexName) || (match[2] && match[2] !== indexName) || (match[3] && match[3] !== indexName)) return { line: sourceLine, valid: false as const }
      return { line: sourceLine, valid: true as const, kind: 'visit' as const }
    }
    const assignment = /^\s*([A-Za-z_$][\w$]*)\s*\+=\s*(?:values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]|([A-Za-z_$][\w$]*))\s*;\s*$/.exec(line)
    if (assignment && Object.hasOwn(variables, assignment[1]) && (assignment[2] === indexName || assignment[3] === indexName)) {
      return { line: sourceLine, valid: true as const, kind: 'accumulate' as const, variable: assignment[1], valueSource: assignment[2] ? 'array' as const : 'index' as const }
    }
    return { line: sourceLine, valid: false as const }
  })
  const invalidBody = body.find((statement) => !statement.valid)
  if (body.length === 0 || invalidBody) {
    return fail('unsupported_syntax', `Use highlight(${indexName});, visit(values[${indexName}]);, or total += values[${indexName}]; inside the loop.`, invalidBody?.line ?? loopLineIndex + 2)
  }
  if (body.length > HARD_BODY_STATEMENT_LIMIT) return fail('step_limit', `A loop may contain at most ${HARD_BODY_STATEMENT_LIMIT} statements.`, 1)

  const current = stateAt(history, history.cursor)
  if (!current.ok) return fail('invalid_history', current.error.message, 1)
  const array = current.value.objects.find((object): object is ArrayObject => object.id === arrayObjectId && object.type === 'array')
  if (!array) return fail('missing_array', 'Select an array object before running this script.', 1)

  const matchingPointers = current.value.objects.filter((object): object is Extract<BoardObject, { type: 'pointer' }> =>
    object.type === 'pointer' && object.targetObjectId === array.id && object.name === indexName,
  )
  if (matchingPointers.length > 1) return fail('ambiguous_mapping', `More than one pointer named ${indexName} targets this array. Rename or remove the duplicate pointer.`, 1)
  const pointer = matchingPointers[0]
  variables[indexName] = initialIndex
  const iterationCount = Math.max(0, array.values.length - initialIndex)
  if (iterationCount > maxIterations) return fail('step_limit', `This loop needs ${iterationCount} iterations; the current limit is ${maxIterations}.`, 1)
  if (iterationCount * body.length * (pointer ? 2 : 1) > HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 1)

  let nextHistory = history
  const events: SmartScriptEvent[] = []
  for (let index = initialIndex; index < array.values.length; index += 1) {
    for (const statement of body) {
      variables[indexName] = index
      if (statement.kind === 'accumulate') {
        const value = statement.valueSource === 'array' ? array.values[index] : index
        if (typeof value !== 'number' || !Number.isFinite(value)) return fail('unsupported_syntax', 'Numeric accumulators require numeric array values.', statement.line)
        variables[statement.variable] += value
      }
      const snapshot = { ...variables }
      const highlight: BoardOperation = { type: 'array/set-highlight', objectId: array.id, indices: [index] }
      const changed = dispatch(nextHistory, highlight)
      if (!changed.ok) return fail('invalid_history', changed.error.message, statement.line)
      nextHistory = changed.value
      events.push({ line: statement.line, variables: snapshot, operation: highlight })

      if (pointer) {
        const move: BoardOperation = { type: 'pointer/move', objectId: pointer.id, index }
        const moved = dispatch(nextHistory, move)
        if (!moved.ok) return fail('invalid_history', moved.error.message, statement.line)
        nextHistory = moved.value
        events.push({ line: statement.line, variables: snapshot, operation: move })
      }
    }
  }

  return { ok: true, value: { history: nextHistory, events, arrayName, indexName } }
}
