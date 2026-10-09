import type { BoardDocument } from '../domain/model'
import { dispatch, validateHistory, type HistoryState } from '../domain/history'
import type { BoardOperation } from '../domain/operations'
import type { Result } from '../domain/result'

export type AlgorithmExampleSummary = { id: string; title: string; description: string }
type AlgorithmExample = AlgorithmExampleSummary & { initialDocument: BoardDocument; operations: BoardOperation[] }

const array: BoardDocument['objects'][number] = {
  id: 'example-array', type: 'array', typeVersion: 1, position: { x: 120, y: 190 },
  values: [2, 4, 6, 8], highlightedIndices: [],
}

const examples: AlgorithmExample[] = [
  {
    id: 'array-traversal', title: 'Array traversal', description: 'Advance an index pointer and visit each value in order.',
    initialDocument: { id: 'array-traversal', schemaVersion: 1, objects: [
      { ...array },
      { id: 'example-pointer', type: 'pointer', typeVersion: 1, position: { x: 120, y: 150 }, name: 'i', targetObjectId: 'example-array', index: 0 },
      { id: 'example-note', type: 'note', typeVersion: 1, position: { x: 120, y: 70 }, text: 'Visit each value once.' },
    ] },
    operations: [
      { type: 'array/set-highlight', objectId: 'example-array', indices: [0] },
      { type: 'pointer/move', objectId: 'example-pointer', index: 1 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [1] },
      { type: 'pointer/move', objectId: 'example-pointer', index: 2 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [2] },
      { type: 'pointer/move', objectId: 'example-pointer', index: 3 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [3] },
    ],
  },
  {
    id: 'binary-search', title: 'Binary search', description: 'Compare a midpoint, shrink the search interval, and find 11.',
    initialDocument: { id: 'binary-search', schemaVersion: 1, objects: [
      { id: 'example-array', type: 'array', typeVersion: 1, position: { x: 120, y: 210 }, values: [1, 3, 5, 7, 9, 11, 13, 15], highlightedIndices: [] },
      { id: 'example-low', type: 'pointer', typeVersion: 1, position: { x: 120, y: 170 }, name: 'low', targetObjectId: 'example-array', index: 0 },
      { id: 'example-high', type: 'pointer', typeVersion: 1, position: { x: 120, y: 160 }, name: 'high', targetObjectId: 'example-array', index: 7 },
      { id: 'example-mid', type: 'pointer', typeVersion: 1, position: { x: 120, y: 140 }, name: 'mid', targetObjectId: 'example-array', index: 3 },
      { id: 'example-range', type: 'range', typeVersion: 1, position: { x: 120, y: 300 }, name: 'candidates', targetObjectId: 'example-array', start: 0, endExclusive: 8 },
      { id: 'example-note', type: 'note', typeVersion: 1, position: { x: 120, y: 70 }, text: 'Find target 11.' },
    ] },
    operations: [
      { type: 'array/set-highlight', objectId: 'example-array', indices: [3] },
      { type: 'array/compare-values', objectId: 'example-array', firstIndex: 3, secondIndex: 5, operator: '<' },
      { type: 'pointer/move', objectId: 'example-low', index: 4 },
      { type: 'range/set', objectId: 'example-range', start: 4, endExclusive: 8 },
      { type: 'pointer/move', objectId: 'example-mid', index: 5 },
      { type: 'array/compare-values', objectId: 'example-array', firstIndex: 5, secondIndex: 5, operator: '=' },
    ],
  },
  {
    id: 'sliding-window', title: 'Sliding window', description: 'Expand and slide a half-open range across values.',
    initialDocument: { id: 'sliding-window', schemaVersion: 1, objects: [
      { id: 'example-array', type: 'array', typeVersion: 1, position: { x: 120, y: 210 }, values: [2, 1, 3, 2, 4, 3], highlightedIndices: [0, 1, 2] },
      { id: 'example-left', type: 'pointer', typeVersion: 1, position: { x: 120, y: 170 }, name: 'left', targetObjectId: 'example-array', index: 0 },
      { id: 'example-right', type: 'pointer', typeVersion: 1, position: { x: 120, y: 160 }, name: 'right', targetObjectId: 'example-array', index: 2 },
      { id: 'example-range', type: 'range', typeVersion: 1, position: { x: 120, y: 300 }, name: 'window', targetObjectId: 'example-array', start: 0, endExclusive: 3 },
      { id: 'example-note', type: 'note', typeVersion: 1, position: { x: 120, y: 70 }, text: 'Window uses [left, right).' },
    ] },
    operations: [
      { type: 'pointer/move', objectId: 'example-right', index: 3 },
      { type: 'range/set', objectId: 'example-range', start: 0, endExclusive: 4 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [0, 1, 2, 3] },
      { type: 'pointer/move', objectId: 'example-left', index: 1 },
      { type: 'range/set', objectId: 'example-range', start: 1, endExclusive: 4 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [1, 2, 3] },
      { type: 'pointer/move', objectId: 'example-right', index: 4 },
      { type: 'range/set', objectId: 'example-range', start: 1, endExclusive: 5 },
      { type: 'array/set-highlight', objectId: 'example-array', indices: [1, 2, 3, 4] },
    ],
  },
  {
    id: 'fibonacci-dp', title: 'Fibonacci DP', description: 'Fill values and connect each result to its recurrence inputs.',
    initialDocument: { id: 'fibonacci-dp', schemaVersion: 1, objects: [
      { id: 'example-table', type: 'table', typeVersion: 1, position: { x: 120, y: 120 }, rowLabels: ['n', 'F(n)'], columnLabels: ['0', '1', '2', '3', '4'], cells: [['n', 'n+1', 'n+2', 'n+3', 'n+4'], [0, 1, null, null, null]], highlightedCells: [], dependencies: [] },
      { id: 'example-note', type: 'note', typeVersion: 1, position: { x: 500, y: 120 }, text: 'F(n) = F(n−1) + F(n−2)' },
    ] },
    operations: [
      { type: 'table/set-cell', objectId: 'example-table', coordinate: { row: 1, column: 2 }, value: 1 },
      { type: 'table/add-dependency', objectId: 'example-table', dependency: { from: { row: 1, column: 0 }, to: { row: 1, column: 2 } } },
      { type: 'table/add-dependency', objectId: 'example-table', dependency: { from: { row: 1, column: 1 }, to: { row: 1, column: 2 } } },
      { type: 'table/set-highlighted-cells', objectId: 'example-table', coordinates: [{ row: 1, column: 2 }] },
      { type: 'table/set-cell', objectId: 'example-table', coordinate: { row: 1, column: 3 }, value: 2 },
      { type: 'table/add-dependency', objectId: 'example-table', dependency: { from: { row: 1, column: 1 }, to: { row: 1, column: 3 } } },
      { type: 'table/add-dependency', objectId: 'example-table', dependency: { from: { row: 1, column: 2 }, to: { row: 1, column: 3 } } },
      { type: 'table/set-highlighted-cells', objectId: 'example-table', coordinates: [{ row: 1, column: 3 }] },
    ],
  },
]

export function listAlgorithmExamples(): AlgorithmExampleSummary[] {
  return examples.map(({ id, title, description }) => ({ id, title, description }))
}

export function buildExampleHistory(id: string): Result<HistoryState, { code: string; message: string }> {
  const example = examples.find((item) => item.id === id)
  if (!example) return { ok: false, error: { code: 'missing_example', message: 'This example does not exist.' } }
  let history: HistoryState = { initialDocument: example.initialDocument, entries: [], cursor: 0 }
  for (const operation of example.operations) {
    const result = dispatch(history, operation)
    if (!result.ok) return { ok: false, error: { code: 'invalid_example', message: `${example.title} could not load: ${result.error.message}` } }
    history = result.value
  }
  return validateHistory({ ...history, cursor: 0 })
}
