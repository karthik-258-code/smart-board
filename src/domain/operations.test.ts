import { describe, expect, it } from 'vitest'
import type { BoardDocument, BoardObject } from './model'
import { applyOperation, evaluateArrayComparison, type BoardOperation } from './operations'

const array: BoardObject = {
  id: 'array-1', type: 'array', typeVersion: 1, position: { x: 1, y: 2 },
  values: [10, 20, 30], highlightedIndices: [],
}

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
