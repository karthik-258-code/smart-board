import { useEffect, useState } from 'react'
import type { ArrayObject } from '../domain/model'
import { binarySearchTemplate } from '../execution/smartScript'

export type SmartScriptView = { source: string; arrayId: string; events: Array<{ cursor: number; line: number; variables: Record<string, number> }> }

const starterScript = 'for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}'

export function SmartScriptPanel({
  arrays,
  cursor,
  execution,
  onRun,
}: {
  arrays: ArrayObject[]
  cursor: number
  execution: SmartScriptView | null
  onRun: (source: string, arrayId: string) => void
}) {
  const [source, setSource] = useState(execution?.source ?? starterScript)
  const [arrayId, setArrayId] = useState(execution?.arrayId ?? arrays[0]?.id ?? '')
  useEffect(() => {
    if (!execution) return
    setSource(execution.source)
    setArrayId(execution.arrayId)
  }, [execution])
  const selectedArrayId = arrays.some((array) => array.id === arrayId) ? arrayId : arrays[0]?.id ?? ''
  const currentEvent = execution?.events.find((event) => event.cursor === cursor)
  const traceSource = execution?.source ?? source
  const binarySearchMode = /^\s*let\s+target\s*=/.test(traceSource)
  const lines = traceSource.split('\n')
  const status = currentEvent ? `Line ${currentEvent.line}` : execution ? 'Execution complete' : 'Ready to run'

  return <section className="code-trace-panel smart-script-panel" role="region" aria-label="Smart Script runner">
    <div className="code-trace-heading">
      <div><h2>Smart Script</h2><span>Safe subset · {binarySearchMode ? 'binary search' : 'array traversal'}</span></div>
      <span className="code-trace-status">{status}</span>
    </div>
    <div className="smart-script-controls">
      <label className="field-control">Array to visualize
        <select aria-label="Array to visualize" value={selectedArrayId} disabled={arrays.length === 0} onChange={(event) => setArrayId(event.target.value)}>
          {arrays.length === 0 ? <option value="">Add an array first</option> : arrays.map((array) => <option key={array.id} value={array.id}>Array: {array.values.join(', ') || 'empty'}</option>)}
        </select>
      </label>
      <button type="button" className="template-control" onClick={() => setSource(binarySearchTemplate)}>Use binary search template</button>
      <button type="button" className="primary-control" disabled={!selectedArrayId} onClick={() => onRun(source, selectedArrayId)}>Run Smart Script</button>
    </div>
    <label className="smart-script-editor-label" htmlFor="smart-script-source">Source</label>
    <textarea id="smart-script-source" aria-label="Smart Script source" className="smart-script-editor" spellCheck={false} value={source} onChange={(event) => setSource(event.target.value)} />
    {execution && <ol className="code-trace-lines" aria-label="Smart Script source lines">
      {lines.map((line, index) => <li className={currentEvent?.line === index + 1 ? 'code-line code-line-current' : 'code-line'} aria-current={currentEvent?.line === index + 1 ? 'step' : undefined} key={index + 1}>
        <span className="code-line-number" aria-hidden="true">{index + 1}</span><code>{line || ' '}</code>
      </li>)}
    </ol>}
    <div className="smart-script-inspection" aria-live="polite">
      <span>Variables</span>
      {currentEvent ? Object.entries(currentEvent.variables).map(([name, value]) => <code key={name}>{name} = {value}</code>) : <span>No runtime snapshot at this step</span>}
    </div>
    <p className="smart-script-help">Supported: array traversal with numeric accumulators, arithmetic expressions, compound <code>&amp;&amp;</code> / <code>||</code> conditions, nested <code>if/else</code>, <code>break</code>, and <code>continue</code>, or the binary-search template. Traversal maps a matching index pointer; binary search maps a <code>mid</code> pointer and a range named <code>search</code>. Other code is rejected; scripts are never evaluated as JavaScript.</p>
  </section>
}
