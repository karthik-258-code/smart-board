import type { ArrayObject, RangeObject } from '../../domain/model'

export function RangeRenderer({ object, target }: { object: RangeObject; target: ArrayObject | undefined }) {
  const offsetX = target ? target.position.x - object.position.x : 0
  const offsetY = target ? target.position.y - object.position.y + 88 : 42
  const width = Math.max(8, (object.endExclusive - object.start) * 64)
  return (
    <g className="range-mark">
      <path d={`M${offsetX + object.start * 64} ${offsetY + 8} v-8 h${width} v8`} />
      <text x="0" y="28">{object.name} [{object.start}, {object.endExclusive})</text>
    </g>
  )
}
