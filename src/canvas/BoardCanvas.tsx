import { useRef, useState } from 'react'
import type { BoardDocument } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import { ObjectRenderer } from './ObjectRenderer'

type DragState = {
  objectId: string
  pointerId: number
  offset: { x: number; y: number }
  position: { x: number; y: number }
}

export type BoardCanvasProps = {
  document: BoardDocument
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOperation: (operation: BoardOperation) => void
}

export function BoardCanvas({ document, selectedId, onSelect, onOperation }: BoardCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  function boardPoint(clientX: number, clientY: number) {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null
    return {
      x: (clientX - bounds.left) * 1200 / bounds.width,
      y: (clientY - bounds.top) * 720 / bounds.height,
    }
  }

  function startDrag(event: React.PointerEvent<SVGGElement>, object: BoardDocument['objects'][number]) {
    if (event.button !== 0) return
    const point = boardPoint(event.clientX, event.clientY)
    if (!point) return
    onSelect(object.id)
    setDrag({
      objectId: object.id,
      pointerId: event.pointerId,
      offset: { x: point.x - object.position.x, y: point.y - object.position.y },
      position: object.position,
    })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDrag(event: React.PointerEvent<SVGGElement>) {
    if (!drag || drag.objectId !== event.currentTarget.dataset.objectId) return
    if (event.pointerId !== undefined && event.pointerId !== drag.pointerId) return
    const point = boardPoint(event.clientX, event.clientY)
    if (!point) return
    setDrag({ ...drag, position: { x: point.x - drag.offset.x, y: point.y - drag.offset.y } })
  }

  function finishDrag(event: React.PointerEvent<SVGGElement>, objectId: string) {
    if (!drag || drag.objectId !== objectId) return
    if (event.pointerId !== undefined && event.pointerId !== drag.pointerId) return
    const point = boardPoint(event.clientX, event.clientY)
    const position = point
      ? { x: point.x - drag.offset.x, y: point.y - drag.offset.y }
      : drag.position
    const object = document.objects.find((item) => item.id === objectId)
    setDrag(null)
    if (object && (position.x !== object.position.x || position.y !== object.position.y)) {
      onOperation({ type: 'object/update-position', objectId, position })
    }
  }

  return (
    <section className="board-canvas" role="region" aria-label="Board canvas">
      <svg className="board-drawing" viewBox="0 0 1200 720" aria-label="Board objects" onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null)
      }} ref={svgRef}>
        <defs>
          <marker id="pointer-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L0 6 L7 3 z" fill="currentColor" />
          </marker>
        </defs>
        {document.objects.map((object) => {
          const renderedObject = drag?.objectId === object.id ? { ...object, position: drag.position } as typeof object : object
          return (
            <ObjectRenderer
              key={object.id}
              object={renderedObject}
              objects={document.objects}
              selected={selectedId === object.id}
              onSelect={onSelect}
              onPointerDown={(event) => startDrag(event, object)}
              onPointerMove={moveDrag}
              onPointerUp={(event) => finishDrag(event, object.id)}
              dragging={drag?.objectId === object.id}
            />
          )
        })}
      </svg>
      {document.objects.length === 0 && <p className="canvas-empty">Add a note, rectangle, or array to begin.</p>}
    </section>
  )
}
