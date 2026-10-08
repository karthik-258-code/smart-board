import type { TableObject } from '../../domain/model'

const cellWidth = 68
const cellHeight = 44
const labelWidth = 52
const labelHeight = 28

export function TableRenderer({ object }: { object: TableObject }) {
  const width = labelWidth + object.columnLabels.length * cellWidth
  const height = labelHeight + object.rowLabels.length * cellHeight
  return (
    <g className="dp-table" aria-label="Dynamic programming table">
      <rect className="table-surface" width={width} height={height} rx="8" />
      {object.columnLabels.map((label, column) => <text key={`column-${column}`} className="table-label" x={labelWidth + column * cellWidth + cellWidth / 2} y={labelHeight / 2 + 4} textAnchor="middle">{label}</text>)}
      {object.rowLabels.map((label, row) => <text key={`row-${row}`} className="table-label" x={labelWidth / 2} y={labelHeight + row * cellHeight + cellHeight / 2 + 4} textAnchor="middle">{label}</text>)}
      {object.cells.map((cells, row) => cells.map((value, column) => {
        const x = labelWidth + column * cellWidth
        const y = labelHeight + row * cellHeight
        const highlighted = object.highlightedCells.some((cell) => cell.row === row && cell.column === column)
        return <g key={`cell-${row}-${column}`}>
          <rect className={`table-cell${highlighted ? ' table-cell-highlighted' : ''}`} x={x} y={y} width={cellWidth} height={cellHeight} />
          <text className="table-value" x={x + cellWidth / 2} y={y + cellHeight / 2 + 5} textAnchor="middle">{value === null ? '' : String(value)}</text>
          <text className="table-cell-coordinate" x={x + 5} y={y + 12}>{row},{column}</text>
        </g>
      }))}
      {object.dependencies.map((edge, index) => {
        const fromX = labelWidth + edge.from.column * cellWidth + cellWidth / 2
        const fromY = labelHeight + edge.from.row * cellHeight + cellHeight / 2
        const toX = labelWidth + edge.to.column * cellWidth + cellWidth / 2
        const toY = labelHeight + edge.to.row * cellHeight + cellHeight / 2
        return <line key={`${edge.from.row}-${edge.from.column}-${edge.to.row}-${edge.to.column}-${index}`} className="table-dependency" x1={fromX} y1={fromY} x2={toX} y2={toY} markerEnd="url(#dependency-arrow)" aria-label={`Dependency from row ${edge.from.row + 1} column ${edge.from.column + 1} to row ${edge.to.row + 1} column ${edge.to.column + 1}`} />
      })}
    </g>
  )
}
