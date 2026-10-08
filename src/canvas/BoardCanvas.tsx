import type { BoardDocument } from '../domain/model'
import type { BoardOperation } from '../domain/operations'
import { ObjectRenderer } from './ObjectRenderer'

export type BoardCanvasProps = {
  document: BoardDocument
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOperation: (operation: BoardOperation) => void
}

export function BoardCanvas({ document, selectedId, onSelect }: BoardCanvasProps) {
  return (
    <section className="board-canvas" role="region" aria-label="Board canvas">
      <svg className="board-drawing" viewBox="0 0 1200 720" aria-label="Board objects" onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null)
      }}>
        <defs>
          <marker id="pointer-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L0 6 L7 3 z" fill="currentColor" />
          </marker>
        </defs>
        {document.objects.map((object) => (
          <ObjectRenderer
            key={object.id}
            object={object}
            objects={document.objects}
            selected={selectedId === object.id}
            onSelect={onSelect}
          />
        ))}
      </svg>
      {document.objects.length === 0 && <p className="canvas-empty">Add a note, rectangle, or array to begin.</p>}
    </section>
  )
}
