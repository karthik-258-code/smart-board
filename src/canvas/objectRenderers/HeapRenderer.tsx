import type { HeapObject } from '../../domain/model'

export function HeapRenderer({ object }: { object: HeapObject }) {
  const width = Math.max(440, Math.pow(2, Math.ceil(Math.log2(Math.max(2, object.values.length)))) * 48)
  const positions = object.values.map((_, index) => {
    const level = Math.floor(Math.log2(index + 1))
    const slot = index - (Math.pow(2, level) - 1)
    return { x: (slot + 0.5) * (width / Math.pow(2, level)), y: 36 + level * 72 }
  })
  return <g className="heap-object">
    <text className="heap-title" x="0" y="-10">{object.kind.toUpperCase()} HEAP</text>
    {positions.map((position, index) => index > 0 ? <line key={`edge-${index}`} className="heap-edge" x1={positions[Math.floor((index - 1) / 2)].x} y1={positions[Math.floor((index - 1) / 2)].y} x2={position.x} y2={position.y} /> : null)}
    {object.values.length === 0 ? <text className="heap-empty" x="0" y="40">Empty heap · push a value to begin</text> : object.values.map((value, index) => <g key={index} className={`heap-node${index === 0 ? ' heap-top' : ''}`} transform={`translate(${positions[index].x} ${positions[index].y})`}>
      <circle r="19" /><text textAnchor="middle" dominantBaseline="middle">{value}</text>
    </g>)}
    <text className="heap-array-title" x="0" y="300">ARRAY REPRESENTATION</text>
    {object.values.map((value, index) => <g key={`array-${index}`} className="heap-array-cell" transform={`translate(${index * 50} 312)`}>
      <rect width="44" height="42" rx="5" /><text x="22" y="19" textAnchor="middle">{value}</text><text className="heap-array-index" x="22" y="56" textAnchor="middle">{index}</text>
    </g>)}
  </g>
}
