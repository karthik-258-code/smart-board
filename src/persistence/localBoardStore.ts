import type { BoardDocument, BoardError } from '../domain/model'
import { validateBoard } from '../domain/objectRegistry'
import type { Result } from '../domain/result'
import { validateHistory, type HistoryState } from '../domain/history'

export type StorageError = BoardError

function error(code: string, message: string): Result<never, StorageError> {
  return { ok: false, error: { code, message } }
}

export function saveBoard(storage: Storage, key: string, document: BoardDocument): Result<void, StorageError> {
  const validation = validateBoard(document)
  if (!validation.ok) return { ok: false, error: validation.error }
  let serialized: string
  try {
    serialized = JSON.stringify(validation.value)
  } catch {
    return error('serialization_failed', 'The board could not be converted to JSON.')
  }
  try {
    storage.setItem(key, serialized)
    return { ok: true, value: undefined }
  } catch {
    return error('storage_unavailable', 'Browser storage is unavailable or full.')
  }
}

export function loadBoard(storage: Storage, key: string): Result<BoardDocument | null, StorageError> {
  let serialized: string | null
  try {
    serialized = storage.getItem(key)
  } catch {
    return error('storage_unavailable', 'Browser storage could not be read.')
  }
  if (serialized === null) return { ok: true, value: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    return error('invalid_json', 'The saved board is not valid JSON.')
  }
  const validation = validateBoard(parsed)
  if (!validation.ok) return { ok: false, error: { code: 'invalid_document', message: validation.error.message } }
  return { ok: true, value: validation.value }
}

const historyFormat = 'smart-board-history'
const historyFormatVersion = 1

export function saveBoardHistory(storage: Storage, key: string, history: HistoryState): Result<void, StorageError> {
  const validated = validateHistory(history)
  if (!validated.ok) return { ok: false, error: validated.error }
  try {
    storage.setItem(key, JSON.stringify({ format: historyFormat, formatVersion: historyFormatVersion, history: validated.value }))
    return { ok: true, value: undefined }
  } catch {
    return error('storage_unavailable', 'Browser storage is unavailable or full.')
  }
}

export function loadBoardHistory(storage: Storage, key: string): Result<HistoryState | null, StorageError> {
  let serialized: string | null
  try {
    serialized = storage.getItem(key)
  } catch {
    return error('storage_unavailable', 'Browser storage could not be read.')
  }
  if (serialized === null) return { ok: true, value: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    return error('invalid_json', 'The saved board is not valid JSON.')
  }

  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'format' in parsed) {
    const envelope = parsed as Record<string, unknown>
    if (envelope.format !== historyFormat || envelope.formatVersion !== historyFormatVersion
      || Object.keys(envelope).some((field) => !['format', 'formatVersion', 'history'].includes(field))) {
      return error('invalid_history', 'The saved timeline format is not supported.')
    }
    const history = validateHistory(envelope.history)
    return history.ok ? history : { ok: false, error: history.error }
  }

  const legacy = validateBoard(parsed)
  if (!legacy.ok) return { ok: false, error: { code: 'invalid_document', message: legacy.error.message } }
  return { ok: true, value: { initialDocument: legacy.value, entries: [], cursor: 0 } }
}
