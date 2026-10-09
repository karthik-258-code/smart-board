import { describe, expect, it } from 'vitest'
import { buildExampleHistory, listAlgorithmExamples } from './catalog'
import { getCodeLineForCursor, getCodeTrace, getCodeTraceForHistory } from './codeTraces'
import type { BoardOperation } from '../domain/operations'

describe('example source traces', () => {
  it('maps every example history operation to a valid source line', () => {
    for (const example of listAlgorithmExamples()) {
      const history = buildExampleHistory(example.id)
      const trace = getCodeTrace(example.id)
      expect(history.ok && trace).toBeTruthy()
      if (!history.ok || !trace) continue
      expect(trace.operationLines).toHaveLength(history.value.entries.length)
      expect(trace.operationLines.every((line) => Number.isInteger(line) && line >= 1 && line <= trace.lines.length)).toBe(true)
    }
  })

  it('resolves cursor lines and leaves initial or unmapped states unhighlighted', () => {
    const trace = getCodeTrace('breadth-first-search')!
    expect(getCodeLineForCursor(trace, 0)).toBeUndefined()
    expect(getCodeLineForCursor(trace, 1)).toBe(trace.operationLines[0])
    expect(getCodeLineForCursor(trace, 99)).toBeUndefined()
    expect(getCodeTrace('custom-board')).toBeUndefined()
  })

  it('hides source mapping when an applied manual edit branches the example history', () => {
    const original = buildExampleHistory('binary-search')
    expect(original.ok).toBe(true)
    if (!original.ok) return
    expect(getCodeTraceForHistory({ ...original.value, cursor: 1 })).toBeDefined()
    const diverged = { ...original.value, cursor: 1, entries: [{ ...original.value.entries[0], operation: { type: 'note/update-text', objectId: 'missing', text: 'manual' } as BoardOperation }, ...original.value.entries.slice(1)] }
    expect(getCodeTraceForHistory(diverged)).toBeUndefined()
  })
})
