import type { BoardObject } from '../domain/model'
import { ArrayRenderer } from './objectRenderers/ArrayRenderer'
import { NoteRenderer } from './objectRenderers/NoteRenderer'
import { PointerRenderer } from './objectRenderers/PointerRenderer'
import { RangeRenderer } from './objectRenderers/RangeRenderer'
import { ShapeRenderer } from './objectRenderers/ShapeRenderer'

function labelFor(object: BoardObject): string {
  switch (object.type) {
    case 'note': return `Note: ${object.text || 'New note'}`
    case 'shape': return 'Rectangle'
    case 'array': return `Array: ${object.values.join(', ')}`
    case 'pointer': return `Pointer ${object.name}, index ${object.index}`
    case 'range': return `Range ${object.name}, ${object.start} to ${object.endExclusive}`
  }
}

export function ObjectRenderer({
  object,
  objects,
  selected,
  onSelect,
}: {
  object: BoardObject
  objects: BoardObject[]
  selected: boolean
  onSelect: (id: string) => void
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
      className={`board-object${selected ? ' is-selected' : ''}`}
      transform={`translate(${object.position.x} ${object.position.y})`}
      role="button"
      tabIndex={0}
      aria-label={labelFor(object)}
      aria-pressed={selected}
      data-object-id={object.id}
      onClick={() => onSelect(object.id)}
      onKeyDown={handleKeyDown}
    >
      {object.type === 'note' && <NoteRenderer object={object} />}
      {object.type === 'shape' && <ShapeRenderer object={object} />}
      {object.type === 'array' && <ArrayRenderer object={object} />}
      {object.type === 'pointer' && <PointerRenderer object={object} target={target?.type === 'array' ? target : undefined} />}
      {object.type === 'range' && <RangeRenderer object={object} target={target?.type === 'array' ? target : undefined} />}
    </g>
  )
}
