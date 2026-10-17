export type BoardError = { code: string; message: string }

export type BoardPosition = { x: number; y: number }

type BaseObject = {
  id: string
  typeVersion: 1
  position: BoardPosition
}

export type NoteObject = BaseObject & { type: 'note'; text: string }
export type ShapeObject = BaseObject & {
  type: 'shape'
  shapeKind: 'rectangle'
  width: number
  height: number
}
export type ArrayObject = BaseObject & {
  type: 'array'
  values: Array<string | number>
  highlightedIndices: number[]
}
export type PointerObject = BaseObject & {
  type: 'pointer'
  name: string
  targetObjectId: string
  index: number
}
export type RangeObject = BaseObject & {
  type: 'range'
  name: string
  targetObjectId: string
  start: number
  endExclusive: number
}

export type TableCoordinate = { row: number; column: number }
export type TableDependency = { from: TableCoordinate; to: TableCoordinate }
export type TableObject = BaseObject & {
  type: 'table'
  rowLabels: string[]
  columnLabels: string[]
  cells: Array<Array<string | number | null>>
  highlightedCells: TableCoordinate[]
  dependencies: TableDependency[]
}
export type StrokeObject = BaseObject & { type: 'stroke'; points: BoardPosition[]; color: 'ink' }
export type CheckpointObject = BaseObject & { type: 'checkpoint'; prompt: string; answer: string; hint: string }
export type ContainerObject = BaseObject & { type: 'container'; kind: 'stack' | 'queue'; values: Array<string | number>; currentIndex?: number | null }
export type LinkedListNode = { id: string; value: string | number; nextId: string | null }
export type LinkedListObject = BaseObject & { type: 'linked-list'; nodes: LinkedListNode[]; currentNodeId?: string | null }
export type GraphNode = { id: string; label: string; position: BoardPosition }
export type GraphEdge = { id: string; from: string; to: string }
export type GraphObject = BaseObject & { type: 'graph'; nodes: GraphNode[]; edges: GraphEdge[]; highlightedNodeIds: string[] }
export type BinaryTreeNode = { id: string; value: string | number; leftId: string | null; rightId: string | null; position: BoardPosition }
export type BinaryTreeObject = BaseObject & { type: 'binary-tree'; rootId: string | null; nodes: BinaryTreeNode[]; highlightedNodeIds: string[] }
export type HashEntry = { key: string; value: string | number }
export type HashTableObject = BaseObject & { type: 'hash-table'; bucketCount: number; entries: HashEntry[] }
export type HeapObject = BaseObject & { type: 'heap'; kind: 'min' | 'max'; values: number[] }
export type TrieObject = BaseObject & { type: 'trie'; words: string[] }

export type BoardObject = NoteObject | ShapeObject | ArrayObject | PointerObject | RangeObject | TableObject | StrokeObject | CheckpointObject | ContainerObject | LinkedListObject | GraphObject | BinaryTreeObject | HashTableObject | HeapObject | TrieObject

export type BoardDocument = {
  id: string
  schemaVersion: 1
  objects: BoardObject[]
}

export function createEmptyBoard(id: string): BoardDocument {
  return { id, schemaVersion: 1, objects: [] }
}
