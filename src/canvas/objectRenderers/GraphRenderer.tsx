import type { GraphObject } from '../../domain/model'

export function GraphRenderer({ object }: { object: GraphObject }) {
  const nodes = new Map(object.nodes.map((node) => [node.id, node]))
  return <g className="graph-object">
    <text className="graph-title" x="0" y="-16">GRAPH · {object.nodes.length} VERTICES · {object.edges.length} EDGES</text>
    {object.edges.map((edge) => {
      const from = nodes.get(edge.from)
      const to = nodes.get(edge.to)
      if (!from || !to) return null
      return <line key={edge.id} className="graph-edge" x1={from.position.x} y1={from.position.y} x2={to.position.x} y2={to.position.y} />
    })}
    {object.nodes.length === 0 && <text className="graph-empty" x="0" y="24">Empty graph · add a vertex in the inspector</text>}
    {object.nodes.map((node) => {
      const highlighted = object.highlightedNodeIds.includes(node.id)
      return <g key={node.id} className={`graph-node${highlighted ? ' graph-node-highlighted' : ''}`} data-node-id={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
        <circle r="25" />
        <text textAnchor="middle" dominantBaseline="middle">{node.label}</text>
      </g>
    })}
  </g>
}
