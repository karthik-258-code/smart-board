import type { BinaryTreeNode, BinaryTreeObject } from '../../domain/model'

export function BinaryTreeRenderer({ object }: { object: BinaryTreeObject }) {
  const nodes = new Map(object.nodes.map((node) => [node.id, node]))
  return <g className="binary-tree-object">
    {object.nodes.flatMap((node) => [node.leftId, node.rightId]
      .map((childId) => childId ? nodes.get(childId) : undefined)
      .filter((child): child is BinaryTreeNode => Boolean(child))
      .map((child) => <line key={`${node.id}-${child.id}`} className="tree-edge" x1={node.position.x} y1={node.position.y} x2={child.position.x} y2={child.position.y} />))}
    {object.nodes.length === 0 && <text className="tree-empty" x="0" y="24">Empty tree · add a root in the inspector</text>}
    {object.nodes.map((node) => <g className={`tree-node${object.highlightedNodeIds.includes(node.id) ? ' tree-node-highlighted' : ''}`} key={node.id} data-node-id={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
      <circle r="25" />
      <text textAnchor="middle" dominantBaseline="middle">{String(node.value)}</text>
    </g>)}
  </g>
}
