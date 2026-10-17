import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SmartScriptPanel } from './SmartScriptPanel'
import type { ArrayObject, ContainerObject, GraphObject, LinkedListObject } from '../domain/model'

const arrays: ArrayObject[] = [
  { id: 'array-one', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: [1], highlightedIndices: [] },
  { id: 'array-two', type: 'array', typeVersion: 1, position: { x: 0, y: 100 }, values: [2], highlightedIndices: [] },
]
const containers: ContainerObject[] = [
  { id: 'stack-one', type: 'container', typeVersion: 1, position: { x: 0, y: 200 }, kind: 'stack', values: [3, 4] },
]
const linkedLists: LinkedListObject[] = [
  { id: 'list-one', type: 'linked-list', typeVersion: 1, position: { x: 0, y: 300 }, nodes: [{ id: 'node-one', value: 5, nextId: null }] },
]
const graphs: GraphObject[] = [
  { id: 'graph-one', type: 'graph', typeVersion: 1, position: { x: 0, y: 400 }, nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }], edges: [], highlightedNodeIds: [] },
]

describe('Smart Script panel', () => {
  it('labels the loaded binary-search template correctly', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={0} execution={null} onRun={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use binary search template' }))

    expect(screen.getByText('Safe subset · binary search')).toBeInTheDocument()
  })

  it('loads the imported script and selected array when execution changes', () => {
    const view = render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={1} execution={null} onRun={vi.fn()} />)
    const source = 'let count = 0;\nfor (let i = 0; i < values.length; i++) {\n  count += i;\n}'
    view.rerender(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={1} execution={{ source, arrayId: 'array-two', events: [] }} onRun={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Smart Script source' })).toHaveValue(source)
    expect(screen.getByRole('combobox', { name: 'Structure to visualize' })).toHaveValue('array-two')
  })

  it('offers stacks and queues as script targets and disables binary search for them', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'stack-one' } })

    expect(target).toHaveValue('stack-one')
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect(screen.getByText('Safe subset · stack traversal')).toBeInTheDocument()
  })

  it('offers linked lists as script targets', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'list-one' } })

    expect(target).toHaveValue('list-one')
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect(screen.getByText('Safe subset · linked list traversal')).toBeInTheDocument()
  })

  it('selects graph BFS template and disables binary search for graphs', () => {
    const onRun = vi.fn()
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} cursor={0} execution={null} onRun={onRun} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'graph-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use breadth-first search template' }))

    expect(screen.getByText('Safe subset · graph breadth-first search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect((screen.getByRole('textbox', { name: 'Smart Script source' }) as HTMLTextAreaElement).value).toContain('graph.neighbors(current)')
    fireEvent.click(screen.getByRole('button', { name: 'Run Smart Script' }))
    expect(onRun).toHaveBeenCalledWith(expect.stringContaining('graph.neighbors(current)'), 'graph-one')
  })
})
