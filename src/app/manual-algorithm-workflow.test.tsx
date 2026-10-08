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
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('button', { name: 'Pointer r, index 2' })).toBeInTheDocument()
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
})
