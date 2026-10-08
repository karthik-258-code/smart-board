import { useRef, useState } from 'react'
import type { BoardDocument } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import type { BoardPosition, StrokeObject } from '../domain/model'
import { ObjectRenderer } from './ObjectRenderer'

type DragState = {
  objectId: string
  pointerId: number
  offset: { x: number; y: number }
  position: { x: number; y: number }
}

type DrawState = { pointerId: number; points: BoardPosition[] }

export type BoardCanvasProps = {
  document: BoardDocument
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOperation: (operation: BoardOperation) => void
  drawingMode?: boolean
  onCreateStroke?: (stroke: Pick<StrokeObject, 'position' | 'points' | 'color'>) => void
}

export function BoardCanvas({ document, selectedId, onSelect, onOperation, drawingMode = false, onCreateStroke }: BoardCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [draw, setDraw] = useState<DrawState | null>(null)

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

  function startDraw(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingMode || event.target !== event.currentTarget || event.button !== 0) return
    const point = boardPoint(event.clientX, event.clientY)
    if (!point) return
    onSelect(null)
    setDraw({ pointerId: event.pointerId, points: [point] })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDraw(event: React.PointerEvent<SVGSVGElement>) {
    if (!draw || draw.pointerId !== event.pointerId) return
    const point = boardPoint(event.clientX, event.clientY)
    if (!point) return
    setDraw((current) => {
      if (!current || current.pointerId !== event.pointerId) return current
      const last = current.points[current.points.length - 1]
      if (last.x === point.x && last.y === point.y) return current
      return { ...current, points: [...current.points, point] }
    })
  }

  function finishDraw(event: React.PointerEvent<SVGSVGElement>) {
    if (!draw || draw.pointerId !== event.pointerId) return
    const point = boardPoint(event.clientX, event.clientY)
    const points = point && (point.x !== draw.points.at(-1)?.x || point.y !== draw.points.at(-1)?.y)
      ? [...draw.points, point]
      : draw.points
    setDraw(null)
    if (points.length < 2) return
    const origin = points[0]
    onCreateStroke?.({
      position: origin,
      points: points.map((item) => ({ x: item.x - origin.x, y: item.y - origin.y })),
      color: 'ink',
    })
  }

  return (
    <section className="board-canvas" role="region" aria-label="Board canvas">
      <svg className={`board-drawing${drawingMode ? ' is-drawing' : ''}`} viewBox="0 0 1200 720" aria-label="Board objects" onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={finishDraw} onPointerCancel={() => setDraw(null)} onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null)
      }} ref={svgRef}>
        <defs>
          <marker id="pointer-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L0 6 L7 3 z" fill="currentColor" />
          </marker>
          <marker id="dependency-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
      {document.objects.length === 0 && <p className="canvas-empty">Add a note, shape, array, or DP table, or choose Draw to sketch.</p>}
    </section>
  )
}
