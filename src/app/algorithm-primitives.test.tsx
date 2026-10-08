import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('algorithm primitives', () => {
  it('adds a named pointer and half-open range to an array and moves the pointer to the last index', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add range' }))

    expect(screen.getByRole('button', { name: 'Pointer i, index 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Range window, 0 to 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Range window, 0 to 2' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Range end' }), { target: { value: '3' } })
    expect(screen.getByRole('button', { name: 'Range window, 0 to 3' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pointer i, index 0' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '2' } })
    expect(screen.getByRole('button', { name: 'Pointer i, index 2' })).toBeInTheDocument()
  })

  it('highlights a chosen array index and preserves distinct duplicate values', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Array value at index 2' }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Highlight index 2 (4)' }))

    expect(screen.getByRole('button', { name: 'Array: 4, 8, 4' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Highlight index 2 (4)' })).toBeChecked()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('allows empty arrays and empty half-open ranges, but rejects invalid boundaries', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add empty array' }))
    expect(screen.getByText(/Empty array/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add range' }))
    expect(screen.getByRole('button', { name: 'Range window, 0 to 0' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    const pointer = screen.getByRole('button', { name: 'Pointer i, index 0' })
    fireEvent.click(pointer)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '-1' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pointer i, index 0' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '3' } })
    expect(screen.getByRole('button', { name: 'Pointer i, index 0' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Board canvas' })).getAllByRole('button', { name: /Array:/ })).toHaveLength(2)
  })
})
