import { useState } from 'react'
import type { BoardObject, LinkedListObject } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import type { TableObject } from '../domain/model'

export type ComparisonSummary = {
  arrayId: string
  firstValue: string | number
  secondValue: string | number
  operator: '<' | '=' | '>'
  result: boolean
}

function parseArrayValue(raw: string): string | number {
  return raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw
}

let fallbackNodeId = 0
function createNodeId() {
  return globalThis.crypto?.randomUUID?.() ?? `list-node-${++fallbackNodeId}`
}

function LinkedListControls({ object, onOperation }: { object: LinkedListObject; onOperation: (operation: BoardOperation) => void }) {
  const [value, setValue] = useState('')
  const [anchor, setAnchor] = useState(object.nodes[0]?.id ?? '')
  const parsed = parseArrayValue(value)
  const insert = (afterId: string | null) => {
    onOperation({ type: 'linked-list/insert', objectId: object.id, afterId, nodeId: createNodeId(), value: parsed })
    setValue('')
  }
  return <div className="array-controls linked-list-controls">
    <p className="inspector-value">Singly linked list · {object.nodes.length} of 20 nodes</p>
    <label className="field-control">Node value
      <input aria-label="Linked list value" value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
    <div className="linked-list-actions">
      <button type="button" disabled={object.nodes.length >= 20} onClick={() => insert(object.nodes.at(-1)?.id ?? null)}>Append node</button>
      <button type="button" disabled={object.nodes.length >= 20} onClick={() => insert(null)}>Prepend node</button>
      <button type="button" disabled={object.nodes.length >= 20 || !anchor} onClick={() => insert(anchor)}>Insert after selected</button>
    </div>
    <label className="field-control">Insert after
      <select aria-label="Linked list insertion anchor" value={anchor} onChange={(event) => setAnchor(event.target.value)}>
        {object.nodes.map((node, index) => <option key={node.id} value={node.id}>{index}: {String(node.value)}</option>)}
      </select>
    </label>
    <button type="button" disabled={object.nodes.length < 2} onClick={() => onOperation({ type: 'linked-list/reverse', objectId: object.id })}>Reverse linked list</button>
    {object.nodes.map((node, index) => <div className="linked-list-inspector-row" key={node.id}>
      <span>{index}: {String(node.value)} → {node.nextId ? object.nodes.findIndex((item) => item.id === node.nextId) : 'NULL'}</span>
      <button type="button" aria-label={`Remove node ${index}`} onClick={() => onOperation({ type: 'linked-list/remove', objectId: object.id, nodeId: node.id })}>Remove</button>
    </div>)}
  </div>
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length
}

function ArrayControls({ object, onOperation, comparison }: { object: Extract<BoardObject, { type: 'array' }>; onOperation: (operation: BoardOperation) => void; comparison: ComparisonSummary | null }) {
  const [insertIndex, setInsertIndex] = useState(String(object.values.length))
  const [insertValue, setInsertValue] = useState('')
  const index = Number(insertIndex)
  const canInsert = insertIndex.trim() !== '' && Number.isInteger(index) && index >= 0 && index <= object.values.length
  const [compareFirst, setCompareFirst] = useState('0')
  const [compareSecond, setCompareSecond] = useState(String(Math.min(1, Math.max(0, object.values.length - 1))))
  const [comparisonOperator, setComparisonOperator] = useState<'<' | '=' | '>'>('=')
  const [swapFirst, setSwapFirst] = useState('0')
  const [swapSecond, setSwapSecond] = useState(String(Math.max(0, object.values.length - 1)))
  const [assignmentIndex, setAssignmentIndex] = useState('0')
  const [assignedValue, setAssignedValue] = useState('')
  const firstComparisonIndex = Number(compareFirst)
  const secondComparisonIndex = Number(compareSecond)
  const comparisonIndicesValid = compareFirst.trim() !== '' && compareSecond.trim() !== ''
    && isValidIndex(firstComparisonIndex, object.values.length) && isValidIndex(secondComparisonIndex, object.values.length)
  const comparisonTypesValid = comparisonOperator === '=' || (
    typeof object.values[firstComparisonIndex] === 'number' && typeof object.values[secondComparisonIndex] === 'number'
  )
  const swapFirstIndex = Number(swapFirst)
  const swapSecondIndex = Number(swapSecond)
  const swapIndicesValid = swapFirst.trim() !== '' && swapSecond.trim() !== ''
    && isValidIndex(swapFirstIndex, object.values.length) && isValidIndex(swapSecondIndex, object.values.length)
  const assignmentTargetIndex = Number(assignmentIndex)
  const assignmentIndexValid = assignmentIndex.trim() !== '' && isValidIndex(assignmentTargetIndex, object.values.length)

  function insertValueAtIndex() {
    if (!canInsert) return
    onOperation({ type: 'array/insert-value', objectId: object.id, index, value: parseArrayValue(insertValue) })
    setInsertIndex(String(index + 1))
    setInsertValue('')
  }

  return (
    <div className="array-controls">
      <p className="inspector-value">{object.values.length ? 'Edit values and mark the indexes in focus.' : 'Empty array. Add a value to begin stepping through it.'}</p>
      <label className="field-control">Value to insert
        <input aria-label="Value to insert" type="text" value={insertValue} onChange={(event) => setInsertValue(event.target.value)} />
      </label>
      <label className="field-control">Insert at index
        <input aria-label="Insert at index" type="number" min="0" max={object.values.length} value={insertIndex} onChange={(event) => setInsertIndex(event.target.value)} />
      </label>
      <button type="button" disabled={!canInsert} onClick={insertValueAtIndex}>Insert value</button>
      <div className="array-action-group">
        <h3>Compare</h3>
        <div className="array-index-pair">
          <label className="field-control">First index
            <input aria-label="Compare first index" type="number" min="0" max={Math.max(0, object.values.length - 1)} value={compareFirst} onChange={(event) => setCompareFirst(event.target.value)} />
          </label>
          <label className="field-control">Second index
            <input aria-label="Compare second index" type="number" min="0" max={Math.max(0, object.values.length - 1)} value={compareSecond} onChange={(event) => setCompareSecond(event.target.value)} />
          </label>
        </div>
        <label className="field-control">Comparison operator
          <select aria-label="Comparison operator" value={comparisonOperator} onChange={(event) => setComparisonOperator(event.target.value as '<' | '=' | '>')}>
            <option value="=">=</option>
            <option value="<">&lt;</option>
            <option value=">">&gt;</option>
          </select>
        </label>
        <button type="button" disabled={!comparisonIndicesValid || !comparisonTypesValid} onClick={() => onOperation({
          type: 'array/compare-values', objectId: object.id, firstIndex: firstComparisonIndex, secondIndex: secondComparisonIndex, operator: comparisonOperator,
        })}>Compare values</button>
        {comparison?.arrayId === object.id && (
          <p className="comparison-result" role="status">
            Comparison: {comparison.firstValue} {comparison.operator} {comparison.secondValue} → {String(comparison.result)}
          </p>
        )}
      </div>
      <div className="array-action-group">
        <h3>Swap</h3>
        <div className="array-index-pair">
          <label className="field-control">First index
            <input aria-label="Swap first index" type="number" min="0" max={Math.max(0, object.values.length - 1)} value={swapFirst} onChange={(event) => setSwapFirst(event.target.value)} />
          </label>
          <label className="field-control">Second index
            <input aria-label="Swap second index" type="number" min="0" max={Math.max(0, object.values.length - 1)} value={swapSecond} onChange={(event) => setSwapSecond(event.target.value)} />
          </label>
        </div>
        <button type="button" disabled={!swapIndicesValid} onClick={() => onOperation({
          type: 'array/swap-values', objectId: object.id, firstIndex: swapFirstIndex, secondIndex: swapSecondIndex,
        })}>Swap values</button>
      </div>
      <div className="array-action-group">
        <h3>Assign</h3>
        <label className="field-control">Assign index
          <input aria-label="Assign index" type="number" min="0" max={Math.max(0, object.values.length - 1)} value={assignmentIndex} onChange={(event) => setAssignmentIndex(event.target.value)} />
        </label>
        <label className="field-control">Assigned value
          <input aria-label="Assigned value" type="text" value={assignedValue} onChange={(event) => setAssignedValue(event.target.value)} />
        </label>
        <button type="button" disabled={!assignmentIndexValid} onClick={() => {
          onOperation({ type: 'array/set-value', objectId: object.id, index: assignmentTargetIndex, value: parseArrayValue(assignedValue) })
          setAssignedValue('')
        }}>Assign value</button>
      </div>
      {object.values.map((value, index) => (
        <div className="array-control-row" key={index}>
          <label className="field-control">Array value at index {index}
            <input type="text" aria-label={`Array value at index ${index}`} value={String(value)} onChange={(event) => onOperation({ type: 'array/set-value', objectId: object.id, index, value: parseArrayValue(event.target.value) })} />
          </label>
          <div className="array-row-actions">
            <label className="highlight-toggle">
              <input
                type="checkbox"
                aria-label={`Highlight index ${index} (${value})`}
                checked={object.highlightedIndices.includes(index)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...object.highlightedIndices, index]
                    : object.highlightedIndices.filter((item) => item !== index)
                  onOperation({ type: 'array/set-highlight', objectId: object.id, indices: next })
                }}
              />
              Highlight
            </label>
            <button className="array-remove-button" type="button" aria-label={`Remove index ${index}`} onClick={() => onOperation({ type: 'array/remove-value', objectId: object.id, index })}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TableControls({ object, onOperation }: { object: TableObject; onOperation: (operation: BoardOperation) => void }) {
  const [row, setRow] = useState('0')
  const [column, setColumn] = useState('0')
  const [targetRow, setTargetRow] = useState('1')
  const [targetColumn, setTargetColumn] = useState('1')
  const coordinate = { row: Number(row), column: Number(column) }
  const currentValue = object.cells[coordinate.row]?.[coordinate.column] ?? null
  const highlighted = object.highlightedCells.some((cell) => cell.row === coordinate.row && cell.column === coordinate.column)
  const source = { row: Number(row), column: Number(column) }
  const target = { row: Number(targetRow), column: Number(targetColumn) }
  const hasDependency = object.dependencies.some((edge) => edge.from.row === source.row && edge.from.column === source.column && edge.to.row === target.row && edge.to.column === target.column)
  const rowOptions = object.rowLabels.map((label, index) => <option key={index} value={index}>{label}</option>)
  const columnOptions = object.columnLabels.map((label, index) => <option key={index} value={index}>{label}</option>)
  const parseValue = (raw: string): string | number => raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw

  return <div className="array-controls">
    <p className="inspector-value">Fill cells in order. Draw dependencies to explain each recurrence.</p>
    <div className="array-index-pair">
      <label className="field-control">Row
        <select aria-label="Table row" value={row} onChange={(event) => setRow(event.target.value)}>{rowOptions}</select>
      </label>
      <label className="field-control">Column
        <select aria-label="Table column" value={column} onChange={(event) => setColumn(event.target.value)}>{columnOptions}</select>
      </label>
    </div>
    <label className="field-control">Cell value
      <input aria-label="Cell value" value={currentValue === null ? '' : String(currentValue)} onChange={(event) => onOperation({ type: 'table/set-cell', objectId: object.id, coordinate, value: parseValue(event.target.value) })} />
    </label>
    <button type="button" disabled={currentValue === null} onClick={() => onOperation({ type: 'table/set-cell', objectId: object.id, coordinate, value: null })}>Clear cell</button>
    <label className="highlight-toggle"><input type="checkbox" aria-label="Highlight selected table cell" checked={highlighted} onChange={(event) => {
      const coordinates = event.target.checked
        ? [...object.highlightedCells, coordinate]
        : object.highlightedCells.filter((cell) => cell.row !== coordinate.row || cell.column !== coordinate.column)
      onOperation({ type: 'table/set-highlighted-cells', objectId: object.id, coordinates })
    }} />Highlight cell</label>
    <div className="array-action-group">
      <h3>Dependency</h3>
      <label className="field-control">Target row<select aria-label="Dependency target row" value={targetRow} onChange={(event) => setTargetRow(event.target.value)}>{rowOptions}</select></label>
      <label className="field-control">Target column<select aria-label="Dependency target column" value={targetColumn} onChange={(event) => setTargetColumn(event.target.value)}>{columnOptions}</select></label>
      <button type="button" disabled={hasDependency || (source.row === target.row && source.column === target.column)} onClick={() => onOperation({ type: 'table/add-dependency', objectId: object.id, dependency: { from: source, to: target } })}>Add dependency</button>
      {object.dependencies.map((edge, index) => <button className="array-remove-button" key={`${edge.from.row}-${edge.from.column}-${edge.to.row}-${edge.to.column}-${index}`} type="button" aria-label={`Remove dependency ${edge.from.row},${edge.from.column} to ${edge.to.row},${edge.to.column}`} onClick={() => onOperation({ type: 'table/remove-dependency', objectId: object.id, dependency: edge })}>Remove {edge.from.row},{edge.from.column} to {edge.to.row},{edge.to.column}</button>)}
    </div>
  </div>
}

function ContainerControls({ object, onOperation }: { object: Extract<BoardObject, { type: 'container' }>; onOperation: (operation: BoardOperation) => void }) {
  const [value, setValue] = useState('')
  const actionName = object.kind === 'stack' ? 'Push' : 'Enqueue'
  const removeName = object.kind === 'stack' ? 'Pop' : 'Dequeue'
  const parsed = value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value
  return <div className="array-controls">
    <p className="inspector-value">{object.kind === 'stack' ? 'Last in, first out.' : 'First in, first out.'} {object.values.length} of 20 values.</p>
    <label className="field-control">Value
      <input aria-label={`${object.kind} value`} value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
    <button type="button" disabled={object.values.length >= 20} onClick={() => {
      onOperation({ type: 'container/push', objectId: object.id, value: parsed })
      setValue('')
    }}>{actionName}</button>
    <button type="button" disabled={object.values.length === 0} onClick={() => onOperation({ type: 'container/remove', objectId: object.id })}>{removeName}</button>
  </div>
}

export function BoardInspector({
  object,
  onOperation,
  onDuplicate,
  onRemove,
  comparison,
  onPractice,
}: {
  object: BoardObject | null
  onOperation: (operation: BoardOperation) => void
  onDuplicate: (object: BoardObject) => void
  onRemove: (objectId: string) => void
  comparison: ComparisonSummary | null
  onPractice: (objectId: string) => void
}) {
  return (
    <aside className="board-inspector" role="complementary" aria-label="Object inspector" aria-live="polite">
      <div className="inspector-heading">
        <h2>Inspector</h2>
        {object && <span className="object-kind">{object.type}</span>}
      </div>
      {!object ? <p className="inspector-empty">Select a board object to inspect it.</p> : (
        <div className="inspector-fields">
          {object.type === 'note' && (
            <label className="field-control">Note text
              <textarea aria-label="Note text" value={object.text} onChange={(event) => onOperation({ type: 'note/update-text', objectId: object.id, text: event.target.value })} rows={4} />
            </label>
          )}
          {object.type === 'array' && (
            <ArrayControls key={object.id} object={object} onOperation={onOperation} comparison={comparison} />
          )}
          {object.type === 'table' && <TableControls key={object.id} object={object} onOperation={onOperation} />}
          {object.type === 'checkpoint' && <div className="array-controls">
            <label className="field-control">Practice prompt
              <textarea aria-label="Practice prompt" rows={3} value={object.prompt} onChange={(event) => onOperation({ type: 'checkpoint/update', objectId: object.id, prompt: event.target.value, answer: object.answer, hint: object.hint })} />
            </label>
            <label className="field-control">Expected answer
              <input aria-label="Expected answer" value={object.answer} onChange={(event) => onOperation({ type: 'checkpoint/update', objectId: object.id, prompt: object.prompt, answer: event.target.value, hint: object.hint })} />
            </label>
            <label className="field-control">Hint
              <textarea aria-label="Practice hint" rows={2} value={object.hint} onChange={(event) => onOperation({ type: 'checkpoint/update', objectId: object.id, prompt: object.prompt, answer: object.answer, hint: event.target.value })} />
            </label>
            <button type="button" disabled={!object.prompt.trim()} onClick={() => onPractice(object.id)}>Practice checkpoint</button>
          </div>}
          {object.type === 'container' && <ContainerControls key={object.id} object={object} onOperation={onOperation} />}
          {object.type === 'linked-list' && <LinkedListControls key={object.id} object={object} onOperation={onOperation} />}
          {object.type === 'pointer' && (
            <>
              <label className="field-control">Pointer name
                <input aria-label="Pointer name" type="text" value={object.name} onChange={(event) => onOperation({ type: 'pointer/set-name', objectId: object.id, name: event.target.value })} />
              </label>
              <label className="field-control">Pointer index
                <input aria-label="Pointer index" type="number" value={object.index} onChange={(event) => {
                  const index = Number(event.target.value)
                  if (Number.isInteger(index)) onOperation({ type: 'pointer/move', objectId: object.id, index })
                }} />
              </label>
            </>
          )}
          {object.type === 'range' && (
            <div className="position-fields">
              <label className="field-control">Range start
                <input aria-label="Range start" type="number" value={object.start} onChange={(event) => {
                  const start = Number(event.target.value)
                  if (Number.isInteger(start)) onOperation({ type: 'range/set', objectId: object.id, start, endExclusive: object.endExclusive })
                }} />
              </label>
              <label className="field-control">Range end
                <input aria-label="Range end" type="number" value={object.endExclusive} onChange={(event) => {
                  const endExclusive = Number(event.target.value)
                  if (Number.isInteger(endExclusive)) onOperation({ type: 'range/set', objectId: object.id, start: object.start, endExclusive })
                }} />
              </label>
            </div>
          )}
          {object.type === 'shape' && <p className="inspector-value">{object.width} × {object.height}</p>}
          <div className="position-fields">
            <label className="field-control">Position X
              <input aria-label="Position X" type="number" value={object.position.x} onChange={(event) => {
                const x = Number(event.target.value)
                if (Number.isFinite(x)) onOperation({ type: 'object/update-position', objectId: object.id, position: { ...object.position, x } })
              }} />
            </label>
            <label className="field-control">Position Y
              <input aria-label="Position Y" type="number" value={object.position.y} onChange={(event) => {
                const y = Number(event.target.value)
                if (Number.isFinite(y)) onOperation({ type: 'object/update-position', objectId: object.id, position: { ...object.position, y } })
              }} />
            </label>
          </div>
          <div className="inspector-actions">
            <button type="button" onClick={() => onDuplicate(object)}>Duplicate</button>
            <button className="danger-action" type="button" onClick={() => onRemove(object.id)}>Remove</button>
          </div>
        </div>
      )}
    </aside>
  )
}
