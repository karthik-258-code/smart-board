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
  const loop = /^\s*for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*;\s*\1\s*<\s*([A-Za-z_$][\w$]*)\.length\s*;\s*\1\+\+\s*\)\s*\{\s*$/.exec(lines[0] ?? '')
  if (!loop) return fail('unsupported_syntax', 'Expected: for (let i = 0; i < values.length; i++) {', 1)

  const indexName = loop[1]
  const initialIndex = Number(loop[2])
  if (!Number.isSafeInteger(initialIndex)) return fail('step_limit', 'The loop start index must be a safe integer.', 1)
  const arrayName = loop[3]
  if (arrayName !== 'values') return fail('unsupported_syntax', 'The only supported array variable is values.', 1)
  if (lines.at(-1)?.trim() !== '}') return fail('unsupported_syntax', 'The loop must end with a closing brace on its own line.', lines.length)
  if (lines.slice(1, -1).some((line) => line.trim() === '' || /^\s*\/\//.test(line))) {
    return fail('unsupported_syntax', 'Blank lines and comments are not supported inside this first Smart Script subset.', 2)
  }

  const body = lines.slice(1, -1).map((line, index) => {
    const match = /^\s*(?:highlight\(\s*(?:([A-Za-z_$][\w$]*)|values\s*\[\s*([A-Za-z_$][\w$]*)\s*\])\s*\)|visit\(\s*values\s*\[\s*([A-Za-z_$][\w$]*)\s*\]\s*\))\s*;\s*$/.exec(line)
    if (!match || (match[1] && match[1] !== indexName) || (match[2] && match[2] !== indexName) || (match[3] && match[3] !== indexName)) {
      return { line: index + 2, valid: false }
    }
    return { line: index + 2, valid: true }
  })
  const invalidBody = body.find((statement) => !statement.valid)
  if (body.length === 0 || invalidBody) {
    return fail('unsupported_syntax', `Use highlight(${indexName});, highlight(values[${indexName}]);, or visit(values[${indexName}]); inside the loop.`, invalidBody?.line ?? 2)
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
  const iterationCount = Math.max(0, array.values.length - initialIndex)
  if (iterationCount > maxIterations) return fail('step_limit', `This loop needs ${iterationCount} iterations; the current limit is ${maxIterations}.`, 1)
  if (iterationCount * body.length * (pointer ? 2 : 1) > HARD_EVENT_LIMIT) return fail('step_limit', `This script would create more than ${HARD_EVENT_LIMIT} timeline events.`, 1)

  let nextHistory = history
  const events: SmartScriptEvent[] = []
  for (let index = initialIndex; index < array.values.length; index += 1) {
    for (const statement of body) {
      const variables = { [indexName]: index }
      const highlight: BoardOperation = { type: 'array/set-highlight', objectId: array.id, indices: [index] }
      const changed = dispatch(nextHistory, highlight)
      if (!changed.ok) return fail('invalid_history', changed.error.message, statement.line)
      nextHistory = changed.value
      events.push({ line: statement.line, variables, operation: highlight })

      if (pointer) {
        const move: BoardOperation = { type: 'pointer/move', objectId: pointer.id, index }
        const moved = dispatch(nextHistory, move)
        if (!moved.ok) return fail('invalid_history', moved.error.message, statement.line)
        nextHistory = moved.value
        events.push({ line: statement.line, variables, operation: move })
      }
    }
  }

  return { ok: true, value: { history: nextHistory, events, arrayName, indexName } }
}
