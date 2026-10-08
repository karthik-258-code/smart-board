import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { loadBoard, saveBoard } from './localBoardStore'

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
})
