import type { BoardDocument, BoardError } from '../domain/model'
import { validateBoard } from '../domain/objectRegistry'
import type { Result } from '../domain/result'

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
