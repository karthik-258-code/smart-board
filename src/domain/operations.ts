import type { BoardDocument, BoardObject, BoardPosition } from './model'
import { validateBoard } from './objectRegistry'
import type { Result } from './result'

export type BoardOperation =
  | { type: 'object/add'; object: BoardObject }
  | { type: 'object/remove'; objectId: string }
  | { type: 'object/update-position'; objectId: string; position: BoardPosition }
  | { type: 'note/update-text'; objectId: string; text: string }
  | { type: 'array/set-value'; objectId: string; index: number; value: string | number }
  | { type: 'array/set-highlight'; objectId: string; indices: number[] }
  | { type: 'pointer/move'; objectId: string; index: number }
  | { type: 'range/set'; objectId: string; start: number; endExclusive: number }

export type OperationError = { code: string; message: string; objectId?: string; index?: number }

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
    case 'range/set':
      if (current.type !== 'range') return fail('incompatible_object', 'Operation requires a range.', current.id)
      updated = { ...current, start: operation.start, endExclusive: operation.endExclusive }
      inverse = { type: operation.type, objectId: current.id, start: current.start, endExclusive: current.endExclusive }
      break
  }

  const objects = [...document.objects]
  objects[objectIndex] = updated
  return finish({ ...document, objects }, inverse)
}
