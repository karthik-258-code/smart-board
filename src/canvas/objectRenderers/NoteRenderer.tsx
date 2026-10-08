import type { NoteObject } from '../../domain/model'

export function NoteRenderer({ object }: { object: NoteObject }) {
  return (
    <>
      <rect className="board-note" width="190" height="110" rx="12" />
      <path className="board-note-fold" d="M158 0v30h32" />
      <text className="board-note-text" x="16" y="28">{object.text || 'New note'}</text>
    </>
  )
}
