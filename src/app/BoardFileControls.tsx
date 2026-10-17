import { useState, type ChangeEvent } from 'react'
import type { HistoryState } from '../domain/history'
import { parseBoardFile, serializeBoardFile } from '../persistence/boardFile'
import { createBoardShareUrl } from '../persistence/shareLink'

export function BoardFileControls({
  history,
  onImport,
  onError,
}: {
  history: HistoryState
  onImport: (history: HistoryState) => void
  onError: (message: string) => void
}) {
  const [shareUrl, setShareUrl] = useState('')
  const [shareStatus, setShareStatus] = useState('')

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

  async function createShareLink() {
    const result = await createBoardShareUrl(history, window.location.href)
    if (!result.ok) {
      onError(result.error.message)
      setShareStatus('')
      return
    }
    setShareUrl(result.value)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(result.value)
      setShareStatus('Link copied.')
    } catch {
      setShareStatus('Copy the link from the field.')
    }
  }

  return <div className="board-file-controls" aria-label="Board file actions">
    <button type="button" onClick={exportBoard}>Export board</button>
    <button type="button" onClick={() => void createShareLink()}>Create share link</button>
    <label className="file-import-button">Import board
      <input aria-label="Import board file" type="file" accept=".json,application/json" onChange={handleFile} />
    </label>
    {shareUrl && <div className="share-link-output">
      <label htmlFor="board-share-link">Share link</label>
      <input id="board-share-link" aria-label="Share link" type="url" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
      <span role="status">{shareStatus}</span>
      <p>Anyone with this link can read the board. Others need access to the hosted app.</p>
    </div>}
  </div>
}
