import type { ArrayObject, PointerObject } from '../../domain/model'

export function PointerRenderer({ object, target }: { object: PointerObject; target: ArrayObject | undefined }) {
  const targetX = target ? target.position.x + object.index * 64 + 32 - object.position.x : 24
  const targetY = target ? target.position.y - object.position.y : 42
  return (
    <g className="pointer-mark">
      <path d={`M0 12 L${targetX} ${targetY}`} />
      <text x="0" y="0">{object.name} · {object.index}</text>
    </g>
  )
}
