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
          {object.type === 'array' && <p className="inspector-value">Values: {object.values.join(', ') || 'Empty array'}</p>}
          {object.type === 'pointer' && <p className="inspector-value">Points to index {object.index}</p>}
          {object.type === 'range' && <p className="inspector-value">Covers indexes {object.start}–{object.endExclusive}</p>}
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
