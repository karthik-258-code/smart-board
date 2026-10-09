import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createEmptyBoard } from '../domain/model'
import { dispatch, stateAt, undo, type HistoryState } from '../domain/history'
import { serializeBoardFile } from '../persistence/boardFile'

const storageKey = 'smart-board:document:v1'

function savedBoard() {
  const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
  if (parsed.format === 'smart-board-history') {
    const current = stateAt(parsed.history as HistoryState, parsed.history.cursor)
    return current.ok ? current.value : null
  }
  return parsed
}

beforeEach(() => localStorage.clear())
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Smart Board app shell', () => {
  function createTimeline() {
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Note text' }), { target: { value: 'Edited note' } })
  }

  it('shows Smart Board as the page heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Smart Board', level: 1 })).toBeInTheDocument()
  })

  it('exposes an accessible board region', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'Board canvas' })).toBeInTheDocument()
  })

  it('adds note, rectangle, and array objects to the board', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    const canvas = within(screen.getByRole('region', { name: 'Board canvas' }))
    expect(canvas.getByRole('button', { name: /Note:/ })).toBeInTheDocument()
    expect(canvas.getByRole('button', { name: /Rectangle/ })).toBeInTheDocument()
    expect(canvas.getByRole('button', { name: /Array:/ })).toBeInTheDocument()
  })

  it('adds, edits, reverses, and replays a linked list', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add linked list' }))
    const canvas = within(screen.getByRole('region', { name: 'Board canvas' }))
    const list = canvas.getByRole('button', { name: /Linked list/ })
    expect(list.querySelectorAll('.linked-list-node')).toHaveLength(3)
    expect(list.querySelectorAll('.linked-list-link')).toHaveLength(2)

    fireEvent.change(screen.getByRole('textbox', { name: 'Linked list value' }), { target: { value: '16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Append node' }))
    expect(list.querySelectorAll('.linked-list-node')).toHaveLength(4)
    await waitFor(() => expect(savedBoard().objects[0].nodes.map((node: { value: number }) => node.value)).toEqual([4, 8, 12, 16]))

    fireEvent.click(screen.getByRole('button', { name: 'Reverse linked list' }))
    await waitFor(() => expect(savedBoard().objects[0].nodes.map((node: { value: number }) => node.value)).toEqual([16, 12, 8, 4]))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(savedBoard().objects[0].nodes.map((node: { value: number }) => node.value)).toEqual([4, 8, 12, 16])
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(savedBoard().objects[0].nodes.map((node: { value: number }) => node.value)).toEqual([16, 12, 8, 4])
  })

  it('adds a DP table, edits and highlights cells, links dependencies, and saves it', () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add DP table' }))
    const table = screen.getByRole('button', { name: 'DP table, 3 rows by 3 columns' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Cell value' }), { target: { value: '5' } })
    expect(table).toHaveTextContent('5')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Highlight selected table cell' }))
    expect(table.querySelector('.table-cell-highlighted')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add dependency' }))
    expect(table.querySelector('.table-dependency')).toBeInTheDocument()
    expect(savedBoard().objects[0]).toMatchObject({
      type: 'table', cells: [[5, null, null], [null, null, null], [null, null, null]],
      highlightedCells: [{ row: 0, column: 0 }],
      dependencies: [{ from: { row: 0, column: 0 }, to: { row: 1, column: 1 } }],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(table.querySelector('.table-dependency')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(table.querySelector('.table-dependency')).toBeInTheDocument()
    view.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'DP table, 3 rows by 3 columns' })).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: 'DP table, 3 rows by 3 columns' }).querySelector('.table-dependency')).toBeInTheDocument()
  })

  it('draws strokes as one undoable, saved board object', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    expect(screen.getByRole('button', { name: 'Finish drawing' })).toHaveAttribute('aria-pressed', 'true')
    const svg = screen.getByLabelText('Board objects')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 360, width: 600, height: 360, toJSON: () => ({}) })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 8, clientX: 10, clientY: 20 })
    fireEvent.pointerMove(svg, { pointerId: 8, clientX: 20, clientY: 30 })
    fireEvent.pointerUp(svg, { pointerId: 8, clientX: 35, clientY: 45 })
    const stroke = screen.getByRole('button', { name: 'Freehand drawing' })
    expect(stroke.querySelector('.board-stroke')).toHaveAttribute('d', 'M 0 0 Q 20 20 35 35 L 50 50')
    expect(savedBoard().objects[0]).toMatchObject({ type: 'stroke', position: { x: 20, y: 40 }, color: 'ink' })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.queryByRole('button', { name: 'Freehand drawing' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('button', { name: 'Freehand drawing' })).toBeInTheDocument()
  })

  it('authors a portable checkpoint and opens a fresh practice attempt each time', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add checkpoint' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Practice prompt' }), { target: { value: 'What is the next value?' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Expected answer' }), { target: { value: '8' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Practice hint' }), { target: { value: 'Double four.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Practice checkpoint' }))
    expect(screen.getByRole('dialog', { name: 'Make a prediction' })).toBeInTheDocument()
    expect(screen.queryByText('8', { selector: '.practice-reveal' })).not.toBeInTheDocument()
    const savedCheckpoint = localStorage.getItem(storageKey)
    fireEvent.change(screen.getByRole('textbox', { name: 'Your prediction' }), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct prediction')
    expect(localStorage.getItem(storageKey)).toBe(savedCheckpoint)
    fireEvent.click(screen.getByRole('button', { name: 'Close practice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Practice checkpoint' }))
    expect(screen.getByRole('textbox', { name: 'Your prediction' })).toHaveValue('')
    expect(savedBoard().objects[0]).toMatchObject({
      type: 'checkpoint', prompt: 'What is the next value?', answer: '8', hint: 'Double four.',
    })
  })

  it('uses stack LIFO and queue FIFO actions with reversible history', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add stack' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'stack value' }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'stack value' }), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    expect(screen.getByRole('button', { name: 'Stack: 4, 8' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pop' }))
    expect(screen.getByRole('button', { name: 'Stack: 4' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Stack: 4, 8' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add queue' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'queue value' }), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enqueue' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'queue value' }), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enqueue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dequeue' }))
    expect(screen.getByRole('button', { name: 'Queue: 7' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Queue: 3, 7' })).toBeInTheDocument()
    expect(savedBoard().objects).toHaveLength(2)
  })

  it('loads a replayable algorithm example and persists its history', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm example' }), { target: { value: 'array-traversal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load example' }))
    expect(screen.getByRole('button', { name: 'Array: 2, 4, 6, 8' })).toBeInTheDocument()
    expect(screen.getByText('Step 0 of 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').history.entries).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('button', { name: 'Array: 2, 4, 6, 8' }).querySelector('.array-cell-highlighted')).toBeInTheDocument()
  })

  it('keeps the current board when example replacement is canceled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const storedBefore = localStorage.getItem(storageKey)
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm example' }), { target: { value: 'binary-search' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load example' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Note: New idea' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKey)).toBe(storedBefore)
  })

  it('selects an object and edits its note and position from the inspector', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const canvas = within(screen.getByRole('region', { name: 'Board canvas' }))
    fireEvent.click(canvas.getByRole('button', { name: /Note:/ }))

    const inspector = screen.getByRole('complementary', { name: 'Object inspector' })
    const noteText = within(inspector).getByRole('textbox', { name: 'Note text' })
    fireEvent.change(noteText, { target: { value: 'Binary search' } })
    fireEvent.change(within(inspector).getByRole('spinbutton', { name: 'Position X' }), { target: { value: '140' } })
    expect(canvas.getByRole('button', { name: 'Note: Binary search' })).toBeInTheDocument()
  })

  it('creates unique IDs for repeated additions and toggles theme accessibly', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const canvas = within(screen.getByRole('region', { name: 'Board canvas' }))
    expect(canvas.getAllByRole('button', { name: /Note:/ })).toHaveLength(2)

    const themeButton = screen.getByRole('button', { name: 'Use dark theme' })
    fireEvent.click(themeButton)
    expect(screen.getByRole('button', { name: 'Use light theme' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('loads and saves board documents locally', () => {
    localStorage.setItem(storageKey, JSON.stringify({ id: 'saved-board', schemaVersion: 1, objects: [{ id: 'saved-note', type: 'note', typeVersion: 1, position: { x: 4, y: 5 }, text: 'Restore me' }] }))
    const view = render(<App />)
    expect(screen.getByRole('button', { name: 'Note: Restore me' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    expect(savedBoard().objects).toHaveLength(2)
    view.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Note: Restore me' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Note: New idea' })).not.toBeInTheDocument()
  })

  it('restores timeline cursor and redo steps after reload', () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Note text' }), { target: { value: 'Second state' } })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    view.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Note: New idea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('button', { name: 'Note: Second state' })).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
  })

  it('imports valid board files after confirmation and saves imported data', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const imported = { id: 'shared-board', schemaVersion: 1, objects: [{ id: 'shared-note', type: 'note', typeVersion: 1, position: { x: 40, y: 50 }, text: 'Shared idea' }] }
    const file = new File([JSON.stringify(imported)], 'shared.smart-board.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Import board file'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Note: Shared idea' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Note: New idea' })).not.toBeInTheDocument()
    expect(savedBoard()).toEqual(imported)
    expect(screen.getByText('Step 0 of 0')).toBeInTheDocument()
  })

  it('imports a shared timeline with its redo branch and cursor', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const note = { id: 'lesson-note', type: 'note' as const, typeVersion: 1 as const, position: { x: 0, y: 0 }, text: 'First state' }
    let history: HistoryState = { initialDocument: { ...createEmptyBoard('lesson'), objects: [note] }, entries: [], cursor: 0 }
    const second = dispatch(history, { type: 'note/update-text', objectId: note.id, text: 'Second state' })
    if (!second.ok) throw new Error(second.error.message)
    const third = dispatch(second.value, { type: 'note/update-text', objectId: note.id, text: 'Third state' })
    if (!third.ok) throw new Error(third.error.message)
    history = undo(third.value)
    const serialized = serializeBoardFile(history)
    if (!serialized.ok) throw new Error(serialized.error.message)
    render(<App />)
    const file = new File([serialized.value], 'lesson.smart-board.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Import board file'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Note: Second state' })).toBeInTheDocument())
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('button', { name: 'Note: Third state' })).toBeInTheDocument()
    expect(savedBoard().objects[0]).toMatchObject({ text: 'Third state' })
  })

  it('exports the current board as a JSON download', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn(() => 'blob:smart-board')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    let filename = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export board' }))
    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/json' }))
    expect(filename).toMatch(/\.smart-board\.json$/)
    act(() => vi.advanceTimersByTime(1000))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:smart-board')
  })

  it('keeps current board and local data when import is canceled or invalid', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const existing = localStorage.getItem(storageKey)
    const validFile = new File([JSON.stringify({ id: 'other', schemaVersion: 1, objects: [] })], 'other.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Import board file'), { target: { files: [validFile] } })
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Note: New idea' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKey)).toBe(existing)

    const badFile = new File(['{bad'], 'broken.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Import board file'), { target: { files: [badFile] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not valid JSON/i))
    expect(screen.getByRole('button', { name: 'Note: New idea' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKey)).toBe(existing)
  })

  it('preserves invalid saved data until the user starts a new board', () => {
    const invalidSource = '{unreadable'
    localStorage.setItem(storageKey, invalidSource)
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be read/i)
    fireEvent.click(screen.getByRole('button', { name: 'Keep saved data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    expect(localStorage.getItem(storageKey)).toBe(invalidSource)

    fireEvent.click(screen.getByRole('button', { name: 'Start new board' }))
    expect(savedBoard()).toMatchObject({ schemaVersion: 1, objects: [] })
  })

  it('preserves a malformed saved timeline until the user chooses recovery', () => {
    const invalidSource = JSON.stringify({ format: 'smart-board-history', formatVersion: 1, history: { initialDocument: { id: 'bad', schemaVersion: 1, objects: [] }, entries: [], cursor: 1 } })
    localStorage.setItem(storageKey, invalidSource)
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent(/original data is preserved/i)
    fireEvent.click(screen.getByRole('button', { name: 'Keep saved data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    expect(localStorage.getItem(storageKey)).toBe(invalidSource)
  })

  it('chooses a free grid position after removing an earlier object', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const notes = screen.getAllByRole('button', { name: 'Note: New idea' })
    const firstId = notes[0].getAttribute('data-object-id')
    const remainingId = notes[1].getAttribute('data-object-id')
    fireEvent.click(notes[0])
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    const allNotes = screen.getAllByRole('button', { name: 'Note: New idea' })
    const remaining = allNotes.find((note) => note.getAttribute('data-object-id') === remainingId)
    const added = allNotes.find((note) => note.getAttribute('data-object-id') !== remainingId && note.getAttribute('data-object-id') !== firstId)
    expect(added).toBeDefined()
    expect(added?.getAttribute('transform')).not.toBe(remaining?.getAttribute('transform'))
  })

  it('plays one timeline step every 700 milliseconds and stops at the end', () => {
    vi.useFakeTimers()
    render(<App />)
    createTimeline()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(699))
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
  })

  it('pauses autoplay on manual navigation or board edits', () => {
    vi.useFakeTimers()
    render(<App />)
    createTimeline()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(350))
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(350))
    fireEvent.change(screen.getByRole('textbox', { name: 'Note text' }), { target: { value: 'New branch' } })
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Note: New branch' })).toBeInTheDocument()
  })

  it('clears the playback timer when the app unmounts', () => {
    vi.useFakeTimers()
    const view = render(<App />)
    createTimeline()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    const unrelatedTimers = vi.getTimerCount()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    view.unmount()
    expect(vi.getTimerCount()).toBe(unrelatedTimers)
  })
})
