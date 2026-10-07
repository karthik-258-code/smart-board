import type { BoardDocument } from './model'
import { applyOperation } from './operations'
import type { BoardOperation, OperationError } from './operations'
import type { Result } from './result'

export type HistoryEntry = { operation: BoardOperation; inverse: BoardOperation }
export type HistoryState = { initialDocument: BoardDocument; entries: HistoryEntry[]; cursor: number }
export type HistoryError = { code: string; message: string }

export function dispatch(state: HistoryState, operation: BoardOperation): Result<HistoryState, OperationError> {
  const current = stateAt(state, state.cursor)
  if (!current.ok) return { ok: false, error: current.error }
  const applied = applyOperation(current.value, operation)
  if (!applied.ok) return applied
  const entries = state.entries.slice(0, state.cursor)
  entries.push({ operation, inverse: applied.value.inverse })
  return { ok: true, value: { ...state, entries, cursor: entries.length } }
}
export function undo(state: HistoryState): HistoryState {
  return state.cursor <= 0 ? state : { ...state, cursor: state.cursor - 1 }
}
export function redo(state: HistoryState): HistoryState {
  return state.cursor >= state.entries.length ? state : { ...state, cursor: state.cursor + 1 }
}
export function stateAt(state: HistoryState, cursor: number): Result<BoardDocument, HistoryError> {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > state.entries.length) {
    return { ok: false, error: { code: 'invalid_cursor', message: `Cursor must be between 0 and ${state.entries.length}.` } }
  }
  let document = state.initialDocument
  for (let index = 0; index < cursor; index += 1) {
    const result = applyOperation(document, state.entries[index].operation)
    if (!result.ok) {
      return { ok: false, error: { code: 'replay_failed', message: `Could not replay operation ${index}: ${result.error.message}` } }
    }
    document = result.value.document
  }
  return { ok: true, value: document }
}
