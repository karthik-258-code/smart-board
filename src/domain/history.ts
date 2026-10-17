import type { BoardDocument } from './model'
import { validateBoard } from './objectRegistry'
import { applyOperation } from './operations'
import type { BoardOperation, OperationError } from './operations'
import type { Result } from './result'

export type HistoryEntry = { operation: BoardOperation; inverse: BoardOperation }
export type SavedExecutionEvent = { cursor: number; line: number; variables: Record<string, number> }
export type SavedExecutionTrace = { kind: 'smart-script'; source: string; arrayId: string; events: SavedExecutionEvent[] }
export type HistoryState = { initialDocument: BoardDocument; entries: HistoryEntry[]; cursor: number; execution?: SavedExecutionTrace }
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
  'container/set-current-index': ['objectId', 'index'], 'container/restore-state': ['objectId', 'values', 'currentIndex'],
  'linked-list/insert': ['objectId', 'afterId', 'nodeId', 'value'], 'linked-list/remove': ['objectId', 'nodeId'],
  'linked-list/reverse': ['objectId'], 'linked-list/restore-nodes': ['objectId', 'nodes'],
  'linked-list/set-current-node': ['objectId', 'nodeId'], 'linked-list/restore-state': ['objectId', 'nodes', 'currentNodeId'],
  'graph/add-node': ['objectId', 'node'], 'graph/remove-node': ['objectId', 'nodeId'],
  'graph/add-edge': ['objectId', 'edge'], 'graph/remove-edge': ['objectId', 'edgeId'],
  'graph/set-highlighted': ['objectId', 'nodeIds'], 'graph/restore-state': ['objectId', 'nodes', 'edges', 'highlightedNodeIds'],
  'tree/insert': ['objectId', 'node', 'parentId', 'side'], 'tree/remove-subtree': ['objectId', 'nodeId'],
  'tree/set-highlighted': ['objectId', 'nodeIds'], 'tree/restore-state': ['objectId', 'rootId', 'nodes', 'highlightedNodeIds'],
  'hash-table/set': ['objectId', 'key', 'value'], 'hash-table/remove': ['objectId', 'key'],
  'hash-table/restore-entries': ['objectId', 'entries'],
  'heap/push': ['objectId', 'value'], 'heap/extract-top': ['objectId'],
  'heap/set-kind': ['objectId', 'kind'], 'heap/restore': ['objectId', 'kind', 'values'],
  'trie/insert-word': ['objectId', 'word'], 'trie/remove-word': ['objectId', 'word'],
  'trie/restore-words': ['objectId', 'words'],
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

function validateExecution(value: unknown, entryCount: number, document: BoardDocument): Result<SavedExecutionTrace, HistoryError> {
  if (!isRecord(value) || !hasOnlyKeys(value, ['kind', 'source', 'arrayId', 'events']) || value.kind !== 'smart-script'
    || typeof value.source !== 'string' || value.source.length > 10_000 || typeof value.arrayId !== 'string' || !value.arrayId
    || !Array.isArray(value.events) || value.events.length > 5_000) return invalidHistory('Saved script execution metadata is malformed.')

  const target = document.objects.find((object) => object.id === value.arrayId && (object.type === 'array' || object.type === 'container' || object.type === 'linked-list'))
  if (!target) return invalidHistory('Saved script execution must map to an array, stack, queue, or linked list in the board.')
  if (/^\s*let\s+target\s*=/.test(value.source) && target.type !== 'array') return invalidHistory('Binary-search execution must map to an array.')
  const lines = value.source.replace(/\r\n?/g, '\n').split('\n').length
  let previousCursor = 0
  const events: SavedExecutionEvent[] = []
  for (const event of value.events) {
    if (!isRecord(event) || !hasOnlyKeys(event, ['cursor', 'line', 'variables'])
      || !Number.isInteger(event.cursor) || Number(event.cursor) <= previousCursor || Number(event.cursor) > entryCount
      || !Number.isInteger(event.line) || Number(event.line) < 1 || Number(event.line) > lines || !isRecord(event.variables)) {
      return invalidHistory('Saved script execution events do not match the source or timeline.')
    }
    const variables: Record<string, number> = {}
    for (const [name, variable] of Object.entries(event.variables)) {
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name) || typeof variable !== 'number' || !Number.isFinite(variable)) {
        return invalidHistory('Saved script variables must have valid names and finite numeric values.')
      }
      variables[name] = variable
    }
    previousCursor = Number(event.cursor)
    events.push({ cursor: previousCursor, line: Number(event.line), variables })
  }
  return { ok: true, value: { kind: 'smart-script', source: value.source, arrayId: value.arrayId, events } }
}

export function validateHistory(value: unknown): Result<HistoryState, HistoryError> {
  if (!isRecord(value) || !hasOnlyKeys(value, ['initialDocument', 'entries', 'cursor', 'execution'])) return invalidHistory('History contains an unknown field.')
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
  const execution = value.execution === undefined ? undefined : validateExecution(value.execution, entries.length, document)
  if (execution && !execution.ok) return execution
  return { ok: true, value: {
    initialDocument: initial.value,
    entries,
    cursor: Number(value.cursor),
    ...(execution?.ok ? { execution: execution.value } : {}),
  } }
}

export function dispatch(state: HistoryState, operation: BoardOperation): Result<HistoryState, OperationError> {
  const current = stateAt(state, state.cursor)
  if (!current.ok) return { ok: false, error: current.error }
  const applied = applyOperation(current.value, operation)
  if (!applied.ok) return applied
  const entries = state.entries.slice(0, state.cursor)
  entries.push({ operation, inverse: applied.value.inverse })
  return { ok: true, value: { initialDocument: state.initialDocument, entries, cursor: entries.length } }
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
