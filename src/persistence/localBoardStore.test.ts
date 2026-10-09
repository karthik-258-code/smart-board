import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { dispatch, undo, type HistoryState } from '../domain/history'
import { loadBoard, loadBoardHistory, saveBoard, saveBoardHistory } from './localBoardStore'

const key = 'smart-board:document:v1'
const document = {
  id: 'board-1', schemaVersion: 1 as const,
  objects: [{ id: 'note-1', type: 'note' as const, typeVersion: 1 as const, position: { x: 10, y: 20 }, text: 'Saved' }],
}

describe('localBoardStore', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a validated board document', () => {
    expect(saveBoard(localStorage, key, document)).toEqual({ ok: true, value: undefined })
    expect(loadBoard(localStorage, key)).toEqual({ ok: true, value: document })
  })

  it('returns null when no saved board exists', () => {
    expect(loadBoard(localStorage, key)).toEqual({ ok: true, value: null })
  })

  it('reports malformed JSON without changing the stored source', () => {
    localStorage.setItem(key, '{bad json')
    expect(loadBoard(localStorage, key)).toMatchObject({ ok: false, error: { code: 'invalid_json' } })
    expect(localStorage.getItem(key)).toBe('{bad json')
  })

  it('reports schema failures without changing the stored source', () => {
    const raw = JSON.stringify({ id: 'bad', schemaVersion: 9, objects: [] })
    localStorage.setItem(key, raw)
    expect(loadBoard(localStorage, key)).toMatchObject({ ok: false, error: { code: 'invalid_document' } })
    expect(localStorage.getItem(key)).toBe(raw)
  })

  it('catches storage exceptions on load and save', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('denied') }),
      setItem: vi.fn(() => { throw new Error('quota') }),
    } as unknown as Storage
    expect(loadBoard(storage, key)).toMatchObject({ ok: false, error: { code: 'storage_unavailable' } })
    expect(saveBoard(storage, key, createEmptyBoard('board-1'))).toMatchObject({ ok: false, error: { code: 'storage_unavailable' } })
  })

  it('round-trips a full history state including its redo branch and cursor', () => {
    let history: HistoryState = { initialDocument: createEmptyBoard('board-1'), entries: [], cursor: 0 }
    const first = dispatch(history, { type: 'object/add', object: document.objects[0] })
    if (!first.ok) throw new Error(first.error.message)
    const second = dispatch(first.value, { type: 'note/update-text', objectId: 'note-1', text: 'Second state' })
    if (!second.ok) throw new Error(second.error.message)
    history = undo(second.value)
    expect(saveBoardHistory(localStorage, key, history)).toEqual({ ok: true, value: undefined })
    expect(loadBoardHistory(localStorage, key)).toEqual({ ok: true, value: history })
  })

  it('loads legacy document snapshots as empty histories', () => {
    localStorage.setItem(key, JSON.stringify(document))
    expect(loadBoardHistory(localStorage, key)).toEqual({ ok: true, value: { initialDocument: document, entries: [], cursor: 0 } })
  })

  it('rejects malformed history without modifying saved bytes', () => {
    const raw = JSON.stringify({ format: 'smart-board-history', formatVersion: 1, history: { initialDocument: document, entries: [], cursor: 1 } })
    localStorage.setItem(key, raw)
    expect(loadBoardHistory(localStorage, key)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
    expect(localStorage.getItem(key)).toBe(raw)
  })
})
