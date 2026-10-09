import type { ArrayObject, BinaryTreeNode, BoardDocument, BoardObject, BoardPosition, GraphEdge, GraphNode, LinkedListNode, PointerObject, RangeObject, TableCoordinate, TableDependency } from './model'
import { validateBoard } from './objectRegistry'
import type { Result } from './result'

export type BoardOperation =
  | { type: 'object/add'; object: BoardObject }
  | { type: 'object/remove'; objectId: string }
  | { type: 'object/update-position'; objectId: string; position: BoardPosition }
  | { type: 'note/update-text'; objectId: string; text: string }
  | { type: 'array/set-value'; objectId: string; index: number; value: string | number }
  | { type: 'array/set-highlight'; objectId: string; indices: number[] }
  | { type: 'array/insert-value'; objectId: string; index: number; value: string | number }
  | { type: 'array/remove-value'; objectId: string; index: number }
  | { type: 'array/restore-state'; objectId: string; values: ArrayObject['values']; highlightedIndices: number[]; references: Array<PointerObject | RangeObject> }
  | { type: 'array/swap-values'; objectId: string; firstIndex: number; secondIndex: number }
  | { type: 'array/compare-values'; objectId: string; firstIndex: number; secondIndex: number; operator: '<' | '=' | '>' }
  | { type: 'pointer/move'; objectId: string; index: number }
  | { type: 'pointer/set-name'; objectId: string; name: string }
  | { type: 'range/set'; objectId: string; start: number; endExclusive: number }
  | { type: 'table/set-cell'; objectId: string; coordinate: TableCoordinate; value: string | number | null }
  | { type: 'table/set-highlighted-cells'; objectId: string; coordinates: TableCoordinate[] }
  | { type: 'table/add-dependency'; objectId: string; dependency: TableDependency }
  | { type: 'table/remove-dependency'; objectId: string; dependency: TableDependency }
  | { type: 'checkpoint/update'; objectId: string; prompt: string; answer: string; hint: string }
  | { type: 'container/push'; objectId: string; value: string | number }
  | { type: 'container/remove'; objectId: string }
  | { type: 'container/restore-values'; objectId: string; values: Array<string | number> }
  | { type: 'linked-list/insert'; objectId: string; afterId: string | null; nodeId: string; value: string | number }
  | { type: 'linked-list/remove'; objectId: string; nodeId: string }
  | { type: 'linked-list/reverse'; objectId: string }
  | { type: 'linked-list/restore-nodes'; objectId: string; nodes: LinkedListNode[] }
  | { type: 'graph/add-node'; objectId: string; node: GraphNode }
  | { type: 'graph/remove-node'; objectId: string; nodeId: string }
  | { type: 'graph/add-edge'; objectId: string; edge: GraphEdge }
  | { type: 'graph/remove-edge'; objectId: string; edgeId: string }
  | { type: 'graph/set-highlighted'; objectId: string; nodeIds: string[] }
  | { type: 'graph/restore-state'; objectId: string; nodes: GraphNode[]; edges: GraphEdge[]; highlightedNodeIds: string[] }
  | { type: 'tree/insert'; objectId: string; node: BinaryTreeNode; parentId: string | null; side: 'root' | 'left' | 'right' }
  | { type: 'tree/remove-subtree'; objectId: string; nodeId: string }
  | { type: 'tree/set-highlighted'; objectId: string; nodeIds: string[] }
  | { type: 'tree/restore-state'; objectId: string; rootId: string | null; nodes: BinaryTreeNode[]; highlightedNodeIds: string[] }

export type OperationError = { code: string; message: string; objectId?: string; index?: number }

export type ArrayComparisonOperation = Extract<BoardOperation, { type: 'array/compare-values' }>

export function evaluateArrayComparison(
  values: ArrayObject['values'],
  operation: Pick<ArrayComparisonOperation, 'firstIndex' | 'secondIndex' | 'operator'>,
  objectId?: string,
): Result<boolean, OperationError> {
  for (const index of [operation.firstIndex, operation.secondIndex]) {
    if (!Number.isInteger(index) || index < 0 || index >= values.length) {
      return fail('invalid_index', 'Comparison index is outside the array.', objectId, index)
    }
  }
  const first = values[operation.firstIndex]
  const second = values[operation.secondIndex]
  if (operation.operator === '=') return { ok: true, value: first === second }
  if (typeof first !== 'number' || typeof second !== 'number') {
    return fail('incompatible_values', 'Ordered comparisons require two numeric values.', objectId)
  }
  return { ok: true, value: operation.operator === '<' ? first < second : first > second }
}

type ArrayReference = PointerObject | RangeObject

function referencesFor(document: BoardDocument, objectId: string): ArrayReference[] {
  return document.objects.filter((object): object is ArrayReference =>
    (object.type === 'pointer' || object.type === 'range') && object.targetObjectId === objectId,
  )
}

function arrayStateInverse(document: BoardDocument, array: ArrayObject): BoardOperation {
  return {
    type: 'array/restore-state',
    objectId: array.id,
    values: array.values,
    highlightedIndices: array.highlightedIndices,
    references: referencesFor(document, array.id),
  }
}

function updateArrayReferences(
  objects: BoardObject[],
  objectId: string,
  update: (reference: ArrayReference) => ArrayReference,
): BoardObject[] {
  return objects.map((object) =>
    (object.type === 'pointer' || object.type === 'range') && object.targetObjectId === objectId
      ? update(object)
      : object,
  )
}

function fail(code: string, message: string, objectId?: string, index?: number): Result<never, OperationError> {
  return { ok: false, error: { code, message, ...(objectId === undefined ? {} : { objectId }), ...(index === undefined ? {} : { index }) } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finish(
  document: BoardDocument,
  inverse: BoardOperation,
): Result<{ document: BoardDocument; inverse: BoardOperation }, OperationError> {
  const validation = validateBoard(document)
  if (!validation.ok) return { ok: false, error: validation.error }
  return { ok: true, value: { document: validation.value, inverse } }
}

export function applyOperation(document: BoardDocument, operation: BoardOperation): Result<{ document: BoardDocument; inverse: BoardOperation }, OperationError> {
  if (operation.type === 'object/add') {
    const candidate = validateBoard({ ...document, objects: [...document.objects, operation.object] })
    if (!candidate.ok) return { ok: false, error: candidate.error }
    const addedObject = candidate.value.objects[candidate.value.objects.length - 1]
    return { ok: true, value: { document: candidate.value, inverse: { type: 'object/remove', objectId: addedObject.id } } }
  }

  const objectIndex = document.objects.findIndex((object) => object.id === operation.objectId)
  if (objectIndex < 0) return fail('missing_object', 'Object does not exist.', operation.objectId)
  const current = document.objects[objectIndex]

  if (operation.type === 'object/remove') {
    const objects = document.objects.filter((object) => object.id !== operation.objectId)
    return finish({ ...document, objects }, { type: 'object/add', object: current })
  }

  if (operation.type === 'array/restore-state') {
    if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
    const inverse = arrayStateInverse(document, current)
    const references = new Map(operation.references.map((reference) => [reference.id, reference]))
    const objects = document.objects.map((object) => {
      if (object.id === current.id) return { ...current, values: operation.values, highlightedIndices: operation.highlightedIndices }
      if ((object.type === 'pointer' || object.type === 'range') && object.targetObjectId === current.id) {
        return references.get(object.id) ?? object
      }
      return object
    })
    return finish({ ...document, objects }, inverse)
  }

  if (operation.type === 'array/insert-value' || operation.type === 'array/remove-value') {
    if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
    const validIndex = operation.type === 'array/insert-value'
      ? Number.isInteger(operation.index) && operation.index >= 0 && operation.index <= current.values.length
      : Number.isInteger(operation.index) && operation.index >= 0 && operation.index < current.values.length
    if (!validIndex) return fail('invalid_index', 'Array index is outside the array.', current.id, operation.index)
    if (operation.type === 'array/insert-value' && typeof operation.value === 'number' && !Number.isFinite(operation.value)) {
      return fail('invalid_value', 'Array values must be finite numbers or text.', current.id, operation.index)
    }

    const inverse = arrayStateInverse(document, current)
    const values = [...current.values]
    const highlightedIndices = [...current.highlightedIndices]
    let objects: BoardObject[]
    if (operation.type === 'array/insert-value') {
      values.splice(operation.index, 0, operation.value)
      const shiftedHighlights = highlightedIndices.map((index) => index >= operation.index ? index + 1 : index)
      objects = updateArrayReferences(document.objects, current.id, (reference) => {
        if (reference.type === 'pointer') return { ...reference, index: reference.index >= operation.index ? reference.index + 1 : reference.index }
        const emptyRangeBeforeInsertion = reference.start === reference.endExclusive && operation.index <= reference.start
        return {
          ...reference,
          start: reference.start >= operation.index ? reference.start + 1 : reference.start,
          endExclusive: reference.endExclusive > operation.index || emptyRangeBeforeInsertion ? reference.endExclusive + 1 : reference.endExclusive,
        }
      })
      objects[objectIndex] = { ...current, values, highlightedIndices: shiftedHighlights }
    } else {
      values.splice(operation.index, 1)
      const shiftedHighlights = highlightedIndices
        .filter((index) => index !== operation.index)
        .map((index) => index > operation.index ? index - 1 : index)
      objects = updateArrayReferences(document.objects, current.id, (reference) => {
        if (reference.type === 'pointer') {
          const index = reference.index > operation.index ? reference.index - 1 : reference.index
          return { ...reference, index: Math.min(index, Math.max(0, values.length - 1)) }
        }
        const start = reference.start > operation.index ? reference.start - 1 : reference.start
        const endExclusive = reference.endExclusive > operation.index ? reference.endExclusive - 1 : reference.endExclusive
        return { ...reference, start: Math.min(start, endExclusive), endExclusive }
      })
      objects[objectIndex] = { ...current, values, highlightedIndices: shiftedHighlights }
    }
    return finish({ ...document, objects }, inverse)
  }

  if (operation.type === 'array/compare-values') {
    if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
    const comparison = evaluateArrayComparison(current.values, operation, current.id)
    if (!comparison.ok) return { ok: false, error: comparison.error }
    const highlightedIndices = [...new Set([operation.firstIndex, operation.secondIndex])]
    const objects = [...document.objects]
    objects[objectIndex] = { ...current, highlightedIndices }
    return finish({ ...document, objects }, { type: 'array/set-highlight', objectId: current.id, indices: current.highlightedIndices })
  }

  if (operation.type === 'array/swap-values') {
    if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
    for (const index of [operation.firstIndex, operation.secondIndex]) {
      if (!Number.isInteger(index) || index < 0 || index >= current.values.length) return fail('invalid_index', 'Swap index is outside the array.', current.id, index)
    }
    const values = [...current.values]
    ;[values[operation.firstIndex], values[operation.secondIndex]] = [values[operation.secondIndex], values[operation.firstIndex]]
    const objects = [...document.objects]
    objects[objectIndex] = { ...current, values }
    return finish({ ...document, objects }, operation)
  }

  let updated: BoardObject
  let inverse: BoardOperation
  switch (operation.type) {
    case 'object/update-position':
      updated = { ...current, position: operation.position } as BoardObject
      inverse = { type: operation.type, objectId: current.id, position: current.position }
      break
    case 'note/update-text':
      if (current.type !== 'note') return fail('incompatible_object', 'Operation requires a note.', current.id)
      updated = { ...current, text: operation.text }
      inverse = { type: operation.type, objectId: current.id, text: current.text }
      break
    case 'array/set-value':
      if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
      if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index >= current.values.length) return fail('invalid_index', 'Array index is outside the array.', current.id, operation.index)
      {
        const values = [...current.values]
        const oldValue = values[operation.index]
        values[operation.index] = operation.value
        updated = { ...current, values }
        inverse = { type: operation.type, objectId: current.id, index: operation.index, value: oldValue }
      }
      break
    case 'array/set-highlight':
      if (current.type !== 'array') return fail('incompatible_object', 'Operation requires an array.', current.id)
      updated = { ...current, highlightedIndices: operation.indices }
      inverse = { type: operation.type, objectId: current.id, indices: current.highlightedIndices }
      break
    case 'pointer/move':
      if (current.type !== 'pointer') return fail('incompatible_object', 'Operation requires a pointer.', current.id)
      updated = { ...current, index: operation.index }
      inverse = { type: operation.type, objectId: current.id, index: current.index }
      break
    case 'pointer/set-name':
      if (current.type !== 'pointer') return fail('incompatible_object', 'Operation requires a pointer.', current.id)
      updated = { ...current, name: operation.name }
      inverse = { type: operation.type, objectId: current.id, name: current.name }
      break
    case 'range/set':
      if (current.type !== 'range') return fail('incompatible_object', 'Operation requires a range.', current.id)
      updated = { ...current, start: operation.start, endExclusive: operation.endExclusive }
      inverse = { type: operation.type, objectId: current.id, start: current.start, endExclusive: current.endExclusive }
      break
    case 'table/set-cell':
      if (current.type !== 'table') return fail('incompatible_object', 'Operation requires a DP table.', current.id)
      if (!Number.isInteger(operation.coordinate.row) || !Number.isInteger(operation.coordinate.column)
        || operation.coordinate.row < 0 || operation.coordinate.row >= current.cells.length
        || operation.coordinate.column < 0 || operation.coordinate.column >= current.columnLabels.length) return fail('invalid_cell', 'Cell coordinate is outside the table.', current.id)
      if (typeof operation.value === 'number' && !Number.isFinite(operation.value)) return fail('invalid_value', 'Cell value must be finite, text, or empty.', current.id)
      {
        const cells = current.cells.map((row) => [...row])
        const oldValue = cells[operation.coordinate.row][operation.coordinate.column]
        cells[operation.coordinate.row][operation.coordinate.column] = operation.value
        updated = { ...current, cells }
        inverse = { type: operation.type, objectId: current.id, coordinate: operation.coordinate, value: oldValue }
      }
      break
    case 'table/set-highlighted-cells':
      if (current.type !== 'table') return fail('incompatible_object', 'Operation requires a DP table.', current.id)
      updated = { ...current, highlightedCells: operation.coordinates }
      inverse = { type: operation.type, objectId: current.id, coordinates: current.highlightedCells }
      break
    case 'table/add-dependency':
    case 'table/remove-dependency':
      if (current.type !== 'table') return fail('incompatible_object', 'Operation requires a DP table.', current.id)
      {
        const key = JSON.stringify(operation.dependency)
        const exists = current.dependencies.some((edge) => JSON.stringify(edge) === key)
        if (operation.type === 'table/add-dependency' && exists) return fail('duplicate_dependency', 'Dependency already exists.', current.id)
        if (operation.type === 'table/remove-dependency' && !exists) return fail('missing_dependency', 'Dependency does not exist.', current.id)
        const dependencies = operation.type === 'table/add-dependency'
          ? [...current.dependencies, operation.dependency]
          : current.dependencies.filter((edge) => JSON.stringify(edge) !== key)
        updated = { ...current, dependencies }
        inverse = { type: operation.type === 'table/add-dependency' ? 'table/remove-dependency' : 'table/add-dependency', objectId: current.id, dependency: operation.dependency }
      }
      break
    case 'checkpoint/update':
      if (current.type !== 'checkpoint') return fail('incompatible_object', 'Operation requires a checkpoint.', current.id)
      updated = { ...current, prompt: operation.prompt, answer: operation.answer, hint: operation.hint }
      inverse = { type: operation.type, objectId: current.id, prompt: current.prompt, answer: current.answer, hint: current.hint }
      break
    case 'container/push':
      if (current.type !== 'container') return fail('incompatible_object', 'Operation requires a stack or queue.', current.id)
      if (current.values.length >= 20) return fail('container_full', 'Container cannot hold more than 20 values.', current.id)
      if (typeof operation.value === 'number' && !Number.isFinite(operation.value)) return fail('invalid_value', 'Container values must be finite numbers or text.', current.id)
      updated = { ...current, values: [...current.values, operation.value] }
      inverse = { type: 'container/restore-values', objectId: current.id, values: current.values }
      break
    case 'container/remove':
      if (current.type !== 'container') return fail('incompatible_object', 'Operation requires a stack or queue.', current.id)
      if (current.values.length === 0) return fail('empty_container', 'Cannot remove a value from an empty container.', current.id)
      {
        const values = [...current.values]
        if (current.kind === 'stack') values.pop()
        else values.shift()
        updated = { ...current, values }
        inverse = { type: 'container/restore-values', objectId: current.id, values: current.values }
      }
      break
    case 'container/restore-values':
      if (current.type !== 'container') return fail('incompatible_object', 'Operation requires a stack or queue.', current.id)
      updated = { ...current, values: operation.values }
      inverse = { type: 'container/restore-values', objectId: current.id, values: current.values }
      break
    case 'linked-list/insert':
    case 'linked-list/remove':
    case 'linked-list/reverse':
    case 'linked-list/restore-nodes':
      if (current.type !== 'linked-list') return fail('incompatible_object', 'Operation requires a linked list.', current.id)
      {
        const priorNodes = current.nodes
        let nodes = [...current.nodes]
        if (operation.type === 'linked-list/insert') {
          if (operation.afterId !== null && typeof operation.afterId !== 'string') return fail('invalid_anchor', 'Insertion anchor must be a node ID or null.', current.id)
          if (typeof operation.nodeId !== 'string' || typeof operation.value !== 'string' && typeof operation.value !== 'number') return fail('invalid_value', 'Node ID and value are invalid.', current.id)
          if (nodes.length >= 20) return fail('linked_list_full', 'Linked list cannot hold more than 20 nodes.', current.id)
          if (!operation.nodeId.trim() || nodes.some((node) => node.id === operation.nodeId)) return fail('duplicate_node_id', 'Node ID must be non-empty and unique.', current.id)
          if (typeof operation.value === 'number' && !Number.isFinite(operation.value)) return fail('invalid_value', 'Node values must be finite numbers or text.', current.id)
          const insertAt = operation.afterId === null ? 0 : nodes.findIndex((node) => node.id === operation.afterId) + 1
          if (operation.afterId !== null && insertAt === 0) return fail('missing_anchor', 'Insertion anchor does not exist.', current.id)
          nodes.splice(insertAt, 0, { id: operation.nodeId, value: operation.value, nextId: null })
        } else if (operation.type === 'linked-list/remove') {
          if (typeof operation.nodeId !== 'string') return fail('missing_node', 'Node ID is invalid.', current.id)
          const removeAt = nodes.findIndex((node) => node.id === operation.nodeId)
          if (removeAt < 0) return fail('missing_node', 'Node does not exist.', current.id)
          nodes.splice(removeAt, 1)
        } else if (operation.type === 'linked-list/reverse') {
          nodes.reverse()
        } else {
          if (!Array.isArray(operation.nodes)) return fail('invalid_nodes', 'Restored nodes must be a list.', current.id)
          nodes = operation.nodes
        }
        nodes = nodes.map((node, index) => ({ ...node, nextId: nodes[index + 1]?.id ?? null }))
        updated = { ...current, nodes }
        inverse = { type: 'linked-list/restore-nodes', objectId: current.id, nodes: priorNodes }
      }
      break
    case 'graph/add-node':
    case 'graph/remove-node':
    case 'graph/add-edge':
    case 'graph/remove-edge':
    case 'graph/set-highlighted':
    case 'graph/restore-state':
      if (current.type !== 'graph') return fail('incompatible_object', 'Operation requires a graph.', current.id)
      {
        const prior = { nodes: current.nodes, edges: current.edges, highlightedNodeIds: current.highlightedNodeIds }
        let nodes = [...current.nodes]
        let edges = [...current.edges]
        let highlightedNodeIds = [...current.highlightedNodeIds]
        if (operation.type === 'graph/add-node') {
          if (!isRecord(operation.node) || typeof operation.node.id !== 'string') return fail('invalid_node', 'Vertex data is invalid.', current.id)
          if (nodes.length >= 30) return fail('graph_full', 'Graph cannot contain more than 30 vertices.', current.id)
          if (nodes.some((node) => node.id === operation.node.id)) return fail('duplicate_node_id', 'Vertex ID must be unique.', current.id)
          nodes.push(operation.node)
        } else if (operation.type === 'graph/remove-node') {
          if (!nodes.some((node) => node.id === operation.nodeId)) return fail('missing_node', 'Vertex does not exist.', current.id)
          nodes = nodes.filter((node) => node.id !== operation.nodeId)
          edges = edges.filter((edge) => edge.from !== operation.nodeId && edge.to !== operation.nodeId)
          highlightedNodeIds = highlightedNodeIds.filter((id) => id !== operation.nodeId)
        } else if (operation.type === 'graph/add-edge') {
          if (!isRecord(operation.edge) || typeof operation.edge.id !== 'string' || typeof operation.edge.from !== 'string' || typeof operation.edge.to !== 'string') return fail('invalid_edge', 'Edge data is invalid.', current.id)
          if (edges.length >= 60) return fail('graph_full', 'Graph cannot contain more than 60 edges.', current.id)
          if (edges.some((edge) => edge.id === operation.edge.id)) return fail('duplicate_edge_id', 'Edge ID must be unique.', current.id)
          edges.push(operation.edge)
        } else if (operation.type === 'graph/remove-edge') {
          if (!edges.some((edge) => edge.id === operation.edgeId)) return fail('missing_edge', 'Edge does not exist.', current.id)
          edges = edges.filter((edge) => edge.id !== operation.edgeId)
        } else if (operation.type === 'graph/set-highlighted') {
          highlightedNodeIds = operation.nodeIds
        } else {
          nodes = operation.nodes
          edges = operation.edges
          highlightedNodeIds = operation.highlightedNodeIds
        }
        updated = { ...current, nodes, edges, highlightedNodeIds }
        inverse = { type: 'graph/restore-state', objectId: current.id, ...prior }
      }
      break
    case 'tree/insert':
    case 'tree/remove-subtree':
    case 'tree/set-highlighted':
    case 'tree/restore-state':
      if (current.type !== 'binary-tree') return fail('incompatible_object', 'Operation requires a binary tree.', current.id)
      {
        const prior = { rootId: current.rootId, nodes: current.nodes, highlightedNodeIds: current.highlightedNodeIds }
        let rootId = current.rootId
        let nodes = [...current.nodes]
        let highlightedNodeIds = [...current.highlightedNodeIds]
        if (operation.type === 'tree/insert') {
          if (nodes.length >= 30) return fail('tree_full', 'Tree cannot contain more than 30 nodes.', current.id)
          if (nodes.some((node) => node.id === operation.node.id)) return fail('duplicate_node_id', 'Node ID must be unique.', current.id)
          if (operation.side === 'root') {
            if (operation.parentId !== null || rootId !== null || nodes.length > 0) return fail('root_exists', 'Tree already has a root.', current.id)
            rootId = operation.node.id
          } else {
            const parent = nodes.find((node) => node.id === operation.parentId)
            if (!parent) return fail('missing_parent', 'Parent node does not exist.', current.id)
            if (parent[operation.side === 'left' ? 'leftId' : 'rightId'] !== null) return fail('child_exists', 'That child slot is already occupied.', current.id)
            nodes = nodes.map((node) => node.id === parent.id ? { ...parent, [operation.side === 'left' ? 'leftId' : 'rightId']: operation.node.id } : node)
          }
          nodes.push(operation.node)
        } else if (operation.type === 'tree/remove-subtree') {
          const target = nodes.find((node) => node.id === operation.nodeId)
          if (!target) return fail('missing_node', 'Tree node does not exist.', current.id)
          const removedIds = new Set<string>()
          const collect = (id: string) => {
            const node = nodes.find((item) => item.id === id)
            if (!node || removedIds.has(id)) return
            removedIds.add(id)
            if (node.leftId) collect(node.leftId)
            if (node.rightId) collect(node.rightId)
          }
          collect(target.id)
          nodes = nodes.filter((node) => !removedIds.has(node.id)).map((node) => ({ ...node, leftId: node.leftId && removedIds.has(node.leftId) ? null : node.leftId, rightId: node.rightId && removedIds.has(node.rightId) ? null : node.rightId }))
          highlightedNodeIds = highlightedNodeIds.filter((id) => !removedIds.has(id))
          if (removedIds.has(rootId ?? '')) rootId = null
        } else if (operation.type === 'tree/set-highlighted') {
          highlightedNodeIds = operation.nodeIds
        } else {
          rootId = operation.rootId
          nodes = operation.nodes
          highlightedNodeIds = operation.highlightedNodeIds
        }
        updated = { ...current, rootId, nodes, highlightedNodeIds }
        inverse = { type: 'tree/restore-state', objectId: current.id, ...prior }
      }
      break
  }

  const objects = [...document.objects]
  objects[objectIndex] = updated
  return finish({ ...document, objects }, inverse)
}
