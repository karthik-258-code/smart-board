import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { validateBoard } from './objectRegistry'
import { applyOperation } from './operations'
import { dispatch, undo, type HistoryState } from './history'

const tree: BoardObject = { id: 'tree-1', type: 'binary-tree', typeVersion: 1, position: { x: 0, y: 0 }, rootId: 'a', highlightedNodeIds: [], nodes: [
  { id: 'a', value: 8, leftId: 'b', rightId: 'c', position: { x: 120, y: 30 } },
  { id: 'b', value: 3, leftId: null, rightId: null, position: { x: 60, y: 110 } },
  { id: 'c', value: 11, leftId: null, rightId: null, position: { x: 180, y: 110 } },
] }
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [tree] }

describe('binary tree validation', () => {
  it('accepts an empty tree and a connected rooted tree', () => {
    expect(validateBoard({ ...board, objects: [{ ...tree, rootId: null, nodes: [] }] }).ok).toBe(true)
    expect(validateBoard(board).ok).toBe(true)
  })

  it.each([
    { ...tree, rootId: 'missing' },
    { ...tree, nodes: [{ ...tree.nodes[0], leftId: 'a' }, ...tree.nodes.slice(1)] },
    { ...tree, nodes: [...tree.nodes, { ...tree.nodes[1], id: 'd' }] },
    { ...tree, nodes: [...tree.nodes, { ...tree.nodes[1], id: 'd', leftId: null, rightId: null, position: { x: 0, y: 0 } }] },
  ])('rejects invalid tree %o', (candidate) => {
    expect(validateBoard({ ...board, objects: [candidate] }).ok).toBe(false)
  })
})

describe('binary tree operations', () => {
  it('inserts a child and removes a subtree with exact inverse', () => {
    const inserted = applyOperation(board, { type: 'tree/insert', objectId: 'tree-1', node: { id: 'd', value: 1, leftId: null, rightId: null, position: { x: 30, y: 190 } }, parentId: 'b', side: 'left' })
    expect(inserted.ok && inserted.value.document.objects[0].type === 'binary-tree' && inserted.value.document.objects[0].nodes.find((node) => node.id === 'b')?.leftId).toBe('d')
    if (!inserted.ok) return
    const removed = applyOperation(inserted.value.document, { type: 'tree/remove-subtree', objectId: 'tree-1', nodeId: 'b' })
    expect(removed).toMatchObject({ ok: true, value: { document: { objects: [{ nodes: [{ id: 'a', leftId: null }, { id: 'c' }] }] } } })
    if (removed.ok) expect(applyOperation(removed.value.document, removed.value.inverse)).toMatchObject({ ok: true, value: { document: inserted.value.document } })
  })

  it('makes tree edits undoable and rejects occupied child slots', () => {
    const state: HistoryState = { initialDocument: board, entries: [], cursor: 0 }
    const result = dispatch(state, { type: 'tree/insert', objectId: 'tree-1', node: { id: 'd', value: 1, leftId: null, rightId: null, position: { x: 0, y: 180 } }, parentId: 'a', side: 'left' })
    expect(result.ok).toBe(false)
    const empty = { ...board, objects: [{ ...tree, rootId: null, nodes: [] }] }
    const added = dispatch({ initialDocument: empty, entries: [], cursor: 0 }, { type: 'tree/insert', objectId: 'tree-1', node: { id: 'root', value: 8, leftId: null, rightId: null, position: { x: 120, y: 30 } }, parentId: null, side: 'root' })
    expect(added.ok).toBe(true)
    if (added.ok) expect(undo(added.value).cursor).toBe(0)
    expect(applyOperation(empty, { type: 'tree/insert', objectId: 'tree-1', node: { id: 'root', value: 8, leftId: null, rightId: null, position: { x: 120, y: 30 } }, parentId: null, side: 'root' }).ok).toBe(true)
  })
})
