import type { BoardObject } from '../domain/model'
import { ArrayRenderer } from './objectRenderers/ArrayRenderer'
import { NoteRenderer } from './objectRenderers/NoteRenderer'
import { PointerRenderer } from './objectRenderers/PointerRenderer'
import { RangeRenderer } from './objectRenderers/RangeRenderer'
import { ShapeRenderer } from './objectRenderers/ShapeRenderer'
import { TableRenderer } from './objectRenderers/TableRenderer'
import { StrokeRenderer } from './objectRenderers/StrokeRenderer'

function labelFor(object: BoardObject): string {
  switch (object.type) {
    case 'note': return `Note: ${object.text || 'New note'}`
    case 'shape': return 'Rectangle'
    case 'array': return object.values.length ? `Array: ${object.values.join(', ')}` : 'Array: empty'
    case 'pointer': return `Pointer ${object.name}, index ${object.index}`
    case 'range': return `Range ${object.name}, ${object.start} to ${object.endExclusive}`
    case 'table': return `DP table, ${object.rowLabels.length} rows by ${object.columnLabels.length} columns`
    case 'stroke': return 'Freehand drawing'
  }
}

export function ObjectRenderer({
  object,
  objects,
  selected,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  dragging,
}: {
  object: BoardObject
  objects: BoardObject[]
  selected: boolean
  onSelect: (id: string) => void
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void
  onPointerMove: (event: React.PointerEvent<SVGGElement>) => void
  onPointerUp: (event: React.PointerEvent<SVGGElement>) => void
  dragging: boolean
}) {
  const target = objects.find((item) => item.id === (object.type === 'pointer' || object.type === 'range' ? object.targetObjectId : ''))
  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(object.id)
    }
  }

  return (
    <g
      className={`board-object${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
      transform={`translate(${object.position.x} ${object.position.y})`}
      role="button"
      tabIndex={0}
      aria-label={labelFor(object)}
      aria-pressed={selected}
      data-object-id={object.id}
      onClick={() => onSelect(object.id)}
      onKeyDown={handleKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {object.type === 'note' && <NoteRenderer object={object} />}
      {object.type === 'shape' && <ShapeRenderer object={object} />}
      {object.type === 'array' && <ArrayRenderer object={object} />}
      {object.type === 'pointer' && <PointerRenderer object={object} target={target?.type === 'array' ? target : undefined} />}
      {object.type === 'range' && <RangeRenderer object={object} target={target?.type === 'array' ? target : undefined} />}
      {object.type === 'table' && <TableRenderer object={object} />}
      {object.type === 'stroke' && <StrokeRenderer object={object} />}
    </g>
  )
}
