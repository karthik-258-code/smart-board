import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const storageKey = 'smart-board:document:v1'

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

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
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').objects[0]).toMatchObject({
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
    render(<App />)
    expect(screen.getByRole('button', { name: 'Note: Restore me' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').objects).toHaveLength(2)
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
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}')).toMatchObject({ schemaVersion: 1, objects: [] })
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
