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
