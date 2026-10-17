import { describe, expect, it } from 'vitest'
import { validateBoard } from './objectRegistry'
import type { BoardDocument, BoardObject } from './model'
import { applyOperation } from './operations'
import { dispatch, redo, stateAt, undo, type HistoryState } from './history'

const list: BoardObject = {
  id: 'list-1', type: 'linked-list', typeVersion: 1, position: { x: 10, y: 20 },
  nodes: [
    { id: 'node-a', value: 4, nextId: 'node-b' },
    { id: 'node-b', value: 8, nextId: null },
  ],
}
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [list] }

describe('linked list validation', () => {
  it('accepts an empty list and a single acyclic chain', () => {
    expect(validateBoard({ ...board, objects: [{ ...list, nodes: [] }] }).ok).toBe(true)
    expect(validateBoard(board).ok).toBe(true)
    expect(validateBoard({ ...board, objects: [{ ...list, currentNodeId: 'missing' }] }).ok).toBe(false)
  })

  it.each(([
    [{ id: 'x', value: 1, nextId: 'missing' }],
    [{ id: 'x', value: 1, nextId: 'x' }],
    [{ id: 'x', value: 1, nextId: null }, { id: 'x', value: 2, nextId: null }],
    [{ id: 'x', value: 1, nextId: null }, { id: 'y', value: 2, nextId: null }],
  ]) as unknown[])('rejects malformed chain %o', (nodes) => {
    expect(validateBoard({ ...board, objects: [{ ...list, nodes }] }).ok).toBe(false)
  })
})

describe('linked list operations', () => {
  it('inserts after a node and undo restores exact links', () => {
    const result = applyOperation(board, { type: 'linked-list/insert', objectId: 'list-1', afterId: 'node-a', nodeId: 'node-c', value: 6 })
    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ nodes: [
      { id: 'node-a', value: 4, nextId: 'node-c' },
      { id: 'node-c', value: 6, nextId: 'node-b' },
      { id: 'node-b', value: 8, nextId: null },
    ] }] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document: board } })
  })

  it('selects a current node with a reversible operation', () => {
    const result = applyOperation(board, { type: 'linked-list/set-current-node', objectId: 'list-1', nodeId: 'node-b' } as unknown as import('./operations').BoardOperation)

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ currentNodeId: 'node-b' }] }, inverse: { type: 'linked-list/set-current-node', objectId: 'list-1' } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document: board } })
  })

  it('clears a removed current node and restores it on undo', () => {
    const selectedBoard = { ...board, objects: [{ ...list, currentNodeId: 'node-b' }] }
    const result = applyOperation(selectedBoard, { type: 'linked-list/remove', objectId: 'list-1', nodeId: 'node-b' })

    expect(result).toMatchObject({ ok: true, value: {
      document: { objects: [{ nodes: [{ id: 'node-a', nextId: null }], currentNodeId: null }] },
      inverse: { type: 'linked-list/restore-state', currentNodeId: 'node-b' },
    } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document: selectedBoard } })
  })

  it('removes nodes and reverses the chain with reversible history', () => {
    let state: HistoryState = { initialDocument: board, entries: [], cursor: 0 }
    const inserted = dispatch(state, { type: 'linked-list/insert', objectId: 'list-1', afterId: null, nodeId: 'node-zero', value: 0 })
    expect(inserted.ok).toBe(true)
    if (!inserted.ok) return
    state = inserted.value
    const reversed = dispatch(state, { type: 'linked-list/reverse', objectId: 'list-1' })
    expect(reversed.ok).toBe(true)
    if (!reversed.ok) return
    state = reversed.value
    expect(state.cursor).toBe(2)
    const beforeRemove = state
    const removed = dispatch(state, { type: 'linked-list/remove', objectId: 'list-1', nodeId: 'node-zero' })
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    const undone = undo(removed.value)
    expect(undone.cursor).toBe(beforeRemove.cursor)
    expect(stateAt(undone, undone.cursor)).toMatchObject({ ok: true, value: { objects: [{ nodes: [{ id: 'node-b' }, { id: 'node-a' }, { id: 'node-zero' }] }] } })
    expect(redo(undone)).toEqual(removed.value)
  })

  it('rejects missing insertion anchors and removing the last node atomically', () => {
    const empty = { ...board, objects: [{ ...list, nodes: [] }] }
    expect(applyOperation(board, { type: 'linked-list/insert', objectId: 'list-1', afterId: 'missing', nodeId: 'c', value: 3 })).toMatchObject({ ok: false })
    expect(applyOperation(empty, { type: 'linked-list/remove', objectId: 'list-1', nodeId: 'missing' })).toMatchObject({ ok: false })
    expect(board.objects[0]).toEqual(list)
  })
})
