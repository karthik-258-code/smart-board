import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from './model'
import { dispatch, redo, stateAt, undo, validateHistory, type HistoryState } from './history'
import { heapExtractionTemplate, inorderTraversalTemplate } from '../execution/smartScript'

const initial = createEmptyBoard('board-1')
const add = (id: string, text: string) => ({
  type: 'object/add' as const,
  object: { id, type: 'note' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, text },
})

function dispatchOrThrow(state: HistoryState, operation: Parameters<typeof dispatch>[1]): HistoryState {
  const result = dispatch(state, operation)
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

describe('history', () => {
  it('dispatches and replays each cursor deterministically', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, add('a', 'first'))
    state = dispatchOrThrow(state, add('b', 'second'))

    expect(state.cursor).toBe(2)
    expect(stateAt(state, 0)).toEqual({ ok: true, value: initial })
    expect(stateAt(state, 1)).toMatchObject({ ok: true, value: { objects: [{ id: 'a', text: 'first' }] } })
    expect(stateAt(state, 2)).toMatchObject({ ok: true, value: { objects: [{ id: 'a' }, { id: 'b' }] } })
    expect(stateAt(state, 2)).toEqual(stateAt(state, 2))
  })

  it('undoes and redoes without moving outside history bounds', () => {
    const first = dispatchOrThrow({ initialDocument: initial, entries: [], cursor: 0 }, add('a', 'first'))
    expect(undo(first).cursor).toBe(0)
    expect(undo(undo(first))).toEqual(undo(first))
    expect(redo(first).cursor).toBe(1)
    expect(redo(redo(first))).toEqual(redo(first))
  })

  it('truncates the redo branch when dispatch follows undo', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, add('a', 'first'))
    state = dispatchOrThrow(state, add('b', 'second'))
    state = undo(state)
    state = dispatchOrThrow(state, add('c', 'replacement'))

    expect(state.entries).toHaveLength(2)
    expect(state.cursor).toBe(2)
    expect(stateAt(state, 2)).toMatchObject({ ok: true, value: { objects: [{ id: 'a' }, { id: 'c' }] } })
  })

  it('reports invalid replay cursors', () => {
    const state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    expect(stateAt(state, -1)).toMatchObject({ ok: false })
    expect(stateAt(state, 1)).toMatchObject({ ok: false })
  })

  it('validates a complete timeline and rejects stale inverse operations', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, add('a', 'first'))
    state = dispatchOrThrow(state, add('b', 'second'))
    expect(validateHistory(state)).toEqual({ ok: true, value: state })
    const staleInverse = { ...state, entries: state.entries.map((entry, index) => index === 0 ? { ...entry, inverse: { type: 'object/remove' as const, objectId: 'wrong' } } : entry) }
    expect(validateHistory(staleInverse)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })

  it('validates and preserves saved script source mappings and variable snapshots', () => {
    let state = dispatchOrThrow({ initialDocument: initial, entries: [], cursor: 0 }, {
      type: 'object/add', object: { id: 'array', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [3], highlightedIndices: [] },
    })
    state = dispatchOrThrow(state, { type: 'array/set-highlight', objectId: 'array', indices: [0] })
    state = { ...state, execution: { kind: 'smart-script', source: 'highlight(i);', arrayId: 'array', events: [{ cursor: 2, line: 1, variables: { i: 0, total: 3 } }] } }

    expect(validateHistory(state)).toEqual({ ok: true, value: state })
    const branched = dispatch(state, { type: 'array/set-highlight', objectId: 'array', indices: [] })
    expect(branched.ok).toBe(true)
    if (branched.ok) expect(branched.value).not.toHaveProperty('execution')
  })

  it('validates graph BFS inspection snapshots against saved node labels and indices', () => {
    const source = 'let start = "A";\nlet queue = [start];\nlet visited = [];\nwhile (queue.length > 0) {\n  let current = queue.shift();\n  if (!visited.includes(current)) {\n    visited.push(current);\n    highlight(current);\n    for (let neighbor of graph.neighbors(current)) {\n      if (!visited.includes(neighbor)) {\n        queue.push(neighbor);\n      }\n    }\n  }\n}'
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, { type: 'object/add', object: {
      id: 'graph', type: 'graph', typeVersion: 1, position: { x: 0, y: 0 },
      nodes: [{ id: 'node-a', label: 'A', position: { x: 0, y: 0 } }], edges: [], highlightedNodeIds: [],
    } })
    state = dispatchOrThrow(state, { type: 'graph/set-highlighted', objectId: 'graph', nodeIds: ['node-a'] })
    state = { ...state, execution: { kind: 'smart-script', source, arrayId: 'graph', events: [{ cursor: 2, line: 8, variables: { visitedCount: 1, queueLength: 0 }, inspection: { index: 0, value: 'A' } }] } }

    expect(validateHistory(state)).toEqual({ ok: true, value: state })
    expect(validateHistory({ ...state, execution: { ...state.execution, events: [{ cursor: 2, line: 8, variables: { visitedCount: 1, queueLength: 0 }, inspection: { index: 1, value: 'A' } }] } })).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
    expect(validateHistory({ ...state, execution: { ...state.execution, events: [{ cursor: 2, line: 8, variables: { visitedCount: 1, queueLength: 0 }, inspection: { index: 0, value: 'B' } }] } })).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })

  it('validates tree traversal inspections against saved node values and indices', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, { type: 'object/add', object: {
      id: 'tree', type: 'binary-tree', typeVersion: 1, position: { x: 0, y: 0 }, rootId: 'root', highlightedNodeIds: [],
      nodes: [
        { id: 'root', value: 'M', leftId: 'left', rightId: null, position: { x: 0, y: 0 } },
        { id: 'left', value: 8, leftId: null, rightId: null, position: { x: 0, y: 80 } },
      ],
    } })
    state = dispatchOrThrow(state, { type: 'tree/set-highlighted', objectId: 'tree', nodeIds: ['root'] })
    state = { ...state, execution: { kind: 'smart-script', source: inorderTraversalTemplate, arrayId: 'tree', events: [{ cursor: 2, line: 4, variables: { visitedCount: 1 }, inspection: { index: 0, value: 'M' } }] } }

    expect(validateHistory(state)).toEqual({ ok: true, value: state })
    expect(validateHistory({ ...state, execution: { ...state.execution, events: [{ cursor: 2, line: 4, variables: { visitedCount: 1 }, inspection: { index: 1, value: 'M' } }] } })).toMatchObject({ ok: false, error: { code: 'invalid_history' } })

    const numericState = dispatchOrThrow(state, { type: 'tree/set-highlighted', objectId: 'tree', nodeIds: ['left'] })
    const numericExecution = { ...numericState, execution: { kind: 'smart-script' as const, source: inorderTraversalTemplate, arrayId: 'tree', events: [{ cursor: 3, line: 4, variables: { visitedCount: 1 }, inspection: { index: 1, value: 8 } }] } }
    expect(validateHistory(numericExecution)).toMatchObject({ ok: true, value: { execution: { events: [{ inspection: { index: 1, value: 8 } }] } } })
  })

  it('validates heap extraction inspections against the pre-extraction heap state', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, { type: 'object/add', object: { id: 'heap', type: 'heap', typeVersion: 1, position: { x: 0, y: 0 }, kind: 'min', values: [1, 3, 2] } })
    state = dispatchOrThrow(state, { type: 'heap/extract-top', objectId: 'heap' })
    state = { ...state, execution: { kind: 'smart-script', source: heapExtractionTemplate, arrayId: 'heap', events: [{ cursor: 2, line: 2, variables: { extractedValue: 1, heapSize: 2 }, inspection: { index: 0, value: 1 } }] } }

    expect(validateHistory(state)).toEqual({ ok: true, value: state })
    expect(validateHistory({ ...state, execution: { ...state.execution, events: [{ cursor: 2, line: 2, variables: { extractedValue: 3, heapSize: 2 }, inspection: { index: 0, value: 3 } }] } })).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })

  it('rejects execution metadata outside the saved timeline', () => {
    const state = { initialDocument: initial, entries: [], cursor: 0, execution: { kind: 'smart-script', source: 'x', arrayId: 'array', events: [{ cursor: 1, line: 1, variables: { i: 0 } }] } }
    expect(validateHistory(state)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })

  it('rejects a saved script mapped to an object that is not an array', () => {
    const state = { initialDocument: initial, entries: [], cursor: 0, execution: { kind: 'smart-script', source: '', arrayId: 'missing', events: [] } }
    expect(validateHistory(state)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })

  it('rejects invalid cursors, unknown fields, and broken future redo entries', () => {
    let state: HistoryState = { initialDocument: initial, entries: [], cursor: 0 }
    state = dispatchOrThrow(state, add('a', 'first'))
    const invalidCursor = { ...state, cursor: 2 }
    const unknownField = { ...state, extra: true }
    const badEntry = {
      operation: { type: 'object/remove' as const, objectId: 'missing' },
      inverse: { type: 'object/add' as const, object: { id: 'x', type: 'note' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, text: '' } },
    }
    const brokenRedo = { ...state, entries: [...state.entries, badEntry] }
    expect(validateHistory(invalidCursor)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
    expect(validateHistory(unknownField)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
    expect(validateHistory(brokenRedo)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })
})
