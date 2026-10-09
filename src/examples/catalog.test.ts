import { describe, expect, it } from 'vitest'
import { listAlgorithmExamples, buildExampleHistory } from './catalog'
import { stateAt } from '../domain/history'

describe('algorithm examples', () => {
  it('provides validated, replayable examples for the initial catalog', () => {
    const examples = listAlgorithmExamples()
    expect(examples.map((example) => example.id)).toEqual(['array-traversal', 'binary-search', 'sliding-window', 'fibonacci-dp'])
    for (const example of examples) {
      const result = buildExampleHistory(example.id)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.value.entries.length).toBeGreaterThan(0)
      expect(result.value.cursor).toBe(0)
      expect(stateAt(result.value, result.value.entries.length).ok).toBe(true)
    }
  })

  it('uses comparisons for binary search and dependencies for DP', () => {
    const search = buildExampleHistory('binary-search')
    const fibonacci = buildExampleHistory('fibonacci-dp')
    expect(search.ok && search.value.entries.some((entry) => entry.operation.type === 'array/compare-values')).toBe(true)
    expect(fibonacci.ok && fibonacci.value.entries.some((entry) => entry.operation.type === 'table/add-dependency')).toBe(true)
  })

  it('reports unknown example IDs', () => {
    expect(buildExampleHistory('missing')).toMatchObject({ ok: false, error: { code: 'missing_example' } })
  })
})
