import { useState } from 'react'
import type { CheckpointObject } from '../domain/model'

export function PracticeDialog({ checkpoint, onClose }: { checkpoint: CheckpointObject; onClose: () => void }) {
  const [prediction, setPrediction] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  function checkAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!prediction.trim() || !checkpoint.answer.trim()) {
      setFeedback('Enter a prediction and make sure this checkpoint has an expected answer.')
      return
    }
    const normalize = (value: string) => value.trim().toLowerCase()
    setFeedback(normalize(prediction) === normalize(checkpoint.answer) ? 'Correct prediction.' : 'Not quite. Try again or reveal the answer.')
  }

  return <div className="practice-backdrop">
    <section className="practice-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <div className="practice-heading">
        <div><p>Practice checkpoint</p><h2 id="practice-title">Make a prediction</h2></div>
        <button type="button" aria-label="Close practice" onClick={onClose}>Close</button>
      </div>
      <p className="practice-prompt">{checkpoint.prompt}</p>
      <form onSubmit={checkAnswer}>
        <label className="field-control">Your prediction
          <input autoFocus aria-label="Your prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setFeedback('') }} />
        </label>
        <button type="submit">Check answer</button>
      </form>
      {feedback && <p role="status" className="practice-feedback">{feedback}</p>}
      <div className="practice-reveals">
        {!!checkpoint.hint.trim() && <button type="button" onClick={() => setShowHint((value) => !value)}>{showHint ? 'Hide hint' : 'Show hint'}</button>}
        <button type="button" onClick={() => setShowAnswer((value) => !value)}>{showAnswer ? 'Hide answer' : 'Reveal answer'}</button>
      </div>
      {showHint && <p className="practice-reveal" role="status"><strong>Hint:</strong> {checkpoint.hint}</p>}
      {showAnswer && <p className="practice-reveal" role="status"><strong>Answer:</strong> {checkpoint.answer || 'No expected answer is set.'}</p>}
    </section>
  </div>
}
