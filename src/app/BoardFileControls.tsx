import type { ChangeEvent } from 'react'
import type { HistoryState } from '../domain/history'
import { parseBoardFile, serializeBoardFile } from '../persistence/boardFile'

export function BoardFileControls({
  history,
  onImport,
  onError,
}: {
  history: HistoryState
  onImport: (history: HistoryState) => void
  onError: (message: string) => void
}) {
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      const parsed = parseBoardFile(await file.text())
      if (!parsed.ok) {
        onError(parsed.error.message)
      } else if (window.confirm('Import this board and replace the current board?')) {
        onImport(parsed.value)
      }
    } catch {
      onError('The selected file could not be read.')
    } finally {
      input.value = ''
    }
  }

  function exportBoard() {
    const serialized = serializeBoardFile(history)
    if (!serialized.ok) {
      onError(serialized.error.message)
      return
    }
    const blob = new Blob([serialized.value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    const boardId = history.initialDocument.id
    link.download = `${boardId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'smart-board'}.smart-board.json`
    window.document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="board-file-controls" aria-label="Board file actions">
    <button type="button" onClick={exportBoard}>Export board</button>
    <label className="file-import-button">Import board
      <input aria-label="Import board file" type="file" accept=".json,application/json" onChange={handleFile} />
    </label>
  </div>
}
