import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CheckpointObject } from '../domain/model'
import { PracticeDialog } from './PracticeDialog'

const checkpoint: CheckpointObject = { id: 'cp', type: 'checkpoint', typeVersion: 1, position: { x: 0, y: 0 }, prompt: 'What comes next?', answer: 'Fibonacci', hint: 'Each value uses prior values.' }

describe('PracticeDialog', () => {
  it('checks normalized answers and reveals hint and answer only on request', () => {
    render(<PracticeDialog checkpoint={checkpoint} onClose={vi.fn()} />)
    expect(screen.queryByText('Fibonacci')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Your prediction' }), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not quite')
    fireEvent.change(screen.getByRole('textbox', { name: 'Your prediction' }), { target: { value: '  FIBONACCI  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct prediction')
    fireEvent.click(screen.getByRole('button', { name: 'Show hint' }))
    expect(screen.getByText(/Each value uses prior values/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getAllByRole('status').find((status) => status.textContent?.includes('Answer:'))).toHaveTextContent('Fibonacci')
  })

  it('does not mark blank predictions or blank expected answers correct', () => {
    const { rerender } = render(<PracticeDialog checkpoint={checkpoint} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Enter a prediction')
    rerender(<PracticeDialog checkpoint={{ ...checkpoint, answer: '' }} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Your prediction' }), { target: { value: 'anything' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('make sure this checkpoint has an expected answer')
  })
})
