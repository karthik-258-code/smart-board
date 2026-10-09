import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from './model'
import { validateBoard } from './objectRegistry'

describe('board document', () => {
  it('creates an empty version 1 board', () => {
    expect(createEmptyBoard('board-1')).toEqual({
      id: 'board-1',
      schemaVersion: 1,
      objects: [],
    })
  })

  it('accepts each supported object and valid cross-object references', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [
        { id: 'note-1', type: 'note', typeVersion: 1, position: { x: 20, y: 30 }, text: 'Window' },
        { id: 'shape-1', type: 'shape', typeVersion: 1, position: { x: 10, y: 20 }, shapeKind: 'rectangle', width: 80, height: 40 },
        { id: 'array-1', type: 'array', typeVersion: 1, position: { x: 100, y: 100 }, values: [2, 5, 8], highlightedIndices: [1] },
        { id: 'left', type: 'pointer', typeVersion: 1, position: { x: 100, y: 60 }, name: 'l', targetObjectId: 'array-1', index: 0 },
        { id: 'range-1', type: 'range', typeVersion: 1, position: { x: 100, y: 140 }, name: 'window', targetObjectId: 'array-1', start: 0, endExclusive: 2 },
      ],
    }

    expect(validateBoard(board)).toEqual({ ok: true, value: board })
  })

  it('accepts an empty array with no highlighted indices', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'array-1', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [], highlightedIndices: [] }],
    }

    expect(validateBoard(board)).toEqual({ ok: true, value: board })
  })

  it('accepts a stroke with finite local points and fixed ink color', () => {
    const stroke = { id: 'stroke-1', type: 'stroke', typeVersion: 1, position: { x: 10, y: 20 }, points: [{ x: 0, y: 0 }, { x: 5, y: 8 }], color: 'ink' }
    expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [stroke] })).toMatchObject({ ok: true })
    for (const invalid of [
      { ...stroke, points: [{ x: 0, y: 0 }] },
      { ...stroke, points: [{ x: Number.NaN, y: 0 }, { x: 2, y: 3 }] },
      { ...stroke, color: 'red' },
    ]) expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [invalid] })).toMatchObject({ ok: false })
  })

  it('accepts checkpoints and rejects malformed prompt data', () => {
    const checkpoint = { id: 'check-1', type: 'checkpoint', typeVersion: 1, position: { x: 0, y: 0 }, prompt: 'What comes next?', answer: '8', hint: 'Double 4.' }
    expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [checkpoint] })).toMatchObject({ ok: true })
    expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [{ ...checkpoint, answer: 4 }] })).toMatchObject({ ok: false })
  })

  it('accepts a table with empty cells, labels, highlights, and dependencies', () => {
    const table = { id: 'dp', type: 'table', typeVersion: 1, position: { x: 0, y: 0 }, rowLabels: ['0', '1'], columnLabels: ['0', '1'], cells: [[null, 1], ['', 3]], highlightedCells: [{ row: 1, column: 1 }], dependencies: [{ from: { row: 0, column: 1 }, to: { row: 1, column: 1 } }] }
    expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [table] })).toMatchObject({ ok: true, value: { objects: [table] } })
  })

  it('rejects table cells, highlights, and dependencies outside table dimensions', () => {
    const table = { id: 'dp', type: 'table', typeVersion: 1, position: { x: 0, y: 0 }, rowLabels: ['0'], columnLabels: ['0'], cells: [[null]], highlightedCells: [], dependencies: [] }
    for (const invalid of [
      { ...table, cells: [[null, 1]] },
      { ...table, highlightedCells: [{ row: 1, column: 0 }] },
      { ...table, dependencies: [{ from: { row: 0, column: 0 }, to: { row: 1, column: 0 } }] },
      { ...table, dependencies: [{ from: { row: 0, column: 0 }, to: { row: 0, column: 0 } }] },
    ]) expect(validateBoard({ id: 'board-1', schemaVersion: 1, objects: [invalid] })).toMatchObject({ ok: false })
  })

  it('rejects duplicate object IDs', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [
        { id: 'same', type: 'note', typeVersion: 1, position: { x: 0, y: 0 }, text: 'One' },
        { id: 'same', type: 'shape', typeVersion: 1, position: { x: 0, y: 0 }, shapeKind: 'rectangle', width: 20, height: 20 },
      ],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'duplicate_object_id' } })
  })

  it('rejects unsupported document versions', () => {
    expect(validateBoard({ id: 'board-1', schemaVersion: 2, objects: [] })).toMatchObject({
      ok: false,
      error: { code: 'unsupported_schema_version' },
    })
  })

  it('rejects inherited object type names safely', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'object-1', type: 'constructor', typeVersion: 1, position: { x: 0, y: 0 } }],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'unsupported_object_type' } })
  })

  it('rejects invalid array highlight indices', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'array-1', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [], highlightedIndices: [0] }],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'invalid_highlight_index' } })
  })

  it('rejects pointers that reference non-arrays', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [
        { id: 'note-1', type: 'note', typeVersion: 1, position: { x: 0, y: 0 }, text: 'Note' },
        { id: 'pointer-1', type: 'pointer', typeVersion: 1, position: { x: 0, y: 0 }, name: 'i', targetObjectId: 'note-1', index: 0 },
      ],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'invalid_reference' } })
  })

  it('rejects ranges outside their target array', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [
        { id: 'array-1', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [4, 9], highlightedIndices: [] },
        { id: 'range-1', type: 'range', typeVersion: 1, position: { x: 0, y: 0 }, name: 'r', targetObjectId: 'array-1', start: 1, endExclusive: 3 },
      ],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'invalid_range' } })
  })
})
