import { useEffect, useState } from 'react'
import type { ArrayObject, ContainerObject, GraphObject, LinkedListObject } from '../domain/model'
import { binarySearchTemplate, breadthFirstSearchTemplate } from '../execution/smartScript'

export type SmartScriptView = { source: string; arrayId: string; events: Array<{ cursor: number; line: number; variables: Record<string, number>; inspection?: { index: number; value: string | number } }> }

const starterScript = 'for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}'

export function SmartScriptPanel({
  arrays,
  containers,
  linkedLists,
  graphs,
  cursor,
  execution,
  onRun,
}: {
  arrays: ArrayObject[]
  containers: ContainerObject[]
  linkedLists: LinkedListObject[]
  graphs: GraphObject[]
  cursor: number
  execution: SmartScriptView | null
  onRun: (source: string, arrayId: string) => void
}) {
  const [source, setSource] = useState(execution?.source ?? starterScript)
  const [arrayId, setArrayId] = useState(execution?.arrayId ?? arrays[0]?.id ?? containers[0]?.id ?? linkedLists[0]?.id ?? graphs[0]?.id ?? '')
  useEffect(() => {
    if (!execution) return
    setSource(execution.source)
    setArrayId(execution.arrayId)
  }, [execution])
  const hasSelectedTarget = arrays.some((array) => array.id === arrayId) || containers.some((container) => container.id === arrayId) || linkedLists.some((list) => list.id === arrayId) || graphs.some((graph) => graph.id === arrayId)
  const selectedArrayId = hasSelectedTarget ? arrayId : arrays[0]?.id ?? containers[0]?.id ?? linkedLists[0]?.id ?? graphs[0]?.id ?? ''
  const selectedContainer = containers.find((container) => container.id === selectedArrayId)
  const selectedLinkedList = linkedLists.find((list) => list.id === selectedArrayId)
  const selectedGraph = graphs.find((graph) => graph.id === selectedArrayId)
  const currentEvent = execution?.events.find((event) => event.cursor === cursor)
  const traceSource = execution?.source ?? source
  const binarySearchMode = /^\s*let\s+target\s*=/.test(traceSource)
  const graphTraversalMode = /^\s*let\s+start\s*=\s*["']/.test(traceSource)
  const lines = traceSource.split('\n')
  const status = currentEvent ? `Line ${currentEvent.line}` : execution ? 'Execution complete' : 'Ready to run'

  return <section className="code-trace-panel smart-script-panel" role="region" aria-label="Smart Script runner">
    <div className="code-trace-heading">
      <div><h2>Smart Script</h2><span>Safe subset · {binarySearchMode ? 'binary search' : graphTraversalMode ? 'graph breadth-first search' : selectedGraph ? 'graph traversal' : selectedContainer ? `${selectedContainer.kind} traversal` : selectedLinkedList ? 'linked list traversal' : 'array traversal'}</span></div>
      <span className="code-trace-status">{status}</span>
    </div>
    <div className="smart-script-controls">
      <label className="field-control">Structure to visualize
        <select aria-label="Structure to visualize" value={selectedArrayId} disabled={arrays.length + containers.length + linkedLists.length + graphs.length === 0} onChange={(event) => setArrayId(event.target.value)}>
          {arrays.length + containers.length + linkedLists.length + graphs.length === 0 ? <option value="">Add a supported structure first</option> : <>
            {arrays.map((array) => <option key={array.id} value={array.id}>Array: {array.values.join(', ') || 'empty'}</option>)}
            {containers.map((container) => <option key={container.id} value={container.id}>{container.kind === 'stack' ? 'Stack' : 'Queue'}: {container.values.join(', ') || 'empty'}</option>)}
            {linkedLists.map((list) => <option key={list.id} value={list.id}>Linked list: {list.nodes.map((node) => String(node.value)).join(' → ') || 'empty'}</option>)}
            {graphs.map((graph) => <option key={graph.id} value={graph.id}>Graph: {graph.nodes.length} vertices · {graph.edges.length} edges</option>)}
          </>}
        </select>
      </label>
      <button type="button" className="template-control" disabled={Boolean(selectedContainer || selectedLinkedList || selectedGraph)} onClick={() => setSource(binarySearchTemplate)}>Use binary search template</button>
      <button type="button" className="template-control" disabled={!selectedGraph} onClick={() => setSource(breadthFirstSearchTemplate)}>Use breadth-first search template</button>
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
      {currentEvent?.inspection && <code>Inspecting index {currentEvent.inspection.index} · value {currentEvent.inspection.value}</code>}
    </div>
    <p className="smart-script-help">Supported: array, stack, queue, and linked-list traversal with numeric accumulators, arithmetic expressions, compound <code>&amp;&amp;</code> / <code>||</code> conditions, nested <code>if/else</code>, <code>break</code>, and <code>continue</code>; binary search for arrays; or breadth-first graph search. Graph search changes only its start label. Other code is rejected; scripts are never evaluated as JavaScript.</p>
  </section>
}
