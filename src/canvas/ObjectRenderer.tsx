import type { BoardObject } from '../domain/model'
import { ArrayRenderer } from './objectRenderers/ArrayRenderer'
import { NoteRenderer } from './objectRenderers/NoteRenderer'
import { PointerRenderer } from './objectRenderers/PointerRenderer'
import { RangeRenderer } from './objectRenderers/RangeRenderer'
import { ShapeRenderer } from './objectRenderers/ShapeRenderer'
import { TableRenderer } from './objectRenderers/TableRenderer'
import { StrokeRenderer } from './objectRenderers/StrokeRenderer'
import { CheckpointRenderer } from './objectRenderers/CheckpointRenderer'
import { ContainerRenderer } from './objectRenderers/ContainerRenderer'
import { LinkedListRenderer } from './objectRenderers/LinkedListRenderer'
import { GraphRenderer } from './objectRenderers/GraphRenderer'
import { BinaryTreeRenderer } from './objectRenderers/BinaryTreeRenderer'
import { HashTableRenderer } from './objectRenderers/HashTableRenderer'
import { HeapRenderer } from './objectRenderers/HeapRenderer'
import { TrieRenderer } from './objectRenderers/TrieRenderer'

function labelFor(object: BoardObject): string {
  switch (object.type) {
    case 'note': return `Note: ${object.text || 'New note'}`
    case 'shape': return 'Rectangle'
    case 'array': return object.values.length ? `Array: ${object.values.join(', ')}` : 'Array: empty'
    case 'pointer': return `Pointer ${object.name}, index ${object.index}`
    case 'range': return `Range ${object.name}, ${object.start} to ${object.endExclusive}`
    case 'table': return `DP table, ${object.rowLabels.length} rows by ${object.columnLabels.length} columns`
    case 'stroke': return 'Freehand drawing'
    case 'checkpoint': return `Checkpoint: ${object.prompt || 'New practice'}`
    case 'container': return `${object.kind === 'stack' ? 'Stack' : 'Queue'}: ${object.values.join(', ') || 'empty'}${typeof object.currentIndex === 'number' ? `, current item index ${object.currentIndex}` : ''}`
    case 'linked-list': return `Linked list: ${object.nodes.map((node) => node.value).join(' → ') || 'empty'}${object.currentNodeId ? `, current node index ${object.nodes.findIndex((node) => node.id === object.currentNodeId)}` : ''}`
    case 'graph': return `Graph: ${object.nodes.length} vertices, ${object.edges.length} edges`
    case 'binary-tree': return `Binary tree: ${object.nodes.length} nodes`
    case 'hash-table': return `Hash table: ${object.entries.length} entries in ${object.bucketCount} buckets`
    case 'heap': return `${object.kind === 'min' ? 'Min' : 'Max'} heap: ${object.values.length} values`
    case 'trie': return `Trie: ${object.words.length} words`
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
      {object.type === 'checkpoint' && <CheckpointRenderer object={object} />}
      {object.type === 'container' && <ContainerRenderer object={object} />}
      {object.type === 'linked-list' && <LinkedListRenderer object={object} />}
      {object.type === 'graph' && <GraphRenderer object={object} />}
      {object.type === 'binary-tree' && <BinaryTreeRenderer object={object} />}
      {object.type === 'hash-table' && <HashTableRenderer object={object} />}
      {object.type === 'heap' && <HeapRenderer object={object} />}
      {object.type === 'trie' && <TrieRenderer object={object} />}
    </g>
  )
}
