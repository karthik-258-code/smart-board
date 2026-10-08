import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HistoryControls } from './HistoryControls'

describe('HistoryControls', () => {
  it('reflects the replay step and disables controls at history boundaries', () => {
    render(<HistoryControls cursor={0} total={2} playing={false} onTogglePlayback={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} onRestart={vi.fn()} />)
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
    render(<HistoryControls cursor={2} total={2} playing={false} onTogglePlayback={vi.fn()} onUndo={onUndo} onRedo={vi.fn()} onPrevious={onPrevious} onNext={vi.fn()} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onPrevious).toHaveBeenCalledOnce()
    expect(onRestart).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled()
  })

  it('shows Play when stopped and Pause when playing', () => {
    const onTogglePlayback = vi.fn()
    const props = { cursor: 1, total: 2, onTogglePlayback, onUndo: vi.fn(), onRedo: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onRestart: vi.fn() }
    const view = render(<HistoryControls {...props} playing={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(onTogglePlayback).toHaveBeenCalledOnce()

    view.rerender(<HistoryControls {...props} playing />)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled()
  })

  it('disables Play when history is empty or the cursor is at its end', () => {
    const props = { playing: false, onTogglePlayback: vi.fn(), onUndo: vi.fn(), onRedo: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onRestart: vi.fn() }
    const view = render(<HistoryControls {...props} cursor={0} total={0} />)
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()

    view.rerender(<HistoryControls {...props} cursor={2} total={2} />)
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
  })
})
