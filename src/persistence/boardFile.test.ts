import { describe, expect, it } from 'vitest'
import { parseBoardFile, serializeBoardFile } from './boardFile'
import { createEmptyBoard } from '../domain/model'

describe('board file format', () => {
  it('round-trips all supported objects in readable JSON', () => {
    const document = {
      id: 'shareable', schemaVersion: 1 as const, objects: [
        { id: 'n', type: 'note' as const, typeVersion: 1 as const, position: { x: 4, y: 5 }, text: 'Example' },
        { id: 't', type: 'table' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, rowLabels: ['0'], columnLabels: ['0'], cells: [[2]], highlightedCells: [], dependencies: [] },
      ],
    }
    const serialized = serializeBoardFile(document)
    expect(serialized.ok && serialized.value).toContain('\n  "id"')
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: document })
  })

  it('round-trips an empty board', () => {
    const serialized = serializeBoardFile(createEmptyBoard('empty'))
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: createEmptyBoard('empty') })
  })

  it.each([
    ['invalid_json', '{bad'],
    ['unsupported_schema_version', '{"id":"x","schemaVersion":2,"objects":[]}'],
    ['unsupported_object_type', '{"id":"x","schemaVersion":1,"objects":[{"id":"x","type":"mystery"}]}'],
  ])('rejects invalid source with %s', (code, source) => {
    expect(parseBoardFile(source)).toMatchObject({ ok: false, error: { code } })
  })
})
