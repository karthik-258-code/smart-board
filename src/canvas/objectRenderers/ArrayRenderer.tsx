import type { ArrayObject } from '../../domain/model'

export function ArrayRenderer({ object }: { object: ArrayObject }) {
  const cellWidth = 64
  return (
    <g>
      {object.values.map((value, index) => (
        <g key={index} transform={`translate(${index * cellWidth}, 0)`}>
          <rect className={object.highlightedIndices.includes(index) ? 'array-cell array-cell-highlighted' : 'array-cell'} width={cellWidth} height="58" rx="8" />
          <text className="array-value" x={cellWidth / 2} y="29" textAnchor="middle" dominantBaseline="middle">{value}</text>
          <text className="array-index" x={cellWidth / 2} y="78" textAnchor="middle">{index}</text>
        </g>
      ))}
    </g>
  )
}
