import { useEffect, useMemo, useState } from 'react'
import { BoardCanvas } from '../canvas/BoardCanvas'
import { createEmptyBoard, type BoardDocument, type BoardObject } from '../domain/model'
import { dispatch as dispatchHistory, redo, stateAt, undo, type HistoryState } from '../domain/history'
import { evaluateArrayComparison, type BoardOperation } from '../domain/operations'
import { loadBoardHistory, saveBoardHistory } from '../persistence/localBoardStore'
import { BoardFileControls } from './BoardFileControls'
import { PracticeDialog } from './PracticeDialog'
import { BoardInspector, type ComparisonSummary } from './BoardInspector'
import { HistoryControls } from './HistoryControls'
import { BoardToolbar, type BoardTool } from './BoardToolbar'
import { SaveStatus, type SaveState } from './SaveStatus'
import { ThemeControl } from './ThemeControl'
import './App.css'
import '../styles/themes.css'

let fallbackId = 0
const storageKey = 'smart-board:document:v1'
function createObjectId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `board-object-${++fallbackId}`
}

function nextObjectPosition(objects: BoardObject[]) {
  const occupied = new Set(objects.map((object) => `${object.position.x},${object.position.y}`))
  for (let slot = 0; slot <= objects.length; slot += 1) {
    const position = { x: 36 + (slot % 4) * 230, y: 36 + Math.floor(slot / 4) * 150 }
    if (!occupied.has(`${position.x},${position.y}`)) return position
  }
  return { x: 36, y: 36 + objects.length * 150 }
}

type StartupState = {
  storage: Storage | null
  history: HistoryState
  saveState: SaveState
  problem: string | null
  recoveryNeeded: boolean
}

function loadStartupState(): StartupState {
  const emptyBoard = createEmptyBoard('smart-board')
  let storage: Storage
  try {
    if (typeof window === 'undefined') throw new Error('No browser storage')
    storage = window.localStorage
  } catch {
    return { storage: null, history: { initialDocument: emptyBoard, entries: [], cursor: 0 }, saveState: 'error', problem: 'Browser storage is unavailable.', recoveryNeeded: false }
  }

  const result = loadBoardHistory(storage, storageKey)
  if (!result.ok) {
    const recoveryNeeded = ['invalid_json', 'invalid_document', 'invalid_history'].includes(result.error.code)
    return {
      storage,
      history: { initialDocument: emptyBoard, entries: [], cursor: 0 },
      saveState: 'error',
      problem: result.error.message,
      recoveryNeeded,
    }
  }
  const history = result.value ?? { initialDocument: emptyBoard, entries: [], cursor: 0 }
  return {
    storage,
    history,
    saveState: result.value ? 'saved' : 'new',
    problem: null,
    recoveryNeeded: false,
  }
}

function App() {
  const [startup] = useState<StartupState>(loadStartupState)
  const [history, setHistory] = useState<HistoryState>(startup.history)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>(startup.saveState)
  const [saveProblem, setSaveProblem] = useState<string | null>(startup.problem)
  const [recoveryNeeded, setRecoveryNeeded] = useState(startup.recoveryNeeded)
  const [preserveSavedData, setPreserveSavedData] = useState(startup.recoveryNeeded)
  const [playing, setPlaying] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [practiceId, setPracticeId] = useState<string | null>(null)

  const board = useMemo(() => {
    const result = stateAt(history, history.cursor)
    return result.ok ? result.value : history.initialDocument
  }, [history])
  const selectedObject = board.objects.find((object) => object.id === selectedId) ?? null
  const practiceObject = board.objects.find((object) => object.id === practiceId)
  const practiceCheckpoint = practiceObject?.type === 'checkpoint' ? practiceObject : null
  const selectedArray = selectedObject?.type === 'array'
    ? selectedObject
    : selectedObject?.type === 'pointer' || selectedObject?.type === 'range'
      ? board.objects.find((object) => object.id === selectedObject.targetObjectId && object.type === 'array') as Extract<BoardObject, { type: 'array' }> | undefined ?? null
      : null
  let comparison: ComparisonSummary | null = null
  const lastOperation = history.cursor > 0 ? history.entries[history.cursor - 1]?.operation : null
  if (lastOperation?.type === 'array/compare-values') {
    const array = board.objects.find((object) => object.id === lastOperation.objectId && object.type === 'array')
    if (array?.type === 'array') {
      const result = evaluateArrayComparison(array.values, lastOperation, array.id)
      if (result.ok) {
        comparison = {
          arrayId: array.id,
          firstValue: array.values[lastOperation.firstIndex],
          secondValue: array.values[lastOperation.secondIndex],
          operator: lastOperation.operator,
          result: result.value,
        }
      }
    }
  }

  function persistSnapshot(nextHistory: HistoryState) {
    if (preserveSavedData) {
      setSaveState('preserved')
      return
    }
    if (!startup.storage) {
      setSaveState('error')
      setSaveProblem('Browser storage is unavailable. Changes are only in this session.')
      return
    }
    const saved = saveBoardHistory(startup.storage, storageKey, nextHistory)
    if (saved.ok) {
      setSaveState('saved')
      setSaveProblem(null)
    } else {
      setSaveState('error')
      setSaveProblem(saved.error.message)
    }
  }

  function moveHistory(nextHistory: HistoryState) {
    setPlaying(false)
    setHistory(nextHistory)
    persistSnapshot(nextHistory)
  }

  function onOperation(operation: BoardOperation): boolean {
    setPlaying(false)
    const result = dispatchHistory(history, operation)
    if (!result.ok) {
      setError(result.error.message)
      return false
    }
    setHistory(result.value)
    setError(null)
    persistSnapshot(result.value)
    return true
  }

  function keepSavedData() {
    setPreserveSavedData(true)
    setRecoveryNeeded(false)
    setSaveState('preserved')
    setSaveProblem(null)
  }

  function startNewBoard() {
    setPlaying(false)
    const document = createEmptyBoard('smart-board')
    setHistory({ initialDocument: document, entries: [], cursor: 0 })
    setSelectedId(null)
    if (!startup.storage) {
      setSaveState('error')
      setSaveProblem('Browser storage is unavailable. The new board is only in this session.')
      return
    }
    const nextHistory: HistoryState = { initialDocument: document, entries: [], cursor: 0 }
    const result = saveBoardHistory(startup.storage, storageKey, nextHistory)
    if (result.ok) {
      setPreserveSavedData(false)
      setRecoveryNeeded(false)
      setSaveState('saved')
      setSaveProblem(null)
    } else {
      setPreserveSavedData(true)
      setSaveState('error')
      setSaveProblem(result.error.message)
    }
  }

  function importDocument(importedHistory: HistoryState) {
    setPlaying(false)
    setHistory(importedHistory)
    setSelectedId(null)
    setError(null)
    setPreserveSavedData(false)
    setRecoveryNeeded(false)
    if (!startup.storage) {
      setSaveState('error')
      setSaveProblem('Browser storage is unavailable. The imported board is only in this session.')
      return
    }
    const saved = saveBoardHistory(startup.storage, storageKey, importedHistory)
    if (saved.ok) {
      setSaveState('saved')
      setSaveProblem(null)
    } else {
      setSaveState('error')
      setSaveProblem(saved.error.message)
    }
  }

  function addObject(type: BoardTool) {
    const position = nextObjectPosition(board.objects)
    let object: BoardObject
    if (type === 'note') object = { id: createObjectId(), type: 'note', typeVersion: 1, position, text: 'New idea' }
    else if (type === 'shape') object = { id: createObjectId(), type: 'shape', typeVersion: 1, position, shapeKind: 'rectangle', width: 150, height: 92 }
    else if (type === 'empty-array') object = { id: createObjectId(), type: 'array', typeVersion: 1, position, values: [], highlightedIndices: [] }
    else if (type === 'array') object = { id: createObjectId(), type: 'array', typeVersion: 1, position, values: [4, 8, 12], highlightedIndices: [] }
    else if (type === 'table') object = {
      id: createObjectId(), type: 'table', typeVersion: 1, position,
      rowLabels: ['0', '1', '2'], columnLabels: ['0', '1', '2'],
      cells: [[null, null, null], [null, null, null], [null, null, null]], highlightedCells: [], dependencies: [],
    }
    else if (type === 'checkpoint') object = { id: createObjectId(), type: 'checkpoint', typeVersion: 1, position, prompt: '', answer: '', hint: '' }
    else if (type === 'stack') object = { id: createObjectId(), type: 'container', typeVersion: 1, position, kind: 'stack', values: [] }
    else if (type === 'queue') object = { id: createObjectId(), type: 'container', typeVersion: 1, position, kind: 'queue', values: [] }
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

  function addStroke(stroke: { position: BoardDocument['objects'][number]['position']; points: Array<{ x: number; y: number }>; color: 'ink' }) {
    const object: BoardObject = { id: createObjectId(), type: 'stroke', typeVersion: 1, ...stroke }
    onOperation({ type: 'object/add', object })
  }

  function togglePlayback() {
    if (playing) setPlaying(false)
    else if (history.cursor < history.entries.length) setPlaying(true)
  }

  useEffect(() => {
    if (!playing) return
    if (history.cursor >= history.entries.length) {
      setPlaying(false)
      return
    }
    const timeoutId = window.setTimeout(() => {
      const nextHistory = { ...history, cursor: history.cursor + 1 }
      setHistory(nextHistory)
      persistSnapshot(nextHistory)
      if (nextHistory.cursor >= nextHistory.entries.length) setPlaying(false)
    }, 700)
    return () => window.clearTimeout(timeoutId)
  }, [history, playing])

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
          <BoardFileControls history={history} onImport={importDocument} onError={setError} />
          <ThemeControl dark={dark} onToggle={() => setDark((value) => !value)} />
        </div>
      </header>

      <SaveStatus
        status={saveState}
        problem={saveProblem}
        recoveryNeeded={recoveryNeeded}
        onKeepSavedData={keepSavedData}
        onStartNewBoard={startNewBoard}
      />

      <div className="workspace-heading">
        <div>
          <h2>Algorithm workspace</h2>
          <p>Make an idea visible. Move pieces around as your thinking changes.</p>
        </div>
        <HistoryControls
          cursor={history.cursor}
          total={history.entries.length}
          playing={playing}
          onTogglePlayback={togglePlayback}
          onUndo={() => moveHistory(undo(history))}
          onRedo={() => moveHistory(redo(history))}
          onPrevious={() => moveHistory({ ...history, cursor: Math.max(0, history.cursor - 1) })}
          onNext={() => moveHistory({ ...history, cursor: Math.min(history.entries.length, history.cursor + 1) })}
          onRestart={() => moveHistory({ ...history, cursor: 0 })}
        />
      </div>

      <div className="workspace-layout">
        <BoardToolbar onAdd={addObject} selectedArray={selectedArray} drawingMode={drawingMode} onToggleDrawing={() => setDrawingMode((value) => !value)} />
        <section className="canvas-frame" aria-label="Board workspace">
          <div className="canvas-topline"><span>Untitled board</span><span>Drag to move · Click to edit</span></div>
          <BoardCanvas document={board} selectedId={selectedId} onSelect={setSelectedId} onOperation={onOperation} drawingMode={drawingMode} onCreateStroke={addStroke} />
        </section>
        <BoardInspector object={selectedObject} onOperation={onOperation} onDuplicate={duplicateObject} onRemove={removeObject} comparison={comparison} onPractice={setPracticeId} />
      </div>
      {error && <p className="operation-error" role="alert">{error}</p>}
      {practiceCheckpoint && <PracticeDialog key={practiceCheckpoint.id} checkpoint={practiceCheckpoint} onClose={() => setPracticeId(null)} />}
    </main>
  )
}

export default App
