import type { ShapeObject } from '../../domain/model'

export function ShapeRenderer({ object }: { object: ShapeObject }) {
  return (
    <>
      <rect className="board-shape" width={object.width} height={object.height} rx="10" />
      <text className="board-shape-label" x={object.width / 2} y={object.height / 2} textAnchor="middle" dominantBaseline="middle">Rectangle</text>
    </>
  )
}
