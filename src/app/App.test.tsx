import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Smart Board app shell', () => {
  it('shows Smart Board as the page heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Smart Board', level: 1 })).toBeInTheDocument()
  })

  it('exposes an accessible board region', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'Board canvas' })).toBeInTheDocument()
  })

  it('provides an Add object control', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Add object' })).toBeInTheDocument()
  })
})
