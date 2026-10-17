import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { dispatch, stateAt, type HistoryState } from '../domain/history'
import { runArrayTraversal, runBinarySearch } from './smartScript'

function historyWithArray(values: Array<string | number>, withPointer = false) {
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

  it('tracks a numeric accumulator and its snapshots while visiting array values', () => {
    const initial = historyWithArray([4, 8, 12])
    const source = 'let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  total += values[i];\n  highlight(i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.filter((event) => event.line === 3).map((event) => event.variables.total)).toEqual([4, 12, 24])
    expect(result.value.events.filter((event) => event.line === 4).map((event) => event.variables.total)).toEqual([4, 12, 24])
    expect(result.value.events.at(-1)?.variables).toEqual({ total: 24, i: 2 })
  })

  it('executes if/else branches and exposes each conditional accumulator update', () => {
    const initial = historyWithArray([3, -2, 0, 5])
    const source = 'let positive = 0;\nlet notPositive = 0;\nfor (let i = 0; i < values.length; i++) {\n  if (values[i] > 0) {\n    positive += 1;\n  } else {\n    notPositive += 1;\n  }\n  highlight(i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.filter((event) => event.line === 4).map((event) => event.variables.i)).toEqual([0, 1, 2, 3])
    expect(result.value.events.filter((event) => event.line === 5).map((event) => event.variables.positive)).toEqual([1, 2])
    expect(result.value.events.filter((event) => event.line === 7).map((event) => event.variables.notPositive)).toEqual([1, 2])
    expect(result.value.events.at(-1)?.variables).toEqual({ positive: 2, notPositive: 2, i: 3 })
  })

  it('supports nested conditions using declared variables and numeric array values', () => {
    const initial = historyWithArray([1, 8, -3])
    const source = 'let score = 0;\nfor (let i = 0; i < values.length; i++) {\n  if (values[i] > 0) {\n    if (values[i] >= 5) {\n      score += 1;\n    } else {\n      score += 2;\n    }\n  } else {\n    score += 3;\n  }\n  highlight(i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events.at(-1)?.variables).toEqual({ score: 6, i: 2 })
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

  it('reports an ambiguous pointer mapping rather than moving an arbitrary pointer', () => {
    const initial = historyWithArray([4, 8], true)
    const duplicate = dispatch(initial, { type: 'object/add', object: { id: 'pointer-i-duplicate', type: 'pointer', typeVersion: 1, position: { x: 20, y: -30 }, name: 'i', targetObjectId: 'values-board', index: 0 } })
    expect(duplicate.ok).toBe(true)
    if (!duplicate.ok) return

    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', duplicate.value, 'values-board')
    expect(result).toMatchObject({ ok: false, error: { code: 'ambiguous_mapping', line: 1 } })
  })

  it('rejects numeric accumulation over text without returning partial history', () => {
    const initial = historyWithArray(['word'])
    const result = runArrayTraversal('let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  total += values[i];\n}', initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_input', line: 3 } })
    expect(initial.cursor).toBe(1)
  })

  it('returns an empty trace for an empty selected array', () => {
    const initial = historyWithArray([])
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events).toHaveLength(0)
  })

  it('rejects prototype-sensitive variable names', () => {
    const initial = historyWithArray([1])
    const result = runArrayTraversal('for (let __proto__ = 0; __proto__ < values.length; __proto__++) {\n  highlight(__proto__);\n}', initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_syntax', line: 1 } })
  })
})

describe('Smart Script binary search', () => {
  const source = 'let target = 11;\nlet low = 0;\nlet high = values.length - 1;\nwhile (low <= high) {\n  let mid = Math.floor((low + high) / 2);\n  highlight(mid);\n  if (values[mid] === target) {\n    found = mid;\n    break;\n  } else if (values[mid] < target) {\n    low = mid + 1;\n  } else {\n    high = mid - 1;\n  }\n}'

  it('finds a target, records low/high/mid, and synchronizes the active range and mid pointer', () => {
    let initial = historyWithArray([2, 4, 7, 11, 18])
    for (const object of [
      { id: 'mid-pointer', type: 'pointer' as const, typeVersion: 1 as const, position: { x: 0, y: -30 }, name: 'mid', targetObjectId: 'values-board', index: 0 },
      { id: 'search-range', type: 'range' as const, typeVersion: 1 as const, position: { x: 0, y: 80 }, name: 'search', targetObjectId: 'values-board', start: 0, endExclusive: 5 },
    ]) {
      const added = dispatch(initial, { type: 'object/add', object })
      if (!added.ok) throw new Error(added.error.message)
      initial = added.value
    }
    const result = runBinarySearch(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.filter((event) => event.line === 7).map((event) => [event.variables.mid, event.variables.value, event.variables.comparison])).toEqual([[2, 7, -4], [3, 11, 0]])
    expect(result.value.events.at(-1)).toMatchObject({ line: 9, variables: { low: 3, high: 4, mid: 3, found: 3 } })
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'mid-pointer')).toMatchObject({ index: 3 })
    expect(final.ok && final.value.objects.find((object) => object.id === 'search-range')).toMatchObject({ start: 3, endExclusive: 5 })
  })

  it('closes the search range when the target is not present', () => {
    const initial = historyWithArray([2, 4, 7, 11, 18])
    const result = runBinarySearch(source.replace('target = 11', 'target = 6'), initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const finalEvent = result.value.events.at(-1)
    expect(finalEvent).toMatchObject({ variables: { low: 2, high: 1 } })
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'values-board')).toMatchObject({ highlightedIndices: [] })
  })

  it('rejects unsorted arrays and unsupported source without executing', () => {
    const unsorted = historyWithArray([2, 8, 4])
    expect(runBinarySearch(source, unsorted, 'values-board')).toMatchObject({ ok: false, error: { code: 'unsupported_input' } })
    expect(runBinarySearch('while (true) { unsafe(); }', unsorted, 'values-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax' } })
  })
})
