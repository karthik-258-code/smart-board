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
