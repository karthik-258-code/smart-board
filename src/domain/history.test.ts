import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from './model'
import { dispatch, redo, stateAt, undo, validateHistory, type HistoryState } from './history'

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

  it('rejects execution metadata outside the saved timeline', () => {
    const state = { initialDocument: initial, entries: [], cursor: 0, execution: { kind: 'smart-script', source: 'x', arrayId: 'array', events: [{ cursor: 1, line: 1, variables: { i: 0 } }] } }
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
