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
    expect(canvas.getByText('i')).toBeInTheDocument()
    expect(canvas.getByText('window')).toBeInTheDocument()
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
})
