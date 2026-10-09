import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { validateBoard } from './objectRegistry'
import { hashBucketForKey } from './hashTable'
import { applyOperation } from './operations'
import { dispatch, undo, type HistoryState } from './history'

const table: BoardObject = { id: 'hash-1', type: 'hash-table', typeVersion: 1, position: { x: 0, y: 0 }, bucketCount: 7, entries: [{ key: 'ab', value: 2 }] }
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [table] }

describe('hash table', () => {
  it('assigns colliding keys to the same deterministic bucket', () => {
    expect(hashBucketForKey('ab', 7)).toBe(hashBucketForKey('ba', 7))
    expect(hashBucketForKey('ab', 7)).toBe(6)
  })

  it('validates bounded bucket counts and unique non-empty keys', () => {
    expect(validateBoard(board).ok).toBe(true)
    expect(validateBoard({ ...board, objects: [{ ...table, bucketCount: 2 }] }).ok).toBe(false)
    expect(validateBoard({ ...board, objects: [{ ...table, entries: [{ key: '', value: 1 }] }] }).ok).toBe(false)
    expect(validateBoard({ ...board, objects: [{ ...table, entries: [{ key: 'x', value: 1 }, { key: 'x', value: 2 }] }] }).ok).toBe(false)
  })

  it('inserts, updates, and removes entries with exact inverse state', () => {
    const inserted = applyOperation(board, { type: 'hash-table/set', objectId: 'hash-1', key: 'ba', value: 4 })
    expect(inserted).toMatchObject({ ok: true, value: { document: { objects: [{ entries: [{ key: 'ab' }, { key: 'ba' }] }] } } })
    if (!inserted.ok) return
    const updated = applyOperation(inserted.value.document, { type: 'hash-table/set', objectId: 'hash-1', key: 'ab', value: 9 })
    expect(updated).toMatchObject({ ok: true, value: { document: { objects: [{ entries: [{ key: 'ab', value: 9 }, { key: 'ba', value: 4 }] }] } } })
    if (!updated.ok) return
    expect(applyOperation(updated.value.document, updated.value.inverse)).toMatchObject({ ok: true, value: { document: inserted.value.document } })
    const removed = applyOperation(updated.value.document, { type: 'hash-table/remove', objectId: 'hash-1', key: 'ab' })
    expect(removed).toMatchObject({ ok: true, value: { document: { objects: [{ entries: [{ key: 'ba' }] }] } } })
  })

  it('keeps writes undoable in history and rejects missing removals', () => {
    const state: HistoryState = { initialDocument: board, entries: [], cursor: 0 }
    const changed = dispatch(state, { type: 'hash-table/set', objectId: 'hash-1', key: 'ba', value: 4 })
    expect(changed.ok).toBe(true)
    if (changed.ok) expect(undo(changed.value).cursor).toBe(0)
    expect(applyOperation(board, { type: 'hash-table/remove', objectId: 'hash-1', key: 'missing' }).ok).toBe(false)
  })
})
