import type {
  ArrayObject,
  BoardDocument,
  BoardError,
  BoardObject,
  NoteObject,
  PointerObject,
  RangeObject,
  ShapeObject,
  TableObject,
  StrokeObject,
  CheckpointObject,
  ContainerObject,
  LinkedListObject,
  GraphObject,
  BinaryTreeObject,
  HashTableObject,
  HeapObject,
  TrieObject,
} from './model'
import type { Result } from './result'

export type ObjectDefinition = {
  type: BoardObject['type']
  typeVersion: 1
  validate: (value: unknown) => Result<BoardObject, BoardError>
}

export type ObjectRegistry = Record<BoardObject['type'], ObjectDefinition>

const baseFields = ['id', 'type', 'typeVersion', 'position']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function error(code: string, message: string): Result<never, BoardError> {
  return { ok: false, error: { code, message } }
}

function hasOnlyFields(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isCoordinate(value: unknown): value is { row: number; column: number } {
  return isRecord(value) && hasOnlyFields(value, ['row', 'column'])
    && Number.isInteger(value.row) && Number(value.row) >= 0
    && Number.isInteger(value.column) && Number(value.column) >= 0
}

function hasValidBase(value: Record<string, unknown>): boolean {
  if (typeof value.id !== 'string' || value.id.trim().length === 0) return false
  if (value.typeVersion !== 1 || !isRecord(value.position)) return false
  if (!hasOnlyFields(value.position, ['x', 'y'])) return false
  return isFiniteNumber(value.position.x) && isFiniteNumber(value.position.y)
}

function hasTypeSpecificFields(value: Record<string, unknown>, type: BoardObject['type']): boolean {
  switch (type) {
    case 'note':
      return typeof value.text === 'string'
    case 'shape':
      return value.shapeKind === 'rectangle' && isFiniteNumber(value.width) && value.width > 0 && isFiniteNumber(value.height) && value.height > 0
    case 'array':
      if (!Array.isArray(value.values) || !Array.isArray(value.highlightedIndices)) return false
      {
        const values = value.values
        const highlightedIndices = value.highlightedIndices
        return values.every((item) => typeof item === 'string' || isFiniteNumber(item))
          && highlightedIndices.every((index) => Number.isInteger(index) && index >= 0 && index < values.length)
      }
    case 'pointer':
      return typeof value.name === 'string' && value.name.trim().length > 0
        && typeof value.targetObjectId === 'string'
        && Number.isInteger(value.index) && Number(value.index) >= 0
    case 'range':
      return typeof value.name === 'string' && value.name.trim().length > 0
        && typeof value.targetObjectId === 'string'
        && Number.isInteger(value.start) && Number(value.start) >= 0
        && Number.isInteger(value.endExclusive) && Number(value.endExclusive) >= Number(value.start)
    case 'table': {
      const rowCount = Array.isArray(value.rowLabels) ? value.rowLabels.length : 0
      const columnCount = Array.isArray(value.columnLabels) ? value.columnLabels.length : 0
      if (!Array.isArray(value.rowLabels) || !Array.isArray(value.columnLabels)
        || value.rowLabels.length < 1 || value.rowLabels.length > 20
        || value.columnLabels.length < 1 || value.columnLabels.length > 20
        || !value.rowLabels.every((label) => typeof label === 'string')
        || !value.columnLabels.every((label) => typeof label === 'string')
        || !Array.isArray(value.cells) || value.cells.length !== value.rowLabels.length
        || !value.cells.every((row) => Array.isArray(row) && row.length === columnCount
          && row.every((cell) => cell === null || typeof cell === 'string' || isFiniteNumber(cell)))
        || !Array.isArray(value.highlightedCells) || !value.highlightedCells.every(isCoordinate)
        || !Array.isArray(value.dependencies)) return false
      const valid = (coordinate: unknown): coordinate is { row: number; column: number } => isCoordinate(coordinate)
        && coordinate.row < rowCount && coordinate.column < columnCount
      if (!value.highlightedCells.every(valid)) return false
      const seenHighlights = new Set(value.highlightedCells.map((cell) => `${cell.row}:${cell.column}`))
      if (seenHighlights.size !== value.highlightedCells.length) return false
      const seenEdges = new Set<string>()
      for (const dependency of value.dependencies) {
        if (!isRecord(dependency) || !hasOnlyFields(dependency, ['from', 'to'])) return false
        const from = dependency.from
        const to = dependency.to
        if (!valid(from) || !valid(to)) return false
        if (from.row === to.row && from.column === to.column) return false
        const key = `${from.row}:${from.column}:${to.row}:${to.column}`
        if (seenEdges.has(key)) return false
        seenEdges.add(key)
      }
      return true
    }
    case 'stroke':
      return value.color === 'ink' && Array.isArray(value.points) && value.points.length >= 2
        && value.points.every((point) => isRecord(point) && hasOnlyFields(point, ['x', 'y']) && isFiniteNumber(point.x) && isFiniteNumber(point.y))
    case 'checkpoint':
      return typeof value.prompt === 'string' && typeof value.answer === 'string' && typeof value.hint === 'string'
    case 'container':
      return (value.kind === 'stack' || value.kind === 'queue') && Array.isArray(value.values) && value.values.length <= 20
        && value.values.every((item) => typeof item === 'string' || isFiniteNumber(item))
        && (value.currentIndex === undefined || value.currentIndex === null
          || Number.isInteger(value.currentIndex) && Number(value.currentIndex) >= 0 && Number(value.currentIndex) < value.values.length)
    case 'linked-list': {
      if (!Array.isArray(value.nodes) || value.nodes.length > 20) return false
      const nodes = value.nodes
      if (!nodes.every((node) => isRecord(node) && hasOnlyFields(node, ['id', 'value', 'nextId'])
        && typeof node.id === 'string' && node.id.trim().length > 0
        && (typeof node.value === 'string' || isFiniteNumber(node.value))
        && (node.nextId === null || typeof node.nextId === 'string'))) return false
      const ids = nodes.map((node) => (node as Record<string, unknown>).id as string)
      if (new Set(ids).size !== ids.length) return false
      return nodes.every((node, index) => (node as Record<string, unknown>).nextId === (ids[index + 1] ?? null))
    }
    case 'graph': {
      if (!Array.isArray(value.nodes) || value.nodes.length > 30 || !Array.isArray(value.edges) || value.edges.length > 60 || !Array.isArray(value.highlightedNodeIds)) return false
      const nodes = value.nodes
      const edges = value.edges
      if (!nodes.every((node) => isRecord(node) && hasOnlyFields(node, ['id', 'label', 'position'])
        && typeof node.id === 'string' && node.id.trim().length > 0 && typeof node.label === 'string'
        && isRecord(node.position) && hasOnlyFields(node.position, ['x', 'y']) && isFiniteNumber(node.position.x) && isFiniteNumber(node.position.y))) return false
      const nodeIds = nodes.map((node) => (node as Record<string, unknown>).id as string)
      if (new Set(nodeIds).size !== nodeIds.length) return false
      if (!edges.every((edge) => isRecord(edge) && hasOnlyFields(edge, ['id', 'from', 'to'])
        && typeof edge.id === 'string' && edge.id.trim().length > 0 && nodeIds.includes(String(edge.from))
        && nodeIds.includes(String(edge.to)) && edge.from !== edge.to)) return false
      const edgeIds = edges.map((edge) => (edge as Record<string, unknown>).id as string)
      if (new Set(edgeIds).size !== edgeIds.length) return false
      const pairs = edges.map((edge) => [(edge as Record<string, unknown>).from, (edge as Record<string, unknown>).to].sort().join(':'))
      if (new Set(pairs).size !== pairs.length) return false
      return value.highlightedNodeIds.every((id) => typeof id === 'string' && nodeIds.includes(id))
        && new Set(value.highlightedNodeIds).size === value.highlightedNodeIds.length
    }
    case 'binary-tree': {
      if (!Array.isArray(value.nodes) || value.nodes.length > 30 || !Array.isArray(value.highlightedNodeIds)) return false
      const nodes = value.nodes
      if (nodes.length === 0) return value.rootId === null && value.highlightedNodeIds.length === 0
      if (!nodes.every((node) => isRecord(node) && hasOnlyFields(node, ['id', 'value', 'leftId', 'rightId', 'position'])
        && typeof node.id === 'string' && node.id.trim().length > 0
        && (typeof node.value === 'string' || isFiniteNumber(node.value))
        && (node.leftId === null || typeof node.leftId === 'string') && (node.rightId === null || typeof node.rightId === 'string')
        && isRecord(node.position) && hasOnlyFields(node.position, ['x', 'y']) && isFiniteNumber(node.position.x) && isFiniteNumber(node.position.y))) return false
      const ids = nodes.map((node) => (node as Record<string, unknown>).id as string)
      if (new Set(ids).size !== ids.length || value.nodes.length === 0 && value.rootId !== null || value.nodes.length > 0 && (typeof value.rootId !== 'string' || !ids.includes(value.rootId))) return false
      const parents = new Map<string, number>()
      for (const node of nodes as Array<Record<string, unknown>>) {
        for (const childId of [node.leftId, node.rightId]) {
          if (childId === null) continue
          if (typeof childId !== 'string' || !ids.includes(childId)) return false
          parents.set(childId, (parents.get(childId) ?? 0) + 1)
        }
        if (node.leftId !== null && node.leftId === node.rightId) return false
      }
      if (ids.some((id) => id === value.rootId ? parents.has(id) : parents.get(id) !== 1)) return false
      const visited = new Set<string>()
      const visit = (id: string): boolean => {
        if (visited.has(id)) return false
        visited.add(id)
        const node = nodes.find((candidate) => (candidate as Record<string, unknown>).id === id) as Record<string, unknown>
        return [node.leftId, node.rightId].every((childId) => childId === null || visit(childId as string))
      }
      return visit(value.rootId as string) && visited.size === nodes.length
        && value.highlightedNodeIds.every((id) => typeof id === 'string' && ids.includes(id))
        && new Set(value.highlightedNodeIds).size === value.highlightedNodeIds.length
    }
    case 'hash-table': {
      if (!Number.isInteger(value.bucketCount) || Number(value.bucketCount) < 3 || Number(value.bucketCount) > 13 || !Array.isArray(value.entries) || value.entries.length > 50) return false
      if (!value.entries.every((entry) => isRecord(entry) && hasOnlyFields(entry, ['key', 'value'])
        && typeof entry.key === 'string' && entry.key.trim().length > 0
        && (typeof entry.value === 'string' || isFiniteNumber(entry.value)))) return false
      return new Set(value.entries.map((entry) => (entry as Record<string, unknown>).key)).size === value.entries.length
    }
    case 'heap': {
      if ((value.kind !== 'min' && value.kind !== 'max') || !Array.isArray(value.values) || value.values.length > 31 || !value.values.every(isFiniteNumber)) return false
      for (let index = 1; index < value.values.length; index += 1) {
        const parent = Number(value.values[Math.floor((index - 1) / 2)])
        if (value.kind === 'min' ? parent > Number(value.values[index]) : parent < Number(value.values[index])) return false
      }
      return true
    }
    case 'trie':
      return Array.isArray(value.words) && value.words.length <= 50
        && value.words.every((word) => typeof word === 'string' && /^[a-z]{1,24}$/.test(word))
        && new Set(value.words).size === value.words.length
  }
}

function validateObject<T extends BoardObject>(
  value: unknown,
  type: T['type'],
  fields: string[],
): Result<T, BoardError> {
  if (!isRecord(value)) return error('invalid_object', 'Object must be a record.')
  if (value.type !== type) return error('invalid_object', `Expected object type ${type}.`)
  if (value.typeVersion !== 1) return error('unsupported_object_version', `Object type ${type} version is not supported.`)
  if (!hasOnlyFields(value, [...baseFields, ...fields])) return error('unknown_field', 'Object contains unknown fields.')
  if (type === 'array' && Array.isArray(value.highlightedIndices) && Array.isArray(value.values)) {
    const valuesLength = value.values.length
    if (!value.highlightedIndices.every((index) => Number.isInteger(index) && index >= 0 && index < valuesLength)) {
    return error('invalid_highlight_index', 'Array highlight indices must point to existing values.')
    }
  }
  if (!hasValidBase(value) || !hasTypeSpecificFields(value, type)) return error('invalid_object', `Object data for ${type} is invalid.`)
  return { ok: true, value: value as T }
}

export const objectRegistry: ObjectRegistry = {
  note: {
    type: 'note',
    typeVersion: 1,
    validate: (value) => validateObject<NoteObject>(value, 'note', ['text']),
  },
  shape: {
    type: 'shape',
    typeVersion: 1,
    validate: (value) => validateObject<ShapeObject>(value, 'shape', ['shapeKind', 'width', 'height']),
  },
  array: {
    type: 'array',
    typeVersion: 1,
    validate: (value) => validateObject<ArrayObject>(value, 'array', ['values', 'highlightedIndices']),
  },
  pointer: {
    type: 'pointer',
    typeVersion: 1,
    validate: (value) => validateObject<PointerObject>(value, 'pointer', ['name', 'targetObjectId', 'index']),
  },
  range: {
    type: 'range',
    typeVersion: 1,
    validate: (value) => validateObject<RangeObject>(value, 'range', ['name', 'targetObjectId', 'start', 'endExclusive']),
  },
  table: {
    type: 'table',
    typeVersion: 1,
    validate: (value) => validateObject<TableObject>(value, 'table', ['rowLabels', 'columnLabels', 'cells', 'highlightedCells', 'dependencies']),
  },
  stroke: {
    type: 'stroke',
    typeVersion: 1,
    validate: (value) => validateObject<StrokeObject>(value, 'stroke', ['points', 'color']),
  },
  checkpoint: {
    type: 'checkpoint',
    typeVersion: 1,
    validate: (value) => validateObject<CheckpointObject>(value, 'checkpoint', ['prompt', 'answer', 'hint']),
  },
  container: {
    type: 'container',
    typeVersion: 1,
    validate: (value) => validateObject<ContainerObject>(value, 'container', ['kind', 'values', 'currentIndex']),
  },
  'linked-list': {
    type: 'linked-list',
    typeVersion: 1,
    validate: (value) => validateObject<LinkedListObject>(value, 'linked-list', ['nodes']),
  },
  graph: {
    type: 'graph',
    typeVersion: 1,
    validate: (value) => validateObject<GraphObject>(value, 'graph', ['nodes', 'edges', 'highlightedNodeIds']),
  },
  'binary-tree': {
    type: 'binary-tree',
    typeVersion: 1,
    validate: (value) => validateObject<BinaryTreeObject>(value, 'binary-tree', ['rootId', 'nodes', 'highlightedNodeIds']),
  },
  'hash-table': {
    type: 'hash-table',
    typeVersion: 1,
    validate: (value) => validateObject<HashTableObject>(value, 'hash-table', ['bucketCount', 'entries']),
  },
  heap: {
    type: 'heap',
    typeVersion: 1,
    validate: (value) => validateObject<HeapObject>(value, 'heap', ['kind', 'values']),
  },
  trie: {
    type: 'trie',
    typeVersion: 1,
    validate: (value) => validateObject<TrieObject>(value, 'trie', ['words']),
  },
}

function validateReferences(objects: BoardObject[]): Result<void, BoardError> {
  const objectsById = new Map(objects.map((object) => [object.id, object]))

  for (const object of objects) {
    if (object.type === 'pointer' || object.type === 'range') {
      const target = objectsById.get(object.targetObjectId)
      if (!target || target.type !== 'array') {
        return error('invalid_reference', `${object.type} ${object.id} must target an array.`)
      }
      if (object.type === 'pointer' && object.index >= target.values.length && !(target.values.length === 0 && object.index === 0)) {
        return error('invalid_reference', `Pointer ${object.id} is outside its target array.`)
      }
      if (object.type === 'range' && object.endExclusive > target.values.length) {
        return error('invalid_range', `Range ${object.id} is outside its target array.`)
      }
    }
  }

  return { ok: true, value: undefined }
}

export function validateBoard(value: unknown): Result<BoardDocument, BoardError> {
  if (!isRecord(value)) return error('invalid_document', 'Board document must be a record.')
  if (!hasOnlyFields(value, ['id', 'schemaVersion', 'objects'])) return error('unknown_field', 'Board document contains unknown fields.')
  if (typeof value.id !== 'string' || value.id.trim().length === 0 || !Array.isArray(value.objects)) {
    return error('invalid_document', 'Board ID and object list are required.')
  }
  if (value.schemaVersion !== 1) return error('unsupported_schema_version', 'Board schema version is not supported.')

  const validatedObjects: BoardObject[] = []
  const ids = new Set<string>()

  for (const candidate of value.objects) {
    if (!isRecord(candidate)) return error('invalid_object', 'Board objects must be records.')
    const type = candidate.type
    if (typeof type !== 'string' || !Object.hasOwn(objectRegistry, type)) {
      return error('unsupported_object_type', 'Board contains an unsupported object type.')
    }
    const result = objectRegistry[type as BoardObject['type']].validate(candidate)
    if (!result.ok) return result
    if (ids.has(result.value.id)) return error('duplicate_object_id', `Object ID ${result.value.id} is duplicated.`)
    ids.add(result.value.id)
    validatedObjects.push(result.value)
  }

  const references = validateReferences(validatedObjects)
  if (!references.ok) return references

  return { ok: true, value: value as unknown as BoardDocument }
}
