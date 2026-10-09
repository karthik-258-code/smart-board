import type { ArrayObject } from '../domain/model'
import { ExamplePicker } from './ExamplePicker'

export type BoardTool = 'note' | 'shape' | 'array' | 'empty-array' | 'table' | 'checkpoint' | 'stack' | 'queue' | 'pointer' | 'range'

export function BoardToolbar({ onAdd, selectedArray, drawingMode, onToggleDrawing, onLoadExample }: { onAdd: (type: BoardTool) => void; selectedArray: ArrayObject | null; drawingMode: boolean; onToggleDrawing: () => void; onLoadExample: (id: string) => void }) {
  return (
    <nav className="board-toolbar" aria-label="Board tools">
      <ExamplePicker onLoad={onLoadExample} />
      <div className="toolbar-divider" />
      <p>Place on board</p>
      <button type="button" onClick={() => onAdd('note')}>Add note</button>
      <button type="button" onClick={() => onAdd('shape')}>Add rectangle</button>
      <button type="button" onClick={() => onAdd('array')}>Add array</button>
      <button type="button" onClick={() => onAdd('empty-array')}>Add empty array</button>
      <button type="button" onClick={() => onAdd('table')}>Add DP table</button>
      <button type="button" onClick={() => onAdd('checkpoint')}>Add checkpoint</button>
      <button type="button" onClick={() => onAdd('stack')}>Add stack</button>
      <button type="button" onClick={() => onAdd('queue')}>Add queue</button>
      <button type="button" aria-pressed={drawingMode} onClick={onToggleDrawing}>{drawingMode ? 'Finish drawing' : 'Draw'}</button>
      <div className="toolbar-divider" />
      <p>Algorithm markers</p>
      <button type="button" disabled={!selectedArray || selectedArray.values.length === 0} onClick={() => onAdd('pointer')}>Add pointer</button>
      <button type="button" disabled={!selectedArray} onClick={() => onAdd('range')}>Add range</button>
    </nav>
  )
}
