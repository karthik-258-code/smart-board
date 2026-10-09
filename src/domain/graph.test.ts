import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { validateBoard } from './objectRegistry'
import { applyOperation } from './operations'
import { dispatch, redo, undo, type HistoryState } from './history'

const graph: BoardObject = { id: 'graph-1', type: 'graph', typeVersion: 1, position: { x: 0, y: 0 },
  nodes: [{ id: 'a', label: 'A', position: { x: 30, y: 40 } }, { id: 'b', label: 'B', position: { x: 140, y: 40 } }],
  edges: [{ id: 'ab', from: 'a', to: 'b' }], highlightedNodeIds: [] }
const board: BoardDocument = { id: 'board-1', schemaVersion: 1, objects: [graph] }

describe('graph validation', () => {
  it('accepts an empty graph and valid disconnected components', () => {
    expect(validateBoard({ ...board, objects: [{ ...graph, nodes: [], edges: [] }] }).ok).toBe(true)
    expect(validateBoard({ ...board, objects: [{ ...graph, edges: [] }] }).ok).toBe(true)
  })

  it.each([
    { ...graph, edges: [{ id: 'bad', from: 'a', to: 'missing' }] },
    { ...graph, edges: [{ id: 'bad', from: 'a', to: 'a' }] },
    { ...graph, edges: [{ id: 'ab', from: 'a', to: 'b' }, { id: 'ba', from: 'b', to: 'a' }] },
    { ...graph, highlightedNodeIds: ['missing'] },
  ])('rejects invalid graph %o', (candidate) => {
    expect(validateBoard({ ...board, objects: [candidate] }).ok).toBe(false)
  })
})

describe('graph operations', () => {
  it('adds and removes an edge with exact inverses', () => {
    const withoutEdge = { ...board, objects: [{ ...graph, edges: [] }] }
    const result = applyOperation(withoutEdge, { type: 'graph/add-edge', objectId: 'graph-1', edge: { id: 'ab', from: 'a', to: 'b' } })
    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ edges: [{ id: 'ab', from: 'a', to: 'b' }] }] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document: withoutEdge } })
  })

  it('removing a vertex removes incident edges and undo restores graph', () => {
    const result = applyOperation(board, { type: 'graph/remove-node', objectId: 'graph-1', nodeId: 'a' })
    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ nodes: [{ id: 'b' }], edges: [] }] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document: board } })
  })

  it('persists highlights in history and supports undo/redo', () => {
    const state: HistoryState = { initialDocument: board, entries: [], cursor: 0 }
    const changed = dispatch(state, { type: 'graph/set-highlighted', objectId: 'graph-1', nodeIds: ['a'] })
    expect(changed.ok).toBe(true)
    if (!changed.ok) return
    expect(undo(changed.value).cursor).toBe(0)
    expect(redo(undo(changed.value))).toEqual(changed.value)
  })

  it('rejects duplicate and missing nodes/edges atomically', () => {
    const original = structuredClone(board)
    for (const operation of [
      { type: 'graph/add-node', objectId: 'graph-1', node: { id: 'a', label: 'Again', position: { x: 0, y: 0 } } },
      { type: 'graph/add-edge', objectId: 'graph-1', edgeId: 'ba', from: 'b', to: 'a' },
      { type: 'graph/remove-node', objectId: 'graph-1', nodeId: 'missing' },
    ] as const) expect(applyOperation(board, operation as never).ok).toBe(false)
    expect(board).toEqual(original)
  })
})
