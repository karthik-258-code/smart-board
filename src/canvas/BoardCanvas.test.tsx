import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BoardDocument } from '../domain/model'
import { BoardCanvas } from './BoardCanvas'

const document: BoardDocument = {
  id: 'board-1', schemaVersion: 1, objects: [
    { id: 'note', type: 'note', typeVersion: 1, position: { x: 20, y: 20 }, text: 'Idea' },
    { id: 'shape', type: 'shape', typeVersion: 1, position: { x: 160, y: 20 }, shapeKind: 'rectangle', width: 100, height: 60 },
    { id: 'array', type: 'array', typeVersion: 1, position: { x: 20, y: 120 }, values: [4, 7], highlightedIndices: [1] },
    { id: 'pointer', type: 'pointer', typeVersion: 1, position: { x: 30, y: 210 }, name: 'i', targetObjectId: 'array', index: 1 },
    { id: 'range', type: 'range', typeVersion: 1, position: { x: 80, y: 210 }, name: 'window', targetObjectId: 'array', start: 0, endExclusive: 2 },
  ],
}

describe('BoardCanvas', () => {
  it('renders supported object types with accessible labels and selection state', () => {
    render(<BoardCanvas document={document} selectedId="note" onSelect={vi.fn()} onOperation={vi.fn()} />)
    const canvas = within(screen.getByRole('region', { name: 'Board canvas' }))
    expect(canvas.getByRole('button', { name: 'Note: Idea' })).toHaveAttribute('aria-pressed', 'true')
    expect(canvas.getByRole('button', { name: 'Rectangle' })).toBeInTheDocument()
    expect(canvas.getByRole('button', { name: 'Array: 4, 7' })).toBeInTheDocument()
    expect(canvas.getByText(/^i/)).toBeInTheDocument()
    expect(canvas.getByText(/window/)).toBeInTheDocument()
  })

  it('selects objects by pointer and keyboard input', () => {
    const onSelect = vi.fn()
    render(<BoardCanvas document={document} selectedId={null} onSelect={onSelect} onOperation={vi.fn()} />)
    const note = screen.getByRole('button', { name: 'Note: Idea' })
    fireEvent.click(note)
    fireEvent.keyDown(note, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith('note')
  })

  it('drags an object in board coordinates and commits one position operation on release', () => {
    const onOperation = vi.fn()
    const onSelect = vi.fn()
    render(<BoardCanvas document={document} selectedId={null} onSelect={onSelect} onOperation={onOperation} />)
    const canvas = screen.getByRole('region', { name: 'Board canvas' })
    const svg = within(canvas).getByLabelText('Board objects')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 200, left: 100, top: 200, right: 700, bottom: 560,
      width: 600, height: 360, toJSON: () => ({}),
    })
    const note = screen.getByRole('button', { name: 'Note: Idea' })

    fireEvent.pointerDown(note, { button: 0, pointerId: 1, clientX: 120, clientY: 220 })
    fireEvent.pointerMove(note, { pointerId: 1, clientX: 160, clientY: 260 })
    fireEvent.pointerUp(note, { pointerId: 1, clientX: 160, clientY: 260 })

    expect(onSelect).toHaveBeenCalledWith('note')
    expect(onOperation).toHaveBeenCalledTimes(1)
    expect(onOperation).toHaveBeenCalledWith({
      type: 'object/update-position', objectId: 'note', position: { x: 100, y: 100 },
    })
  })

  it('draws one stroke in board coordinates from a background gesture', () => {
    const onCreateStroke = vi.fn()
    render(<BoardCanvas document={document} selectedId={null} onSelect={vi.fn()} onOperation={vi.fn()} drawingMode onCreateStroke={onCreateStroke} />)
    const svg = screen.getByLabelText('Board objects')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 100, y: 200, left: 100, top: 200, right: 700, bottom: 560, width: 600, height: 360, toJSON: () => ({}) })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 2, clientX: 110, clientY: 210 })
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 130, clientY: 230 })
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 160, clientY: 260 })
    expect(onCreateStroke).toHaveBeenCalledTimes(1)
    expect(onCreateStroke).toHaveBeenCalledWith({ position: { x: 20, y: 20 }, points: [{ x: 0, y: 0 }, { x: 40, y: 40 }, { x: 100, y: 100 }], color: 'ink' })
  })

  it('ignores short strokes but still allows object dragging in Draw mode', () => {
    const onCreateStroke = vi.fn()
    const onOperation = vi.fn()
    render(<BoardCanvas document={document} selectedId={null} onSelect={vi.fn()} onOperation={onOperation} drawingMode onCreateStroke={onCreateStroke} />)
    const svg = screen.getByLabelText('Board objects')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 360, width: 600, height: 360, toJSON: () => ({}) })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 3, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(svg, { pointerId: 3, clientX: 10, clientY: 10 })
    expect(onCreateStroke).not.toHaveBeenCalled()
    const note = screen.getByRole('button', { name: 'Note: Idea' })
    fireEvent.pointerDown(note, { button: 0, pointerId: 4, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(note, { pointerId: 4, clientX: 30, clientY: 30 })
    fireEvent.pointerUp(note, { pointerId: 4, clientX: 30, clientY: 30 })
    expect(onOperation).toHaveBeenCalledWith(expect.objectContaining({ type: 'object/update-position' }))
  })

  it('discards an unfinished stroke when the pointer is canceled', () => {
    const onCreateStroke = vi.fn()
    render(<BoardCanvas document={document} selectedId={null} onSelect={vi.fn()} onOperation={vi.fn()} drawingMode onCreateStroke={onCreateStroke} />)
    const svg = screen.getByLabelText('Board objects')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 360, width: 600, height: 360, toJSON: () => ({}) })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 5, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(svg, { pointerId: 5, clientX: 20, clientY: 20 })
    fireEvent.pointerCancel(svg, { pointerId: 5 })
    expect(onCreateStroke).not.toHaveBeenCalled()
  })
})
