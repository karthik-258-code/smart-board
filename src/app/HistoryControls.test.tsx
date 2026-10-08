import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HistoryControls } from './HistoryControls'

describe('HistoryControls', () => {
  it('reflects the replay step and disables controls at history boundaries', () => {
    render(<HistoryControls cursor={0} total={2} onUndo={vi.fn()} onRedo={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} onRestart={vi.fn()} />)
    expect(screen.getByText('Step 0 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled()
  })

  it('calls timeline actions and disables forward controls at the end', () => {
    const onUndo = vi.fn()
    const onPrevious = vi.fn()
    const onRestart = vi.fn()
    render(<HistoryControls cursor={2} total={2} onUndo={onUndo} onRedo={vi.fn()} onPrevious={onPrevious} onNext={vi.fn()} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onPrevious).toHaveBeenCalledOnce()
    expect(onRestart).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled()
  })
})
