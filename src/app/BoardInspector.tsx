import type { BoardObject } from '../domain/model'
import type { BoardOperation } from '../domain/operations'

export function BoardInspector({
  object,
  onOperation,
  onDuplicate,
  onRemove,
}: {
  object: BoardObject | null
  onOperation: (operation: BoardOperation) => void
  onDuplicate: (object: BoardObject) => void
  onRemove: (objectId: string) => void
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
            <div className="array-controls">
              <p className="inspector-value">{object.values.length ? 'Edit values and mark the indexes in focus.' : 'Empty array. Add a value to begin stepping through it.'}</p>
              {object.values.map((value, index) => (
                <div className="array-control-row" key={index}>
                  <label className="field-control">Array value at index {index}
                    <input type="text" aria-label={`Array value at index ${index}`} value={String(value)} onChange={(event) => {
                      const raw = event.target.value
                      const numeric = raw.trim() !== '' && Number.isFinite(Number(raw))
                      onOperation({ type: 'array/set-value', objectId: object.id, index, value: numeric ? Number(raw) : raw })
                    }} />
                  </label>
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
                </div>
              ))}
            </div>
          )}
          {object.type === 'pointer' && (
            <label className="field-control">Pointer index
              <input aria-label="Pointer index" type="number" value={object.index} onChange={(event) => {
                const index = Number(event.target.value)
                if (Number.isInteger(index)) onOperation({ type: 'pointer/move', objectId: object.id, index })
              }} />
            </label>
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
