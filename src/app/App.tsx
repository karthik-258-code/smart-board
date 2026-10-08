import { useMemo, useState } from 'react'
import { BoardCanvas } from '../canvas/BoardCanvas'
import { createEmptyBoard, type BoardObject } from '../domain/model'
import { dispatch as dispatchHistory, redo, stateAt, undo, type HistoryState } from '../domain/history'
import type { BoardOperation } from '../domain/operations'
import { BoardInspector } from './BoardInspector'
import { HistoryControls } from './HistoryControls'
import { BoardToolbar, type BoardTool } from './BoardToolbar'
import { ThemeControl } from './ThemeControl'
import './App.css'
import '../styles/themes.css'

let fallbackId = 0
function createObjectId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `board-object-${++fallbackId}`
}

function App() {
  const [history, setHistory] = useState<HistoryState>(() => ({ initialDocument: createEmptyBoard('smart-board'), entries: [], cursor: 0 }))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const board = useMemo(() => {
    const result = stateAt(history, history.cursor)
    return result.ok ? result.value : history.initialDocument
  }, [history])
  const selectedObject = board.objects.find((object) => object.id === selectedId) ?? null
  const selectedArray = selectedObject?.type === 'array'
    ? selectedObject
    : selectedObject?.type === 'pointer' || selectedObject?.type === 'range'
      ? board.objects.find((object) => object.id === selectedObject.targetObjectId && object.type === 'array') as Extract<BoardObject, { type: 'array' }> | undefined ?? null
      : null

  function onOperation(operation: BoardOperation): boolean {
    const result = dispatchHistory(history, operation)
    if (!result.ok) {
      setError(result.error.message)
      return false
    }
    setHistory(result.value)
    setError(null)
    return true
  }

  function addObject(type: BoardTool) {
    const index = board.objects.length
    const position = { x: 36 + (index % 4) * 230, y: 36 + Math.floor(index / 4) * 150 }
    let object: BoardObject
    if (type === 'note') object = { id: createObjectId(), type: 'note', typeVersion: 1, position, text: 'New idea' }
    else if (type === 'shape') object = { id: createObjectId(), type: 'shape', typeVersion: 1, position, shapeKind: 'rectangle', width: 150, height: 92 }
    else if (type === 'empty-array') object = { id: createObjectId(), type: 'array', typeVersion: 1, position, values: [], highlightedIndices: [] }
    else if (type === 'array') object = { id: createObjectId(), type: 'array', typeVersion: 1, position, values: [4, 8, 12], highlightedIndices: [] }
    else {
      if (!selectedArray) return
      if (type === 'pointer') {
        if (selectedArray.values.length === 0) return
        object = { id: createObjectId(), type: 'pointer', typeVersion: 1, position: { x: selectedArray.position.x, y: selectedArray.position.y - 38 }, name: 'i', targetObjectId: selectedArray.id, index: 0 }
      } else {
        object = { id: createObjectId(), type: 'range', typeVersion: 1, position: { x: selectedArray.position.x, y: selectedArray.position.y + 96 }, name: 'window', targetObjectId: selectedArray.id, start: 0, endExclusive: Math.min(2, selectedArray.values.length) }
      }
    }

    if (onOperation({ type: 'object/add', object })) setSelectedId(object.id)
  }

  function duplicateObject(object: BoardObject) {
    const copy = { ...object, id: createObjectId(), position: { x: object.position.x + 28, y: object.position.y + 28 } } as BoardObject
    if (onOperation({ type: 'object/add', object: copy })) setSelectedId(copy.id)
  }

  function removeObject(objectId: string) {
    if (onOperation({ type: 'object/remove', objectId })) setSelectedId(null)
  }

  return (
    <main className="app-shell" data-theme={dark ? 'dark' : 'light'}>
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <h1>Smart Board</h1>
        </div>
        <div className="header-actions">
          <span className="board-status">{board.objects.length} {board.objects.length === 1 ? 'object' : 'objects'}</span>
          <ThemeControl dark={dark} onToggle={() => setDark((value) => !value)} />
        </div>
      </header>

      <div className="workspace-heading">
        <div>
          <h2>Algorithm workspace</h2>
          <p>Make an idea visible. Move pieces around as your thinking changes.</p>
        </div>
        <HistoryControls
          cursor={history.cursor}
          total={history.entries.length}
          onUndo={() => setHistory((state) => undo(state))}
          onRedo={() => setHistory((state) => redo(state))}
          onPrevious={() => setHistory((state) => ({ ...state, cursor: Math.max(0, state.cursor - 1) }))}
          onNext={() => setHistory((state) => ({ ...state, cursor: Math.min(state.entries.length, state.cursor + 1) }))}
          onRestart={() => setHistory((state) => ({ ...state, cursor: 0 }))}
        />
      </div>

      <div className="workspace-layout">
        <BoardToolbar onAdd={addObject} selectedArray={selectedArray} />
        <section className="canvas-frame" aria-label="Board workspace">
          <div className="canvas-topline"><span>Untitled board</span><span>Click an object to edit</span></div>
          <BoardCanvas document={board} selectedId={selectedId} onSelect={setSelectedId} onOperation={onOperation} />
        </section>
        <BoardInspector object={selectedObject} onOperation={onOperation} onDuplicate={duplicateObject} onRemove={removeObject} />
      </div>
      {error && <p className="operation-error" role="alert">{error}</p>}
    </main>
  )
}

export default App
