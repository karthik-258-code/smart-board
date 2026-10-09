import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SmartScriptPanel } from './SmartScriptPanel'
import type { ArrayObject } from '../domain/model'

const arrays: ArrayObject[] = [
  { id: 'array-one', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [1], highlightedIndices: [] },
  { id: 'array-two', type: 'array', typeVersion: 1, position: { x: 0, y: 100 }, values: [2], highlightedIndices: [] },
]

describe('Smart Script panel', () => {
  it('labels the loaded binary-search template correctly', () => {
    render(<SmartScriptPanel arrays={arrays} cursor={0} execution={null} onRun={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use binary search template' }))

    expect(screen.getByText('Safe subset · binary search')).toBeInTheDocument()
  })

  it('loads the imported script and selected array when execution changes', () => {
    const view = render(<SmartScriptPanel arrays={arrays} cursor={1} execution={null} onRun={vi.fn()} />)
    const source = 'let count = 0;\nfor (let i = 0; i < values.length; i++) {\n  count += i;\n}'
    view.rerender(<SmartScriptPanel arrays={arrays} cursor={1} execution={{ source, arrayId: 'array-two', events: [] }} onRun={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Smart Script source' })).toHaveValue(source)
    expect(screen.getByRole('combobox', { name: 'Array to visualize' })).toHaveValue('array-two')
  })
})
