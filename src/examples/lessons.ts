export type LessonStep = { id: string; title: string; objective: string; exampleId: string }
export type Lesson = { id: string; title: string; description: string; steps: LessonStep[] }

const lessons: Lesson[] = [
  {
    id: 'array-foundations', title: 'Array foundations', description: 'Move from a simple scan to a logarithmic search.',
    steps: [
      { id: 'visit', title: 'Visit values', objective: 'Follow pointer i and highlight one array value at a time.', exampleId: 'array-traversal' },
      { id: 'search', title: 'Narrow the search', objective: 'Compare the midpoint and shrink the candidate interval.', exampleId: 'binary-search' },
    ],
  },
  {
    id: 'windows-and-dp', title: 'Windows and dynamic programming', description: 'Track a moving interval, then build a recurrence table.',
    steps: [
      { id: 'window', title: 'Slide a window', objective: 'Watch the half-open range move across consecutive values.', exampleId: 'sliding-window' },
      { id: 'recurrence', title: 'Fill a DP table', objective: 'Connect each Fibonacci result to the values it depends on.', exampleId: 'fibonacci-dp' },
    ],
  },
  {
    id: 'graph-search', title: 'Graph search', description: 'Compare breadth-first and depth-first exploration.',
    steps: [
      { id: 'bfs', title: 'Breadth first', objective: 'Visit the nearest unvisited vertices before moving deeper.', exampleId: 'breadth-first-search' },
      { id: 'dfs', title: 'Depth first', objective: 'Follow one path deeply, then backtrack to the next branch.', exampleId: 'depth-first-search' },
    ],
  },
]

export function listLessons(): Lesson[] {
  return lessons.map((lesson) => ({ ...lesson, steps: lesson.steps.map((step) => ({ ...step })) }))
}

export function getLesson(id: string): Lesson | undefined {
  const lesson = lessons.find((item) => item.id === id)
  return lesson ? { ...lesson, steps: lesson.steps.map((step) => ({ ...step })) } : undefined
}
