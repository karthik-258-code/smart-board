import type { ArrayObject } from '../domain/model'

export type BoardTool = 'note' | 'shape' | 'array' | 'empty-array' | 'table' | 'pointer' | 'range'

export function BoardToolbar({ onAdd, selectedArray }: { onAdd: (type: BoardTool) => void; selectedArray: ArrayObject | null }) {
  return (
    <nav className="board-toolbar" aria-label="Board tools">
      <p>Place on board</p>
      <button type="button" onClick={() => onAdd('note')}>Add note</button>
      <button type="button" onClick={() => onAdd('shape')}>Add rectangle</button>
      <button type="button" onClick={() => onAdd('array')}>Add array</button>
      <button type="button" onClick={() => onAdd('empty-array')}>Add empty array</button>
      <button type="button" onClick={() => onAdd('table')}>Add DP table</button>
      <div className="toolbar-divider" />
      <p>Algorithm markers</p>
      <button type="button" disabled={!selectedArray || selectedArray.values.length === 0} onClick={() => onAdd('pointer')}>Add pointer</button>
      <button type="button" disabled={!selectedArray} onClick={() => onAdd('range')}>Add range</button>
    </nav>
  )
}
