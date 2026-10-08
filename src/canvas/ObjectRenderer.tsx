import type { BoardObject, PointerObject, RangeObject } from '../domain/model'
import { ArrayRenderer } from './objectRenderers/ArrayRenderer'
import { NoteRenderer } from './objectRenderers/NoteRenderer'
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

function PointerMark({ object, target }: { object: PointerObject; target: Extract<BoardObject, { type: 'array' }> | undefined }) {
  const targetX = target ? target.position.x + object.index * 64 + 32 : object.position.x + 24
  const targetY = target ? target.position.y - object.position.y : 42
  return (
    <g className="pointer-mark">
      <path d={`M0 12 L${targetX - object.position.x} ${targetY}`} />
      <text x="0" y="0">{object.name}</text>
    </g>
  )
}

function RangeMark({ object, target }: { object: RangeObject; target: Extract<BoardObject, { type: 'array' }> | undefined }) {
  const offsetX = target ? target.position.x - object.position.x : 0
  const offsetY = target ? target.position.y - object.position.y + 88 : 42
  return (
    <g className="range-mark">
      <path d={`M${offsetX + object.start * 64} ${offsetY + 8} v-8 h${Math.max(8, (object.endExclusive - object.start) * 64)} v8`} />
      <text x="0" y="28">{object.name}</text>
    </g>
  )
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
      {object.type === 'pointer' && <PointerMark object={object} target={target?.type === 'array' ? target : undefined} />}
      {object.type === 'range' && <RangeMark object={object} target={target?.type === 'array' ? target : undefined} />}
    </g>
  )
}
