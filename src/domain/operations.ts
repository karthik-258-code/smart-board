import type { ArrayObject, BoardDocument, BoardObject, BoardPosition, PointerObject, RangeObject, TableCoordinate, TableDependency } from './model'
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
  }

  const objects = [...document.objects]
  objects[objectIndex] = updated
  return finish({ ...document, objects }, inverse)
}
