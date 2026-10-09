import { buildExampleHistory } from './catalog'
import type { HistoryState } from '../domain/history'

export type ExampleCodeTrace = { exampleId: string; language: 'TypeScript'; lines: string[]; operationLines: number[] }

const traces: ExampleCodeTrace[] = [
  { exampleId: 'array-traversal', language: 'TypeScript', lines: ['for (let i = 0; i < values.length; i++) {', '  visit(values[i]);', '}'], operationLines: [2, 1, 2, 1, 2, 1, 2] },
  { exampleId: 'binary-search', language: 'TypeScript', lines: ['let low = 0, high = values.length - 1;', 'while (low <= high) {', '  const mid = Math.floor((low + high) / 2);', '  if (values[mid] < target) low = mid + 1;', '  else if (values[mid] > target) high = mid - 1;', '  else return mid;', '}'], operationLines: [3, 4, 4, 4, 3, 6] },
  { exampleId: 'sliding-window', language: 'TypeScript', lines: ['let left = 0;', 'for (let right = 0; right < values.length; right++) {', '  add(values[right]);', '  while (windowIsTooLarge()) {', '    remove(values[left]);', '    left++;', '  }', '}'], operationLines: [3, 2, 3, 5, 6, 5, 3, 2, 3] },
  { exampleId: 'fibonacci-dp', language: 'TypeScript', lines: ['dp[0] = 0;', 'dp[1] = 1;', 'for (let n = 2; n <= limit; n++) {', '  dp[n] = dp[n - 1] + dp[n - 2];', '}'], operationLines: [4, 4, 4, 4, 4, 4, 4, 4] },
  { exampleId: 'breadth-first-search', language: 'TypeScript', lines: ['const queue = [start];', 'while (queue.length) {', '  const vertex = queue.shift()!;', '  for (const neighbor of neighbors(vertex)) visit(neighbor);', '}'], operationLines: [1, 4, 4, 4] },
  { exampleId: 'depth-first-search', language: 'TypeScript', lines: ['function visit(vertex: Vertex) {', '  markVisited(vertex);', '  for (const neighbor of neighbors(vertex)) {', '    if (!visited(neighbor)) visit(neighbor);', '  }', '}'], operationLines: [2, 4, 4, 4] },
]

export function getCodeTrace(exampleId: string): ExampleCodeTrace | undefined {
  return traces.find((trace) => trace.exampleId === exampleId)
}

export function getCodeLineForCursor(trace: ExampleCodeTrace, cursor: number): number | undefined {
  if (!Number.isInteger(cursor) || cursor <= 0 || cursor > trace.operationLines.length) return undefined
  return trace.operationLines[cursor - 1]
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

export function getCodeTraceForHistory(history: HistoryState): { trace: ExampleCodeTrace; currentLine?: number } | undefined {
  const trace = getCodeTrace(history.initialDocument.id)
  const example = buildExampleHistory(history.initialDocument.id)
  if (!trace || !example.ok || history.cursor > trace.operationLines.length) return undefined
  const matches = history.entries.slice(0, history.cursor).every((entry, index) =>
    stableStringify(entry.operation) === stableStringify(example.value.entries[index]?.operation),
  )
  if (!matches) return undefined
  return { trace, currentLine: getCodeLineForCursor(trace, history.cursor) }
}
