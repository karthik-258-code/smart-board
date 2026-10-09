import type { ContainerObject } from '../../domain/model'

export function ContainerRenderer({ object }: { object: ContainerObject }) {
  const isStack = object.kind === 'stack'
  const cellWidth = 64
  const cellHeight = 40
  const values = isStack ? [...object.values].reverse() : object.values
  const width = isStack ? 94 : Math.max(150, object.values.length * cellWidth + 40)
  const height = isStack ? Math.max(84, values.length * cellHeight + 44) : 92
  return <g className={`container-object container-${object.kind}`}>
    <rect className="container-surface" width={width} height={height} rx="10" />
    <text className="container-title" x="12" y="20">{isStack ? 'STACK · TOP' : 'QUEUE · FRONT →'}</text>
    {values.map((value, index) => {
      const x = isStack ? 15 : 20 + index * cellWidth
      const y = isStack ? 30 + index * cellHeight : 31
      return <g key={index}>
        <rect className="container-cell" x={x} y={y} width={isStack ? 64 : cellWidth} height={cellHeight} />
        <text className="container-value" x={x + (isStack ? 32 : cellWidth / 2)} y={y + 25} textAnchor="middle">{String(value)}</text>
      </g>
    })}
    {object.values.length === 0 && <text className="container-empty" x={width / 2} y={height - 14} textAnchor="middle">Empty</text>}
    {!isStack && <text className="container-end-label" x={width - 10} y={height - 8} textAnchor="end">BACK</text>}
  </g>
}
