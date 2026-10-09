import type { BoardDocument } from './model'
import { validateBoard } from './objectRegistry'
import { applyOperation } from './operations'
import type { BoardOperation, OperationError } from './operations'
import type { Result } from './result'

export type HistoryEntry = { operation: BoardOperation; inverse: BoardOperation }
export type HistoryState = { initialDocument: BoardDocument; entries: HistoryEntry[]; cursor: number }
export type HistoryError = { code: string; message: string }

const operationFields: Record<string, string[]> = {
  'object/add': ['object'], 'object/remove': ['objectId'], 'object/update-position': ['objectId', 'position'],
  'note/update-text': ['objectId', 'text'], 'array/set-value': ['objectId', 'index', 'value'],
  'array/set-highlight': ['objectId', 'indices'], 'array/insert-value': ['objectId', 'index', 'value'],
  'array/remove-value': ['objectId', 'index'], 'array/restore-state': ['objectId', 'values', 'highlightedIndices', 'references'],
  'array/swap-values': ['objectId', 'firstIndex', 'secondIndex'], 'array/compare-values': ['objectId', 'firstIndex', 'secondIndex', 'operator'],
  'pointer/move': ['objectId', 'index'], 'pointer/set-name': ['objectId', 'name'], 'range/set': ['objectId', 'start', 'endExclusive'],
  'table/set-cell': ['objectId', 'coordinate', 'value'], 'table/set-highlighted-cells': ['objectId', 'coordinates'],
  'table/add-dependency': ['objectId', 'dependency'], 'table/remove-dependency': ['objectId', 'dependency'],
  'checkpoint/update': ['objectId', 'prompt', 'answer', 'hint'], 'container/push': ['objectId', 'value'],
  'container/remove': ['objectId'], 'container/restore-values': ['objectId', 'values'],
  'linked-list/insert': ['objectId', 'afterId', 'nodeId', 'value'], 'linked-list/remove': ['objectId', 'nodeId'],
  'linked-list/reverse': ['objectId'], 'linked-list/restore-nodes': ['objectId', 'nodes'],
  'graph/add-node': ['objectId', 'node'], 'graph/remove-node': ['objectId', 'nodeId'],
  'graph/add-edge': ['objectId', 'edge'], 'graph/remove-edge': ['objectId', 'edgeId'],
  'graph/set-highlighted': ['objectId', 'nodeIds'], 'graph/restore-state': ['objectId', 'nodes', 'edges', 'highlightedNodeIds'],
  'tree/insert': ['objectId', 'node', 'parentId', 'side'], 'tree/remove-subtree': ['objectId', 'nodeId'],
  'tree/set-highlighted': ['objectId', 'nodeIds'], 'tree/restore-state': ['objectId', 'rootId', 'nodes', 'highlightedNodeIds'],
  'hash-table/set': ['objectId', 'key', 'value'], 'hash-table/remove': ['objectId', 'key'],
  'hash-table/restore-entries': ['objectId', 'entries'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  return JSON.stringify(value) ?? 'undefined'
}

function invalidHistory(message: string): Result<never, HistoryError> {
  return { ok: false, error: { code: 'invalid_history', message } }
}

export function validateHistory(value: unknown): Result<HistoryState, HistoryError> {
  if (!isRecord(value) || !hasOnlyKeys(value, ['initialDocument', 'entries', 'cursor'])) return invalidHistory('History must contain only an initial document, entries, and cursor.')
  const initial = validateBoard(value.initialDocument)
  if (!initial.ok) return invalidHistory(`Initial document is invalid: ${initial.error.message}`)
  if (!Array.isArray(value.entries) || !Number.isInteger(value.cursor) || Number(value.cursor) < 0 || Number(value.cursor) > value.entries.length) {
    return invalidHistory('History cursor is outside its entry list.')
  }

  let document = initial.value
  const entries: HistoryEntry[] = []
  for (let index = 0; index < value.entries.length; index += 1) {
    const entry = value.entries[index]
    if (!isRecord(entry) || !hasOnlyKeys(entry, ['operation', 'inverse']) || !isRecord(entry.operation) || !isRecord(entry.inverse)) {
      return invalidHistory(`History entry ${index} is malformed.`)
    }
    const operationType = entry.operation.type
    const inverseType = entry.inverse.type
    const operationAllowed = typeof operationType === 'string' && operationFields[operationType]
      && hasOnlyKeys(entry.operation, ['type', ...operationFields[operationType]])
    const inverseAllowed = typeof inverseType === 'string' && operationFields[inverseType]
      && hasOnlyKeys(entry.inverse, ['type', ...operationFields[inverseType]])
    if (!operationAllowed || !inverseAllowed) return invalidHistory(`History entry ${index} contains an unknown or malformed operation.`)
    try {
      const applied = applyOperation(document, entry.operation as unknown as BoardOperation)
      if (!applied.ok) return invalidHistory(`History entry ${index} cannot replay: ${applied.error.message}`)
      if (stableStringify(entry.inverse) !== stableStringify(applied.value.inverse)) return invalidHistory(`History entry ${index} has an incorrect inverse operation.`)
      document = applied.value.document
      entries.push({ operation: entry.operation as unknown as BoardOperation, inverse: applied.value.inverse })
    } catch {
      return invalidHistory(`History entry ${index} cannot be replayed.`)
    }
  }
  return { ok: true, value: { initialDocument: initial.value, entries, cursor: Number(value.cursor) } }
}

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
