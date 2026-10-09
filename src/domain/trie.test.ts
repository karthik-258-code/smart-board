import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { validateBoard } from './objectRegistry'
import { applyOperation } from './operations'
import { dispatch, undo } from './history'

const trie: BoardObject = { id: 'trie-1', type: 'trie', typeVersion: 1, position: { x: 0, y: 0 }, words: ['car', 'cat'] }
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [trie] }

describe('trie word set', () => {
  it('accepts an empty trie and unique lowercase words', () => {
    expect(validateBoard(board).ok).toBe(true)
    expect(validateBoard({ ...board, objects: [{ ...trie, words: [] }] }).ok).toBe(true)
  })

  it.each([[''], ['Camel'], ['word!'], ['way-too-long-word-that-is-too-long'], ['car', 'car']] as unknown[])('rejects invalid word sets %o', (words) => {
    expect(validateBoard({ ...board, objects: [{ ...trie, words }] }).ok).toBe(false)
  })

  it('inserts and removes words reversibly without losing shared prefixes', () => {
    const inserted = applyOperation(board, { type: 'trie/insert-word', objectId: 'trie-1', word: 'cart' })
    expect(inserted).toMatchObject({ ok: true, value: { document: { objects: [{ words: ['car', 'cart', 'cat'] }] } } })
    if (!inserted.ok) return
    const removed = applyOperation(inserted.value.document, { type: 'trie/remove-word', objectId: 'trie-1', word: 'car' })
    expect(removed).toMatchObject({ ok: true, value: { document: { objects: [{ words: ['cart', 'cat'] }] } } })
    if (removed.ok) expect(applyOperation(removed.value.document, removed.value.inverse)).toMatchObject({ ok: true, value: { document: inserted.value.document } })
  })

  it('stores word changes in history and rejects missing removals', () => {
    const empty: BoardDocument = { ...board, objects: [{ ...trie, words: [] }] }
    const changed = dispatch({ initialDocument: empty, entries: [], cursor: 0 }, { type: 'trie/insert-word', objectId: 'trie-1', word: 'a' })
    expect(changed.ok).toBe(true)
    if (changed.ok) expect(undo(changed.value).cursor).toBe(0)
    expect(applyOperation(board, { type: 'trie/remove-word', objectId: 'trie-1', word: 'missing' }).ok).toBe(false)
  })
})
