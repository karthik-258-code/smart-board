import type { BoardDocument, BoardError } from '../domain/model'
import type { Result } from '../domain/result'
import { validateBoard } from '../domain/objectRegistry'
import { validateHistory, type HistoryState } from '../domain/history'

const historyFormat = 'smart-board-history'
const historyFormatVersion = 1

export function serializeBoardFile(source: BoardDocument | HistoryState): Result<string, BoardError> {
  let history: HistoryState
  if ('initialDocument' in source) {
    const validated = validateHistory(source)
    if (!validated.ok) return { ok: false, error: validated.error }
    history = validated.value
  } else {
    const validated = validateBoard(source)
    if (!validated.ok) return validated
    history = { initialDocument: validated.value, entries: [], cursor: 0 }
  }
  const envelope = { format: historyFormat, formatVersion: historyFormatVersion, history }
  return { ok: true, value: `${JSON.stringify(envelope, null, 2)}\n` }
}

export function parseBoardFile(source: string): Result<HistoryState, BoardError> {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    return { ok: false, error: { code: 'invalid_json', message: 'The selected file is not valid JSON.' } }
  }
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'format' in parsed) {
    const envelope = parsed as Record<string, unknown>
    if (envelope.format !== historyFormat || envelope.formatVersion !== historyFormatVersion
      || Object.keys(envelope).some((field) => !['format', 'formatVersion', 'history'].includes(field))) {
      return { ok: false, error: { code: 'unsupported_history_format', message: 'The selected timeline format is not supported.' } }
    }
    return validateHistory(envelope.history)
  }
  const document = validateBoard(parsed)
  if (!document.ok) return document
  return { ok: true, value: { initialDocument: document.value, entries: [], cursor: 0 } }
}
