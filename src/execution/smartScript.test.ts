import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { dispatch, redo, stateAt, undo, type HistoryState } from '../domain/history'
import { buildExampleHistory } from '../examples/catalog'
import { breadthFirstSearchTemplate, depthFirstSearchTemplate, inorderTraversalTemplate, postorderTraversalTemplate, preorderTraversalTemplate, runArrayTraversal, runBinarySearch, runGraphBreadthFirstSearch, runGraphDepthFirstSearch, runSmartScript, runTreeTraversal } from './smartScript'

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

function historyWithContainer(values: Array<string | number>, kind: 'stack' | 'queue') {
  let history: HistoryState = { initialDocument: createEmptyBoard('script-test'), entries: [], cursor: 0 }
  const added = dispatch(history, { type: 'object/add', object: { id: 'container-board', type: 'container', typeVersion: 1, position: { x: 0, y: 0 }, kind, values } })
  if (!added.ok) throw new Error(added.error.message)
  history = added.value
  return history
}

function historyWithLinkedList(values: Array<string | number>) {
  let history: HistoryState = { initialDocument: createEmptyBoard('script-test'), entries: [], cursor: 0 }
  const nodes = values.map((value, index) => ({ id: `list-node-${index}`, value, nextId: values[index + 1] === undefined ? null : `list-node-${index + 1}` }))
  const added = dispatch(history, { type: 'object/add', object: { id: 'linked-list-board', type: 'linked-list', typeVersion: 1, position: { x: 0, y: 0 }, nodes } })
  if (!added.ok) throw new Error(added.error.message)
  history = added.value
  return history
}

describe('Smart Script array traversal', () => {
  it('traverses a stack or queue and highlights the current contained value', () => {
    const initial = historyWithContainer([4, 8, 12], 'queue')
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'container-board')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.events.map((event) => event.inspection)).toEqual([
        { index: 0, value: 4 }, { index: 1, value: 8 }, { index: 2, value: 12 },
      ])
      expect(result.value.events.map((event) => event.operation.type)).toEqual([
        'container/set-current-index', 'container/set-current-index', 'container/set-current-index',
      ])
      const final = stateAt(result.value.history, result.value.history.cursor)
      expect(final.ok && final.value.objects.find((object) => object.id === 'container-board')).toMatchObject({ currentIndex: 2 })
    }
  })

  it('traverses a linked list and highlights the current node by stable ID', () => {
    const initial = historyWithLinkedList([4, 8, 12])
    const result = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', initial, 'linked-list-board')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.events.map((event) => event.operation.type)).toEqual([
        'linked-list/set-current-node', 'linked-list/set-current-node', 'linked-list/set-current-node',
      ])
      const final = stateAt(result.value.history, result.value.history.cursor)
      expect(final.ok && final.value.objects.find((object) => object.id === 'linked-list-board')).toMatchObject({ currentNodeId: 'list-node-2' })
    }
  })

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

  it('highlights declared pointer variables and moves matching board pointers', () => {
    let initial = historyWithArray([4, 8, 12])
    for (const [name, index] of [['left', 0], ['right', 2]] as const) {
      const added = dispatch(initial, { type: 'object/add', object: { id: `pointer-${name}`, type: 'pointer', typeVersion: 1, position: { x: 0, y: -30 }, name, targetObjectId: 'values-board', index } })
      if (!added.ok) throw new Error(added.error.message)
      initial = added.value
    }
    const source = 'let left = 0;\nlet right = 2;\nfor (let i = 0; i < values.length; i++) {\n  left += 1;\n  highlight(left);\n  right += -1;\n  highlight(right);\n  if (i === 1) {\n    break;\n  }\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.filter((event) => event.operation.type === 'pointer/move').map((event) => [event.line, event.variables.left, event.variables.right])).toEqual([
      [5, 1, 2], [7, 1, 1], [5, 2, 1], [7, 2, 0],
    ])
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'pointer-left')).toMatchObject({ index: 2 })
    expect(final.ok && final.value.objects.find((object) => object.id === 'pointer-right')).toMatchObject({ index: 0 })
  })

  it('does not move a pointer named after an unrelated accumulator', () => {
    let initial = historyWithArray([2, 4])
    const added = dispatch(initial, { type: 'object/add', object: { id: 'pointer-total', type: 'pointer', typeVersion: 1, position: { x: 0, y: -30 }, name: 'total', targetObjectId: 'values-board', index: 1 } })
    if (!added.ok) throw new Error(added.error.message)
    initial = added.value
    const source = 'let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  total += values[i];\n  highlight(i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.some((event) => event.operation.type === 'pointer/move')).toBe(false)
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'pointer-total')).toMatchObject({ index: 1 })
  })

  it('reports an out-of-range highlighted variable on its source line', () => {
    const initial = historyWithArray([4, 8])
    const result = runArrayTraversal('let left = -1;\nfor (let i = 0; i < values.length; i++) {\n  highlight(left);\n}', initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_input', line: 3 } })
  })

  it('rejects ambiguous named pointer mappings', () => {
    let initial = historyWithArray([4, 8])
    for (const id of ['pointer-left-a', 'pointer-left-b']) {
      const added = dispatch(initial, { type: 'object/add', object: { id, type: 'pointer', typeVersion: 1, position: { x: 0, y: -30 }, name: 'left', targetObjectId: 'values-board', index: 0 } })
      if (!added.ok) throw new Error(added.error.message)
      initial = added.value
    }
    const result = runArrayTraversal('let left = 1;\nfor (let i = 0; i < values.length; i++) {\n  highlight(left);\n}', initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'ambiguous_mapping', line: 3 } })
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

  it('evaluates bounded arithmetic expressions in conditions and accumulator updates', () => {
    const initial = historyWithArray([2, 5, 8])
    const source = 'let score = 0;\nfor (let i = 0; i < values.length; i++) {\n  if ((values[i] + 1) % 3 === 0) {\n    score += values[i] * 2 + i;\n  }\n  highlight(i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events.at(-1)?.variables).toEqual({ score: 33, i: 2 })
  })

  it('rejects division by zero without returning a partial history', () => {
    const initial = historyWithArray([2, 5])
    const source = 'let score = 0;\nfor (let i = 0; i < values.length; i++) {\n  score += values[i] / (i - i);\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_input', line: 3 } })
    expect(initial.cursor).toBe(1)
  })

  it('breaks out of the traversal when a nested branch matches', () => {
    const initial = historyWithArray([1, 2, 3, 4])
    const source = 'let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  if (values[i] === 3) {\n    break;\n  }\n  total += values[i];\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.events.at(-1)?.variables).toEqual({ total: 3, i: 2 })
      expect(result.value.events.filter((event) => event.operation.type === 'array/set-highlight').map((event) => event.variables.i)).toEqual([0, 0, 1, 1, 2, 2])
    }
  })

  it('continues to the next iteration when a nested branch matches', () => {
    const initial = historyWithArray([1, 2, 3])
    const source = 'let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  if (values[i] === 2) {\n    continue;\n  }\n  total += values[i];\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.events.at(-1)?.variables).toEqual({ total: 4, i: 2 })
      expect(result.value.events.filter((event) => event.line === 6).map((event) => event.variables.i)).toEqual([0, 2])
    }
  })

  it('evaluates compound conditions with short-circuit logic', () => {
    const initial = historyWithArray([0, 2, -5, 8])
    const source = 'let count = 0;\nfor (let i = 0; i < values.length; i++) {\n  if (values[i] === 0 || values[i] > 0 && 10 / values[i] > 1) {\n    count += 1;\n  }\n}'
    const result = runArrayTraversal(source, initial, 'values-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events.at(-1)?.variables).toEqual({ count: 3, i: 3 })
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

describe('Smart Script graph breadth-first search', () => {
  function graphHistory(nodes: Array<{ id: string; label: string }>, edges: Array<{ id: string; from: string; to: string }>): HistoryState {
    let history: HistoryState = { initialDocument: createEmptyBoard('graph-script-test'), entries: [], cursor: 0 }
    const added = dispatch(history, { type: 'object/add', object: {
      id: 'graph-board', type: 'graph', typeVersion: 1, position: { x: 0, y: 0 },
      nodes: nodes.map((node, index) => ({ ...node, position: { x: index * 100, y: 0 } })), edges, highlightedNodeIds: [],
    } })
    if (!added.ok) throw new Error(added.error.message)
    history = added.value
    return history
  }

  it('visits built-in graph neighbors in FIFO edge order and records inspected labels', () => {
    const example = buildExampleHistory('breadth-first-search')
    if (!example.ok) throw new Error(example.error.message)
    const initial = example.value
    const result = runGraphBreadthFirstSearch(breadthFirstSearchTemplate, initial, 'example-graph')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => event.inspection?.value)).toEqual(['A', 'B', 'C', 'D'])
    expect(result.value.events.map((event) => event.line)).toEqual([6, 6, 6, 6])
    expect(result.value.events.map((event) => event.variables.visitedCount)).toEqual([1, 2, 3, 4])
    expect(result.value.events.map((event) => event.variables.queueLength)).toEqual([0, 1, 1, 0])
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'example-graph')).toMatchObject({ highlightedNodeIds: ['a', 'b', 'c', 'd'] })
  })

  it('terminates on cycles and leaves disconnected components unhighlighted', () => {
    const initial = graphHistory(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
      [{ id: 'ab', from: 'a', to: 'b' }, { id: 'bc', from: 'b', to: 'c' }, { id: 'ca', from: 'c', to: 'a' }],
    )
    const result = runGraphBreadthFirstSearch(breadthFirstSearchTemplate, initial, 'graph-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => event.inspection?.value)).toEqual(['A', 'B', 'C'])
    expect(result.value.events).toHaveLength(3)
    const final = stateAt(result.value.history, result.value.history.cursor)
    expect(final.ok && final.value.objects.find((object) => object.id === 'graph-board')).toMatchObject({ highlightedNodeIds: ['a', 'b', 'c'] })
  })

  it('rejects missing or ambiguous start labels and edited template lines without changing history', () => {
    const missing = graphHistory([{ id: 'a', label: 'A' }], [])
    const duplicate = graphHistory([{ id: 'a', label: 'A' }, { id: 'b', label: 'A' }], [])

    expect(runGraphBreadthFirstSearch(breadthFirstSearchTemplate.replace('"A"', '"Z"'), missing, 'graph-board')).toMatchObject({ ok: false, error: { code: 'unsupported_input', line: 1 } })
    expect(runGraphBreadthFirstSearch(breadthFirstSearchTemplate, duplicate, 'graph-board')).toMatchObject({ ok: false, error: { code: 'ambiguous_mapping', line: 1 } })
    expect(runGraphBreadthFirstSearch(breadthFirstSearchTemplate.replace('queue.shift()', 'queue.pop()'), missing, 'graph-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax' } })
    expect(missing.entries).toHaveLength(1)
  })

  it('uses the graph template dispatch through the shared Smart Script entry point', () => {
    const initial = graphHistory([{ id: 'a', label: 'A' }], [])

    const result = runSmartScript(breadthFirstSearchTemplate, initial, 'graph-board')
    expect(result.ok).toBe(true)
  })

  it('accepts start labels containing replacement-token sequences', () => {
    const label = "$&$'$`"
    const initial = graphHistory([{ id: 'special', label }], [])
    const source = breadthFirstSearchTemplate.replace('"A"', () => JSON.stringify(label))

    const result = runGraphBreadthFirstSearch(source, initial, 'graph-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events[0]?.inspection?.value).toBe(label)
  })

  it('visits graph nodes in deterministic LIFO order and reports remaining stack size', () => {
    const example = buildExampleHistory('breadth-first-search')
    if (!example.ok) throw new Error(example.error.message)
    const result = runGraphDepthFirstSearch(depthFirstSearchTemplate, example.value, 'example-graph')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => event.inspection?.value)).toEqual(['A', 'C', 'D', 'B'])
    expect(result.value.events.map((event) => event.variables.stackLength)).toEqual([0, 1, 1, 1])
    expect(result.value.events.map((event) => event.line)).toEqual([8, 8, 8, 8])
  })

  it('handles DFS cycles and disconnected nodes without duplicate visits', () => {
    const initial = graphHistory(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
      [{ id: 'ab', from: 'a', to: 'b' }, { id: 'bc', from: 'b', to: 'c' }, { id: 'ca', from: 'c', to: 'a' }],
    )
    const result = runGraphDepthFirstSearch(depthFirstSearchTemplate, initial, 'graph-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => event.inspection?.value)).toEqual(['A', 'C', 'B'])
    expect(result.value.events).toHaveLength(3)
    expect(stateAt(result.value.history, result.value.history.cursor)).toMatchObject({ ok: true, value: { objects: [expect.objectContaining({ highlightedNodeIds: ['a', 'c', 'b'] })] } })
  })

  it('rejects invalid DFS starts and modified templates, and dispatches valid DFS through shared runner', () => {
    const initial = graphHistory([{ id: 'a', label: 'A' }], [])
    expect(runGraphDepthFirstSearch(depthFirstSearchTemplate.replace('stack.pop()', 'stack.shift()'), initial, 'graph-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax' } })
    expect(runGraphDepthFirstSearch(depthFirstSearchTemplate.replace('"A"', '"Z"'), initial, 'graph-board')).toMatchObject({ ok: false, error: { code: 'unsupported_input', line: 1 } })
    expect(runSmartScript(depthFirstSearchTemplate, initial, 'graph-board').ok).toBe(true)
    const ambiguous = graphHistory([{ id: 'a', label: 'A' }, { id: 'b', label: 'A' }], [])
    expect(runGraphDepthFirstSearch(depthFirstSearchTemplate, ambiguous, 'graph-board')).toMatchObject({ ok: false, error: { code: 'ambiguous_mapping', line: 1 } })
    expect(runGraphDepthFirstSearch(`${depthFirstSearchTemplate}\nunsafe();`, initial, 'graph-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax', line: 16 } })
  })

  it('accepts start labels containing replacement-token sequences', () => {
    const label = "$&$'$`"
    const initial = graphHistory([{ id: 'special', label }], [])
    const source = depthFirstSearchTemplate.replace('"A"', () => JSON.stringify(label))
    const result = runGraphDepthFirstSearch(source, initial, 'graph-board')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events[0]?.inspection?.value).toBe(label)
  })
})

describe('Smart Script binary-tree traversal', () => {
  function treeHistory(): HistoryState {
    const tree = {
      id: 'tree-board', type: 'binary-tree' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, rootId: 'root', highlightedNodeIds: [],
      nodes: [
        { id: 'root', value: 'M', leftId: 'left', rightId: 'right', position: { x: 100, y: 0 } },
        { id: 'left', value: 8, leftId: 'left-right', rightId: null, position: { x: 0, y: 100 } },
        { id: 'right', value: 'Z', leftId: null, rightId: null, position: { x: 200, y: 100 } },
        { id: 'left-right', value: 3, leftId: null, rightId: null, position: { x: 50, y: 200 } },
      ],
    }
    const result = dispatch({ initialDocument: createEmptyBoard('tree-script-test'), entries: [], cursor: 0 }, { type: 'object/add', object: tree })
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }

  it.each([
    [preorderTraversalTemplate, ['M', 8, 3, 'Z'], 3, ['root', 'left', 'left-right', 'right']],
    [inorderTraversalTemplate, [3, 8, 'M', 'Z'], 4, ['left-right', 'left', 'root', 'right']],
    [postorderTraversalTemplate, [3, 8, 'Z', 'M'], 5, ['left-right', 'left', 'right', 'root']],
  ])('visits nodes in expected order', (source, expected, visitLine, expectedIds) => {
    const result = runTreeTraversal(source, treeHistory(), 'tree-board')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events.map((event) => event.inspection?.value)).toEqual(expected)
    expect(result.value.events.map((event) => event.line)).toEqual(Array(4).fill(visitLine))
    expect(result.value.events.map((event) => event.variables.visitedCount)).toEqual([1, 2, 3, 4])
    expect(stateAt(result.value.history, result.value.history.cursor)).toMatchObject({ ok: true, value: { objects: [expect.objectContaining({ highlightedNodeIds: expectedIds })] } })
    const previous = undo(result.value.history)
    expect(stateAt(previous, previous.cursor)).toMatchObject({ ok: true, value: { objects: [expect.objectContaining({ highlightedNodeIds: expectedIds.slice(0, -1) })] } })
    const restored = redo(previous)
    expect(stateAt(restored, restored.cursor)).toMatchObject({ ok: true, value: { objects: [expect.objectContaining({ highlightedNodeIds: expectedIds })] } })
  })

  it('completes on empty tree and rejects edited templates', () => {
    const empty = dispatch({ initialDocument: createEmptyBoard('tree-script-empty'), entries: [], cursor: 0 }, { type: 'object/add', object: {
      id: 'tree-board', type: 'binary-tree', typeVersion: 1, position: { x: 0, y: 0 }, rootId: null, nodes: [], highlightedNodeIds: [],
    } })
    if (!empty.ok) throw new Error(empty.error.message)
    expect(runTreeTraversal(inorderTraversalTemplate, empty.value, 'tree-board')).toMatchObject({ ok: true, value: { events: [] } })
    expect(runTreeTraversal(inorderTraversalTemplate.replace('inorder(node.left)', 'inorder(node.right)'), treeHistory(), 'tree-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax', line: 3 } })
    expect(runTreeTraversal(`${inorderTraversalTemplate}\nunsafe();`, treeHistory(), 'tree-board')).toMatchObject({ ok: false, error: { code: 'unsupported_syntax', line: 8 } })
  })

  it('dispatches tree templates through the shared script runner', () => {
    expect(runSmartScript(inorderTraversalTemplate, treeHistory(), 'tree-board').ok).toBe(true)
  })
})
