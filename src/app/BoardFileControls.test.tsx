import { CompressionStream } from 'node:stream/web'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import type { HistoryState } from '../domain/history'
import { BoardFileControls } from './BoardFileControls'

const history: HistoryState = { initialDocument: createEmptyBoard('share-controls'), entries: [], cursor: 0 }

beforeEach(() => {
  vi.stubGlobal('CompressionStream', CompressionStream)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('board share controls', () => {
  it('creates and copies a share link', async () => {
    render(<BoardFileControls history={history} onImport={vi.fn()} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create share link' }))

    const input = await screen.findByRole('textbox', { name: 'Share link' })
    expect((input as HTMLInputElement).value).toContain('#smart-board=')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Link copied.'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith((input as HTMLInputElement).value)
  })

  it('shows a selectable link when clipboard access fails', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<BoardFileControls history={history} onImport={vi.fn()} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create share link' }))

    expect(await screen.findByRole('textbox', { name: 'Share link' })).toHaveAttribute('readonly')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy the link from the field.'))
  })

  it('reports unsupported compression', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const onError = vi.fn()
    render(<BoardFileControls history={history} onImport={vi.fn()} onError={onError} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create share link' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('cannot compress share links')))
  })
})
