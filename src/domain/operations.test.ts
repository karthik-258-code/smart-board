import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { applyOperation, evaluateArrayComparison, type BoardOperation } from './operations'

const array: BoardObject = {
  id: 'array-1', type: 'array', typeVersion: 1, position: { x: 1, y: 2 },
  values: [10, 20, 30], highlightedIndices: [],
}
const table: BoardObject = {
  id: 'table-1', type: 'table', typeVersion: 1, position: { x: 0, y: 0 },
  rowLabels: ['0', '1'], columnLabels: ['0', '1'], cells: [[null, null], [null, null]], highlightedCells: [], dependencies: [],
}
const checkpoint: BoardObject = { id: 'check-1', type: 'checkpoint', typeVersion: 1, position: { x: 0, y: 0 }, prompt: 'Next?', answer: '5', hint: 'Count up.' }
const stack: BoardObject = { id: 'stack-1', type: 'container', typeVersion: 1, position: { x: 0, y: 0 }, kind: 'stack', values: [3, 8] }
const queue: BoardObject = { id: 'queue-1', type: 'container', typeVersion: 1, position: { x: 0, y: 0 }, kind: 'queue', values: [3, 8] }

function board(objects: BoardObject[] = [array]): BoardDocument {
  return { id: 'board-1', schemaVersion: 1, objects }
}

describe('applyOperation', () => {
  const cases: Array<{ name: string; document: BoardDocument; operation: BoardOperation; expected: BoardObject[] }> = [
    { name: 'add object', document: board(), operation: { type: 'object/add', object: { id: 'n', type: 'note', typeVersion: 1, position: { x: 3, y: 4 }, text: 'hi' } }, expected: [array, { id: 'n', type: 'note', typeVersion: 1, position: { x: 3, y: 4 }, text: 'hi' }] },
    { name: 'remove object', document: board(), operation: { type: 'object/remove', objectId: 'array-1' }, expected: [] },
    { name: 'update position', document: board(), operation: { type: 'object/update-position', objectId: 'array-1', position: { x: 8, y: 9 } }, expected: [{ ...array, position: { x: 8, y: 9 } }] },
    { name: 'update note text', document: board([{ id: 'n', type: 'note', typeVersion: 1, position: { x: 0, y: 0 }, text: 'old' }]), operation: { type: 'note/update-text', objectId: 'n', text: 'new' }, expected: [{ id: 'n', type: 'note', typeVersion: 1, position: { x: 0, y: 0 }, text: 'new' }] },
    { name: 'set array value', document: board(), operation: { type: 'array/set-value', objectId: 'array-1', index: 1, value: 25 }, expected: [{ ...array, values: [10, 25, 30] }] },
    { name: 'set highlights', document: board(), operation: { type: 'array/set-highlight', objectId: 'array-1', indices: [0, 2] }, expected: [{ ...array, highlightedIndices: [0, 2] }] },
    { name: 'move pointer', document: board([{ ...array }, { id: 'p', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'array-1', index: 0 }]), operation: { type: 'pointer/move', objectId: 'p', index: 2 }, expected: [{ ...array }, { id: 'p', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'array-1', index: 2 }] },
    { name: 'set range', document: board([{ ...array }, { id: 'r', type: 'range', typeVersion: 1, position: { x: 0, y: 0 }, name: 'window', targetObjectId: 'array-1', start: 0, endExclusive: 1 }]), operation: { type: 'range/set', objectId: 'r', start: 1, endExclusive: 3 }, expected: [{ ...array }, { id: 'r', type: 'range', typeVersion: 1, position: { x: 0, y: 0 }, name: 'window', targetObjectId: 'array-1', start: 1, endExclusive: 3 }] },
    { name: 'set table cell', document: board([table]), operation: { type: 'table/set-cell', objectId: 'table-1', coordinate: { row: 1, column: 0 }, value: 7 }, expected: [{ ...table, cells: [[null, null], [7, null]] }] },
    { name: 'highlight table cells', document: board([table]), operation: { type: 'table/set-highlighted-cells', objectId: 'table-1', coordinates: [{ row: 0, column: 1 }] }, expected: [{ ...table, highlightedCells: [{ row: 0, column: 1 }] }] },
    { name: 'add table dependency', document: board([table]), operation: { type: 'table/add-dependency', objectId: 'table-1', dependency: { from: { row: 0, column: 0 }, to: { row: 1, column: 1 } } }, expected: [{ ...table, dependencies: [{ from: { row: 0, column: 0 }, to: { row: 1, column: 1 } }] }] },
    { name: 'update checkpoint', document: board([checkpoint]), operation: { type: 'checkpoint/update', objectId: 'check-1', prompt: 'What next?', answer: '6', hint: 'Add one.' }, expected: [{ ...checkpoint, prompt: 'What next?', answer: '6', hint: 'Add one.' }] },
    { name: 'push onto stack', document: board([stack]), operation: { type: 'container/push', objectId: 'stack-1', value: 7 }, expected: [{ ...stack, values: [3, 8, 7] }] },
    { name: 'pop from stack top', document: board([stack]), operation: { type: 'container/remove', objectId: 'stack-1' }, expected: [{ ...stack, values: [3] }] },
    { name: 'dequeue from queue front', document: board([queue]), operation: { type: 'container/remove', objectId: 'queue-1' }, expected: [{ ...queue, values: [8] }] },
  ]

  it.each(cases)('applies and inverses $name', ({ document, operation, expected }) => {
    const result = applyOperation(document, operation)
    expect(result).toMatchObject({ ok: true, value: { document: { objects: expected } } })
    if (result.ok) {
      const undone = applyOperation(result.value.document, result.value.inverse)
      expect(undone).toMatchObject({ ok: true, value: { document } })
    }
  })

  it.each([
    { type: 'object/remove', objectId: 'missing' },
    { type: 'object/update-position', objectId: 'missing', position: { x: 0, y: 0 } },
    { type: 'note/update-text', objectId: 'missing', text: 'x' },
  ] as BoardOperation[])('rejects missing objects atomically: %o', (operation) => {
    const document = board()
    expect(applyOperation(document, operation)).toMatchObject({ ok: false })
    expect(document).toEqual(board())
  })

  it('rejects duplicate IDs and invalid add objects atomically', () => {
    const document = board()
    expect(applyOperation(document, { type: 'object/add', object: array })).toMatchObject({ ok: false, error: { code: 'duplicate_object_id' } })
    expect(applyOperation(document, { type: 'object/add', object: { ...array, values: [NaN] } as BoardObject })).toMatchObject({ ok: false })
    expect(document).toEqual(board())
  })

  it('rejects bad indices, highlights, and incompatible targets atomically', () => {
    const document = board()
    for (const operation of [
      { type: 'array/set-value', objectId: 'array-1', index: 3, value: 4 },
      { type: 'array/set-highlight', objectId: 'array-1', indices: [-1] },
      { type: 'pointer/move', objectId: 'array-1', index: 0 },
      { type: 'range/set', objectId: 'array-1', start: 0, endExclusive: 1 },
      { type: 'array/set-value', objectId: 'array-1', index: 0, value: Number.NaN },
    ] as BoardOperation[]) {
      expect(applyOperation(document, operation)).toMatchObject({ ok: false })
      expect(document).toEqual(board())
    }
  })

  it('rejects invalid table coordinates and duplicate dependencies atomically', () => {
    const document = board([table])
    const edge = { from: { row: 0, column: 0 }, to: { row: 1, column: 1 } }
    for (const operation of [
      { type: 'table/set-cell', objectId: 'table-1', coordinate: { row: 2, column: 0 }, value: 4 },
      { type: 'table/set-highlighted-cells', objectId: 'table-1', coordinates: [{ row: 4, column: 0 }] },
      { type: 'table/add-dependency', objectId: 'table-1', dependency: { from: { row: 1, column: 1 }, to: { row: 1, column: 1 } } },
    ] as BoardOperation[]) {
      expect(applyOperation(document, operation)).toMatchObject({ ok: false })
      expect(document).toEqual(board([table]))
    }
    const added = applyOperation(document, { type: 'table/add-dependency', objectId: 'table-1', dependency: edge })
    if (!added.ok) throw new Error('Expected valid dependency to add')
    expect(applyOperation(added.value.document, { type: 'table/add-dependency', objectId: 'table-1', dependency: edge })).toMatchObject({ ok: false, error: { code: 'duplicate_dependency' } })
  })

  it('rejects empty removals, full pushes, and invalid container values atomically', () => {
    const emptyStack: BoardObject = { ...stack, values: [] }
    const fullQueue: BoardObject = { ...queue, values: Array.from({ length: 20 }, (_, index) => index) }
    for (const [document, operation] of [
      [board([emptyStack]), { type: 'container/remove', objectId: 'stack-1' }],
      [board([fullQueue]), { type: 'container/push', objectId: 'queue-1', value: 20 }],
      [board([stack]), { type: 'container/push', objectId: 'stack-1', value: Number.NaN }],
    ] as Array<[BoardDocument, BoardOperation]>) {
      const original = structuredClone(document)
      expect(applyOperation(document, operation)).toMatchObject({ ok: false })
      expect(document).toEqual(original)
    }
  })

  it('sets a pointer name and returns the prior name as its inverse', () => {
    const document = board([
      array,
      { id: 'p', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'array-1', index: 0 },
    ])
    const operation = { type: 'pointer/set-name', objectId: 'p', name: 'left' } as unknown as BoardOperation
    const result = applyOperation(document, operation)

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [array, { id: 'p', name: 'left' }] }, inverse: { type: 'pointer/set-name', objectId: 'p', name: 'i' } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('sets and inverses the visible current item in a stack or queue', () => {
    const document = board([stack])
    const operation = { type: 'container/set-current-index', objectId: 'stack-1', index: 1 } as unknown as BoardOperation
    const result = applyOperation(document, operation)

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ id: 'stack-1', currentIndex: 1 }] }, inverse: { type: 'container/set-current-index', objectId: 'stack-1' } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('keeps a queue highlight aligned after dequeue and restores it on undo', () => {
    const document = board([{ ...queue, currentIndex: 1 }])
    const result = applyOperation(document, { type: 'container/remove', objectId: 'queue-1' })

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ values: [8], currentIndex: 0 }] }, inverse: { type: 'container/restore-state', values: [3, 8], currentIndex: 1 } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('rejects a current item index outside the container', () => {
    expect(applyOperation(board([stack]), { type: 'container/set-current-index', objectId: 'stack-1', index: 2 } as BoardOperation))
      .toMatchObject({ ok: false, error: { code: 'invalid_index' } })
  })

  it('inserts at the end and shifts highlighted indices, pointers, and ranges', () => {
    const document = board([
      { ...array, highlightedIndices: [1] },
      { id: 'p', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'array-1', index: 2 },
      { id: 'r', type: 'range', typeVersion: 1, position: { x: 0, y: 0 }, name: 'window', targetObjectId: 'array-1', start: 1, endExclusive: 3 },
    ])
    const result = applyOperation(document, { type: 'array/insert-value', objectId: 'array-1', index: 3, value: 40 })

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [
      { id: 'array-1', values: [10, 20, 30, 40], highlightedIndices: [1] },
      { id: 'p', index: 2 },
      { id: 'r', start: 1, endExclusive: 3 },
    ] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('removes an index and restores exact marker state on undo, including an empty array', () => {
    const document = board([
      { id: 'array-1', type: 'array', typeVersion: 1, position: { x: 1, y: 2 }, values: [10], highlightedIndices: [0] },
      { id: 'p', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'array-1', index: 0 },
      { id: 'r', type: 'range', typeVersion: 1, position: { x: 0, y: 0 }, name: 'window', targetObjectId: 'array-1', start: 0, endExclusive: 1 },
    ])
    const result = applyOperation(document, { type: 'array/remove-value', objectId: 'array-1', index: 0 })

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [
      { id: 'array-1', values: [], highlightedIndices: [] },
      { id: 'p', index: 0 },
      { id: 'r', start: 0, endExclusive: 0 },
    ] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('compares numeric values, highlights both indices, and restores prior highlights on undo', () => {
    const document = board([{ ...array, highlightedIndices: [2] }])
    const result = applyOperation(document, { type: 'array/compare-values', objectId: 'array-1', firstIndex: 0, secondIndex: 1, operator: '<' })

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ id: 'array-1', highlightedIndices: [0, 1] }] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('swaps array values as one reversible operation', () => {
    const document = board()
    const result = applyOperation(document, { type: 'array/swap-values', objectId: 'array-1', firstIndex: 0, secondIndex: 2 })

    expect(result).toMatchObject({ ok: true, value: { document: { objects: [{ id: 'array-1', values: [30, 20, 10] }] } } })
    if (result.ok) expect(applyOperation(result.value.document, result.value.inverse)).toMatchObject({ ok: true, value: { document } })
  })

  it('rejects ordering text values and invalid compare indices', () => {
    const document = board([{ ...array, values: ['left', 'right'] }])
    expect(applyOperation(document, { type: 'array/compare-values', objectId: 'array-1', firstIndex: 0, secondIndex: 1, operator: '<' })).toMatchObject({ ok: false, error: { code: 'incompatible_values' } })
    expect(applyOperation(document, { type: 'array/compare-values', objectId: 'array-1', firstIndex: 0, secondIndex: 2, operator: '=' })).toMatchObject({ ok: false, error: { code: 'invalid_index' } })
  })

  it('uses strict equality for mixed numeric and text values', () => {
    const document = board([{ ...array, values: [4, '4'] }])
    const result = applyOperation(document, { type: 'array/compare-values', objectId: 'array-1', firstIndex: 0, secondIndex: 1, operator: '=' })
    expect(result).toMatchObject({ ok: true })
    if (result.ok) expect(evaluateArrayComparison(document.objects[0].type === 'array' ? document.objects[0].values : [], { firstIndex: 0, secondIndex: 1, operator: '=' })).toEqual({ ok: true, value: false })
  })
})
