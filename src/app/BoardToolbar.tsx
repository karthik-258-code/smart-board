export type BoardTool = 'note' | 'shape' | 'array'

export function BoardToolbar({ onAdd }: { onAdd: (type: BoardTool) => void }) {
  return (
    <nav className="board-toolbar" aria-label="Board tools">
      <p>Place on board</p>
      <button type="button" onClick={() => onAdd('note')}>Add note</button>
      <button type="button" onClick={() => onAdd('shape')}>Add rectangle</button>
      <button type="button" onClick={() => onAdd('array')}>Add array</button>
    </nav>
  )
}
