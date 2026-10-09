import { useState } from 'react'
import { listAlgorithmExamples } from '../examples/catalog'

const examples = listAlgorithmExamples()

export function ExamplePicker({ onLoad }: { onLoad: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(examples[0]?.id ?? '')
  return <div className="example-picker">
    <label className="field-control">Start with example
      <select aria-label="Algorithm example" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        {examples.map((example) => <option key={example.id} value={example.id}>{example.title} — {example.description}</option>)}
      </select>
    </label>
    <button type="button" disabled={!selectedId} onClick={() => onLoad(selectedId)}>Load example</button>
  </div>
}
