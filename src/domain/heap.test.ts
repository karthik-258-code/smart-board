import { describe, expect, it } from 'vitest'
import { validateBoard } from './objectRegistry'
import type { BoardDocument, BoardObject } from './model'
import { applyOperation } from './operations'
import { dispatch, undo } from './history'

const heap: BoardObject = { id: 'heap-1', type: 'heap', typeVersion: 1, position: { x: 0, y: 0 }, kind: 'min', values: [2, 5, 7, 9, 8] }
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [heap] }

describe('heap validation and operations', () => {
  it('accepts valid min/max heaps and rejects invalid order', () => {
    expect(validateBoard(board).ok).toBe(true)
    expect(validateBoard({ ...board, objects: [{ ...heap, values: [9, 5, 7, 2, 8] }] }).ok).toBe(false)
    expect(validateBoard({ ...board, objects: [{ ...heap, kind: 'max', values: [9, 5, 7, 4, 3] }] }).ok).toBe(true)
  })

  it('pushes and extracts the min with exact inverse state', () => {
    const pushed = applyOperation(board, { type: 'heap/push', objectId: 'heap-1', value: 1 })
    expect(pushed).toMatchObject({ ok: true, value: { document: { objects: [{ values: [1, 5, 2, 9, 8, 7] }] } } })
    if (!pushed.ok) return
    const extracted = applyOperation(pushed.value.document, { type: 'heap/extract-top', objectId: 'heap-1' })
    expect(extracted).toMatchObject({ ok: true, value: { document: { objects: [{ values: [2, 5, 7, 9, 8] }] } } })
    if (extracted.ok) expect(applyOperation(extracted.value.document, extracted.value.inverse)).toMatchObject({ ok: true, value: { document: pushed.value.document } })
  })

  it('keeps pushes undoable and rejects empty extraction', () => {
    const empty = { ...board, objects: [{ ...heap, values: [] }] }
    const changed = dispatch({ initialDocument: empty, entries: [], cursor: 0 }, { type: 'heap/push', objectId: 'heap-1', value: 3 })
    expect(changed.ok).toBe(true)
    if (changed.ok) expect(undo(changed.value).cursor).toBe(0)
    expect(applyOperation(empty, { type: 'heap/extract-top', objectId: 'heap-1' }).ok).toBe(false)
  })
})
