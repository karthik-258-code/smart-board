import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => localStorage.clear())

describe('manual algorithm board milestone', () => {
  it('creates, edits, replays, and restores a two-pointer range workflow', () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    const array = screen.getByRole('button', { name: 'Array: 4, 8, 12' })
    const arrayId = array.getAttribute('data-object-id')

    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pointer name' }), { target: { value: 'l' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pointer name' }), { target: { value: 'r' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add range' }))
    expect(screen.getByRole('button', { name: 'Range window, 0 to 2' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pointer l, index 0' }))
    const leftId = screen.getByRole('button', { name: 'Pointer l, index 0' }).getAttribute('data-object-id')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pointer r, index 0' }))
    const rightId = screen.getByRole('button', { name: 'Pointer r, index 0' }).getAttribute('data-object-id')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '2' } })
    expect(screen.getByRole('button', { name: 'Pointer l, index 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pointer r, index 2' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Pointer r, index 0' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('smart-board:document:v1') ?? '{}').objects.find((item: { id: string }) => item.id === rightId).index).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('button', { name: 'Pointer r, index 2' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('smart-board:document:v1') ?? '{}').objects.find((item: { id: string }) => item.id === rightId).index).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByRole('button', { name: 'Pointer r, index 0' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('button', { name: 'Pointer r, index 2' })).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Array: 4, 8, 12' })).toHaveAttribute('data-object-id', arrayId)
    expect(screen.getByRole('button', { name: 'Pointer l, index 1' })).toHaveAttribute('data-object-id', leftId)
    expect(screen.getByRole('button', { name: 'Pointer r, index 2' })).toHaveAttribute('data-object-id', rightId)
    expect(screen.getByRole('button', { name: 'Range window, 0 to 2' })).toBeInTheDocument()
  })

  it('compares and swaps two-pointer pairs, then replays the sequence', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add array' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Value to insert' }), { target: { value: '16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert value' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pointer name' }), { target: { value: 'l' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add pointer' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Pointer name' }), { target: { value: 'r' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Pointer index' }), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Array: 4, 8, 12, 16' }))

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Swap first index' }), { target: { value: '0' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Swap second index' }), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Swap values' }))
    expect(screen.getByRole('button', { name: 'Array: 16, 8, 12, 4' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Compare first index' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Compare second index' }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comparison operator' }), { target: { value: '<' } })
    fireEvent.click(screen.getByRole('button', { name: 'Compare values' }))
    expect(screen.getByText('Comparison: 8 < 12 → true')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Swap first index' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Swap second index' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Swap values' }))
    expect(screen.getByRole('button', { name: 'Array: 16, 12, 8, 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pointer l, index 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pointer r, index 3' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Array: 16, 8, 12, 4' })).toBeInTheDocument()
    expect(screen.getByText('Comparison: 8 < 12 → true')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('button', { name: 'Array: 16, 12, 8, 4' })).toBeInTheDocument()
    expect(screen.queryByText('Comparison: 8 < 12 → true')).not.toBeInTheDocument()
  })
})
