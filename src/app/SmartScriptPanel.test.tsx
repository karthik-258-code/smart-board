import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SmartScriptPanel } from './SmartScriptPanel'
import { heapExtractionTemplate } from '../execution/smartScript'
import { levelOrderTraversalTemplate } from '../execution/smartScript'
import type { ArrayObject, BinaryTreeObject, ContainerObject, GraphObject, HeapObject, LinkedListObject } from '../domain/model'

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
const trees: BinaryTreeObject[] = [
  { id: 'tree-one', type: 'binary-tree', typeVersion: 1, position: { x: 0, y: 500 }, rootId: 'root', highlightedNodeIds: [], nodes: [
    { id: 'root', value: 7, leftId: null, rightId: null, position: { x: 0, y: 0 } },
  ] },
]
const heaps: HeapObject[] = [
  { id: 'heap-one', type: 'heap', typeVersion: 1, position: { x: 0, y: 600 }, kind: 'min', values: [1] },
]

describe('Smart Script panel', () => {
  it('labels the loaded binary-search template correctly', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use binary search template' }))

    expect(screen.getByText('Safe subset · binary search')).toBeInTheDocument()
  })

  it('loads the imported script and selected array when execution changes', () => {
    const view = render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={1} execution={null} onRun={vi.fn()} />)
    const source = 'let count = 0;\nfor (let i = 0; i < values.length; i++) {\n  count += i;\n}'
    view.rerender(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={1} execution={{ source, arrayId: 'array-two', events: [] }} onRun={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Smart Script source' })).toHaveValue(source)
    expect(screen.getByRole('combobox', { name: 'Structure to visualize' })).toHaveValue('array-two')
  })

  it('offers stacks and queues as script targets and disables binary search for them', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'stack-one' } })

    expect(target).toHaveValue('stack-one')
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect(screen.getByText('Safe subset · stack traversal')).toBeInTheDocument()
  })

  it('offers linked lists as script targets', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'list-one' } })

    expect(target).toHaveValue('list-one')
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect(screen.getByText('Safe subset · linked list traversal')).toBeInTheDocument()
  })

  it('selects graph BFS template and disables binary search for graphs', () => {
    const onRun = vi.fn()
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={onRun} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'graph-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use breadth-first search template' }))

    expect(screen.getByText('Safe subset · graph breadth-first search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use binary search template' })).toBeDisabled()
    expect((screen.getByRole('textbox', { name: 'Smart Script source' }) as HTMLTextAreaElement).value).toContain('graph.neighbors(current)')
    fireEvent.click(screen.getByRole('button', { name: 'Run Smart Script' }))
    expect(onRun).toHaveBeenCalledWith(expect.stringContaining('graph.neighbors(current)'), 'graph-one')
  })

  it('selects binary trees and loads inorder traversal template', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'tree-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use inorder traversal template' }))

    expect(target).toHaveValue('tree-one')
    expect(screen.getByText('Safe subset · binary-tree inorder traversal')).toBeInTheDocument()
    expect((screen.getByRole('textbox', { name: 'Smart Script source' }) as HTMLTextAreaElement).value).toContain('inorder(tree.root)')
  })

  it('selects the binary-tree level-order template and labels its mode', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Structure to visualize' }), { target: { value: 'tree-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use level-order traversal template' }))

    expect(screen.getByText('Safe subset · binary-tree level-order traversal')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Smart Script source' })).toHaveValue(levelOrderTraversalTemplate)
  })

  it('selects a heap and loads the extraction template', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} heaps={heaps} cursor={0} execution={null} onRun={vi.fn()} />)
    const target = screen.getByRole('combobox', { name: 'Structure to visualize' })
    fireEvent.change(target, { target: { value: 'heap-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use heap extraction template' }))

    expect(target).toHaveValue('heap-one')
    expect(screen.getByText('Safe subset · heap extraction')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Smart Script source' })).toHaveValue(heapExtractionTemplate)
  })

  it('loads graph depth-first template for a graph target', () => {
    render(<SmartScriptPanel arrays={arrays} containers={containers} linkedLists={linkedLists} graphs={graphs} trees={trees} cursor={0} execution={null} onRun={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Structure to visualize' }), { target: { value: 'graph-one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use depth-first search template' }))

    expect(screen.getByText('Safe subset · graph depth-first search')).toBeInTheDocument()
    expect((screen.getByRole('textbox', { name: 'Smart Script source' }) as HTMLTextAreaElement).value).toContain('stack.pop()')
  })
})
