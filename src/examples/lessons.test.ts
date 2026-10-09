import { describe, expect, it } from 'vitest'
import { getLesson, listLessons } from './lessons'
import { buildExampleHistory } from './catalog'

describe('guided lessons', () => {
  it('provides ordered lessons whose steps all reference valid examples', () => {
    const lessons = listLessons()
    expect(lessons.map((lesson) => lesson.id)).toEqual(['array-foundations', 'windows-and-dp', 'graph-search'])
    for (const lesson of lessons) {
      expect(lesson.steps.length).toBeGreaterThan(0)
      for (const step of lesson.steps) {
        expect(step.objective.trim()).not.toBe('')
        expect(buildExampleHistory(step.exampleId).ok).toBe(true)
      }
    }
  })

  it('returns lesson steps by ID and rejects unknown lessons', () => {
    expect(getLesson('graph-search')?.steps.map((step) => step.exampleId)).toEqual(['breadth-first-search', 'depth-first-search'])
    expect(getLesson('missing')).toBeUndefined()
  })
})
