import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { dispatch, stateAt, type HistoryState } from '../domain/history'
import { runArrayTraversal } from './smartScript'

function historyWithArray(values: number[], withPointer = false) {
  let history: HistoryState = { initialDocument: createEmptyBoard('script-test'), entries: [], cursor: 0 }
  const added = dispatch(history, { type: 'object/add', object: { id: 'values-board', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values, highlightedIndices: [] } })
  if (!added.ok) throw new Error(added.error.message)
  history = added.value
  if (withPointer) {
    const pointer = dispatch(history, { type: 'object/add', object: { id: 'pointer-i', type: 'pointer', typeVersion: 1, position: { x: 0, y: -30 }, name: 'i', targetObjectId: 'values-board', index: 0 } })
    if (!pointer.ok) throw new Error(pointer.error.message)
    history = pointer.value
  }
  return history
}

describe('Smart Script array traversal', () => {
  it('steps through an explicit bounded loop and maps the index to array highlights', () => {
    const initial = historyWithArray([4, 8, 12])
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => [event.line, event.variables.i])).toEqual([[2, 0], [2, 1], [2, 2]])
    expect(result.value.history.entries).toHaveLength(initial.entries.length + 3)
    const last = stateAt(result.value.history, result.value.history.cursor)
    expect(last.ok && last.value.objects.find((object) => object.id === 'values-board')).toMatchObject({ highlightedIndices: [2] })
  })

  it('synchronizes a matching pointer through reversible board operations', () => {
    const initial = historyWithArray([5, 9], true)
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.history.entries.slice(initial.cursor).map((entry) => entry.operation.type)).toEqual([
      'array/set-highlight', 'pointer/move', 'array/set-highlight', 'pointer/move',
    ])
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'pointer-i')).toMatchObject({ index: 1 })
  })

  it('rejects unsupported code with a source-line diagnostic without changing history', () => {
    const initial = historyWithArray([1])
    const result = runArrayTraversal('while (true) { process.exit(); }', initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_syntax', line: 1 } })
    expect(initial.cursor).toBe(1)
  })

  it('rejects work beyond the configured iteration limit', () => {
    const initial = historyWithArray([1, 2, 3])
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'values-board', { maxIterations: 2 })

    expect(result).toMatchObject({ ok: false, error: { code: 'step_limit', line: 1 } })
  })
})
