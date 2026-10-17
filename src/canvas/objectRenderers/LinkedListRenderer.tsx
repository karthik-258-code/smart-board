import type { LinkedListObject } from '../../domain/model'

export function LinkedListRenderer({ object }: { object: LinkedListObject }) {
  const nodeWidth = 76
  const gap = 34
  const width = Math.max(120, object.nodes.length * (nodeWidth + gap) - gap)
  return <g className="linked-list-object">
    {object.nodes.length === 0 ? <g>
      <rect className="linked-list-empty" width="120" height="54" rx="9" />
      <text className="linked-list-empty-label" x="60" y="29" textAnchor="middle">Empty list</text>
    </g> : <>
      {object.nodes.slice(0, -1).map((node, index) => <line
        className="linked-list-link" key={`${node.id}-link`}
        x1={index * (nodeWidth + gap) + nodeWidth} y1="30"
        x2={(index + 1) * (nodeWidth + gap) - 4} y2="30"
        markerEnd="url(#linked-list-arrow)"
      />)}
      {object.nodes.map((node, index) => {
        const x = index * (nodeWidth + gap)
        return <g className={`linked-list-node${object.currentNodeId === node.id ? ' linked-list-node-current' : ''}`} data-node-id={node.id} key={node.id} transform={`translate(${x} 0)`}>
          <rect className="linked-list-node-value" width="54" height="46" rx="7" />
          <text className="linked-list-node-label" x="27" y="24" textAnchor="middle" dominantBaseline="middle">{String(node.value)}</text>
          <rect className="linked-list-node-pointer" x="56" y="12" width="20" height="22" rx="4" />
          <text className="linked-list-next-label" x="66" y="23" textAnchor="middle" dominantBaseline="middle">{node.nextId ? '→' : '∅'}</text>
          <text className="linked-list-index" x="27" y="65" textAnchor="middle">{index}</text>
        </g>
      })}
      <text className="linked-list-null-label" x={width + 6} y="35">NULL</text>
    </>}
  </g>
}
