import type { BoardDocument, BoardError } from '../domain/model'
import type { Result } from '../domain/result'
import { validateBoard } from '../domain/objectRegistry'

export function serializeBoardFile(document: BoardDocument): Result<string, BoardError> {
  const validated = validateBoard(document)
  if (!validated.ok) return validated
  return { ok: true, value: `${JSON.stringify(validated.value, null, 2)}\n` }
}

export function parseBoardFile(source: string): Result<BoardDocument, BoardError> {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    return { ok: false, error: { code: 'invalid_json', message: 'The selected file is not valid JSON.' } }
  }
  return validateBoard(parsed)
}
