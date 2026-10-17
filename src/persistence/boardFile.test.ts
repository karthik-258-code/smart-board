import { describe, expect, it } from 'vitest'
import { parseBoardFile, serializeBoardFile } from './boardFile'
import { createEmptyBoard } from '../domain/model'
import { dispatch, undo, type HistoryState } from '../domain/history'

describe('board file format', () => {
  it('round-trips all supported objects in readable JSON', () => {
    const document = {
      id: 'shareable', schemaVersion: 1 as const, objects: [
        { id: 'n', type: 'note' as const, typeVersion: 1 as const, position: { x: 4, y: 5 }, text: 'Example' },
        { id: 't', type: 'table' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, rowLabels: ['0'], columnLabels: ['0'], cells: [[2]], highlightedCells: [], dependencies: [] },
      ],
    }
    const serialized = serializeBoardFile(document)
    expect(serialized.ok && serialized.value).toContain('\n  "format"')
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: { initialDocument: document, entries: [], cursor: 0 } })
  })

  it('round-trips an empty board', () => {
    const serialized = serializeBoardFile(createEmptyBoard('empty'))
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: { initialDocument: createEmptyBoard('empty'), entries: [], cursor: 0 } })
  })

  it('round-trips a reversible timeline and its cursor', () => {
    let history: HistoryState = { initialDocument: createEmptyBoard('timeline'), entries: [], cursor: 0 }
    const one = dispatch(history, { type: 'object/add', object: { id: 'n', type: 'note', typeVersion: 1, position: { x: 1, y: 2 }, text: 'One' } })
    if (!one.ok) throw new Error(one.error.message)
    const two = dispatch(one.value, { type: 'note/update-text', objectId: 'n', text: 'Two' })
    if (!two.ok) throw new Error(two.error.message)
    history = undo(two.value)
    const serialized = serializeBoardFile(history)
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: history })
  })

  it('round-trips script source mappings and runtime variables with a shared board', () => {
    let history: HistoryState = { initialDocument: createEmptyBoard('script-share'), entries: [], cursor: 0 }
    const added = dispatch(history, { type: 'object/add', object: { id: 'a', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [7], highlightedIndices: [] } })
    if (!added.ok) throw new Error(added.error.message)
    const highlighted = dispatch(added.value, { type: 'array/set-highlight', objectId: 'a', indices: [0] })
    if (!highlighted.ok) throw new Error(highlighted.error.message)
    history = { ...highlighted.value, execution: { kind: 'smart-script', source: 'highlight(i);', arrayId: 'a', events: [{ cursor: 2, line: 1, variables: { i: 0 } }] } }

    const serialized = serializeBoardFile(history)
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: history })
  })

  it('round-trips graph traversal highlights and inspected node snapshots', () => {
    let history: HistoryState = { initialDocument: createEmptyBoard('graph-script-share'), entries: [], cursor: 0 }
    const added = dispatch(history, { type: 'object/add', object: {
      id: 'g', type: 'graph', typeVersion: 1, position: { x: 0, y: 0 },
      nodes: [{ id: 'a', label: 'A', position: { x: 10, y: 10 } }], edges: [], highlightedNodeIds: [],
    } })
    if (!added.ok) throw new Error(added.error.message)
    const highlighted = dispatch(added.value, { type: 'graph/set-highlighted', objectId: 'g', nodeIds: ['a'] })
    if (!highlighted.ok) throw new Error(highlighted.error.message)
    const source = 'let start = "A";\nlet queue = [start];\nlet visited = [start];\nwhile (queue.length > 0) {\n  let current = queue.shift();\n  highlight(current);\n  for (let neighbor of graph.neighbors(current)) {\n    if (!visited.includes(neighbor)) {\n      visited.push(neighbor);\n      queue.push(neighbor);\n    }\n  }\n}'
    history = { ...highlighted.value, execution: { kind: 'smart-script', source, arrayId: 'g', events: [{ cursor: 2, line: 6, variables: { visitedCount: 1, queueLength: 0 }, inspection: { index: 0, value: 'A' } }] } }

    const serialized = serializeBoardFile(history)
    expect(parseBoardFile(serialized.ok ? serialized.value : '')).toEqual({ ok: true, value: history })
  })

  it.each([
    ['invalid_json', '{bad'],
    ['unsupported_schema_version', '{"id":"x","schemaVersion":2,"objects":[]}'],
    ['unsupported_object_type', '{"id":"x","schemaVersion":1,"objects":[{"id":"x","type":"mystery"}]}'],
  ])('rejects invalid source with %s', (code, source) => {
    expect(parseBoardFile(source)).toMatchObject({ ok: false, error: { code } })
  })

  it('rejects tampered history operations', () => {
    const file = JSON.stringify({ format: 'smart-board-history', formatVersion: 1, history: { initialDocument: createEmptyBoard('bad'), entries: [{ operation: { type: 'object/remove', objectId: 'missing' }, inverse: { type: 'object/add', object: {} } }], cursor: 0 } })
    expect(parseBoardFile(file)).toMatchObject({ ok: false, error: { code: 'invalid_history' } })
  })
})
