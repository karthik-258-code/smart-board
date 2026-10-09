import { describe, expect, it } from 'vitest'
import { objectRegistry, validateBoard } from './objectRegistry'

describe('object registry', () => {
  it('registers the supported object types', () => {
    expect(Object.keys(objectRegistry).sort()).toEqual(['array', 'checkpoint', 'container', 'graph', 'linked-list', 'note', 'pointer', 'range', 'shape', 'stroke', 'table'])
  })

  it('rejects an unsupported object type version', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'note-1', type: 'note', typeVersion: 2, position: { x: 0, y: 0 }, text: 'Old data' }],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'unsupported_object_version' } })
  })

  it('rejects malformed object data without coercion', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'array-1', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: '1,2', highlightedIndices: [] }],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'invalid_object' } })
  })

  it('rejects unknown object fields instead of silently dropping them', () => {
    const board = {
      id: 'board-1',
      schemaVersion: 1,
      objects: [{ id: 'note-1', type: 'note', typeVersion: 1, position: { x: 0, y: 0 }, text: 'Known', futureData: { value: 3 } }],
    }

    expect(validateBoard(board)).toMatchObject({ ok: false, error: { code: 'unknown_field' } })
  })
})
