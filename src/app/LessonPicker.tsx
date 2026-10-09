import { useState } from 'react'
import { listLessons } from '../examples/lessons'

export function LessonPicker({ onLoad }: { onLoad: (exampleId: string) => void }) {
  const lessons = listLessons()
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '')
  const [stepIndex, setStepIndex] = useState(0)
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]
  const step = lesson?.steps[stepIndex]
  if (!lesson || !step) return null

  function selectLesson(id: string) {
    setLessonId(id)
    setStepIndex(0)
  }

  return <section className="lesson-picker" aria-label="Guided lessons">
    <label className="field-control">Guided lesson
      <select aria-label="Guided lesson" value={lesson.id} onChange={(event) => selectLesson(event.target.value)}>
        {lessons.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.description}</option>)}
      </select>
    </label>
    <div className="lesson-step-header">
      <strong>{step.title}</strong>
      <span>Lesson {stepIndex + 1} of {lesson.steps.length}</span>
    </div>
    <p>{step.objective}</p>
    <div className="lesson-step-controls">
      <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)}>Previous lesson step</button>
      <button type="button" disabled={stepIndex === lesson.steps.length - 1} onClick={() => setStepIndex((index) => index + 1)}>Next lesson step</button>
      <button type="button" onClick={() => onLoad(step.exampleId)}>Load lesson step</button>
    </div>
  </section>
}
