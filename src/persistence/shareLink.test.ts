import { CompressionStream, DecompressionStream } from 'node:stream/web'
import { gzipSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyBoard } from '../domain/model'
import { dispatch, type HistoryState } from '../domain/history'
import { runArrayTraversal } from '../execution/smartScript'
import { createBoardShareUrl, MAX_SHARE_FRAGMENT_CHARS, parseBoardShareFragment } from './shareLink'

function historyWithArray(): HistoryState {
  const history: HistoryState = { initialDocument: createEmptyBoard('share-test'), entries: [], cursor: 0 }
  const result = dispatch(history, { type: 'object/add', object: { id: 'numbers', type: 'array', typeVersion: 1, position: { x: 10, y: 20 }, values: [2, 3, 5], highlightedIndices: [1] } })
  if (!result.ok) throw new Error(result.error.message)
  const run = runArrayTraversal('for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', result.value, 'numbers')
  if (!run.ok) throw new Error(run.error.message)
  const events = run.value.events.map((event, index) => ({ cursor: result.value.cursor + index + 1, line: event.line, variables: event.variables, ...(event.inspection ? { inspection: event.inspection } : {}) }))
  return { ...run.value.history, execution: { kind: 'smart-script', source: 'for (let i = 0; i < values.length; i++) {\n  highlight(i);\n}', arrayId: 'numbers', events } }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function gzip(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  return `#smart-board=${toBase64Url(gzipSync(bytes))}`
}

describe('board share links', () => {
  it('round-trips a validated board history in a URL-safe fragment', async () => {
    vi.stubGlobal('CompressionStream', CompressionStream)
    vi.stubGlobal('DecompressionStream', DecompressionStream)
    const history = historyWithArray()

    const created = await createBoardShareUrl(history, 'https://example.test/board?mode=teach')
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const url = new URL(created.value)
    expect(url.origin + url.pathname + url.search).toBe('https://example.test/board?mode=teach')
    expect(url.hash).toMatch(/^#smart-board=[A-Za-z0-9_-]+$/)

    const parsed = await parseBoardShareFragment(url.hash)
    expect(parsed).toEqual({ ok: true, value: history })
  })

  it('rejects malformed, truncated, and oversized fragments without throwing', async () => {
    vi.stubGlobal('CompressionStream', CompressionStream)
    vi.stubGlobal('DecompressionStream', DecompressionStream)

    expect(await parseBoardShareFragment('#other=value')).toMatchObject({ ok: false, error: { code: 'invalid_fragment' } })
    expect(await parseBoardShareFragment('#smart-board=%%%')).toMatchObject({ ok: false, error: { code: 'invalid_fragment' } })
    expect(await parseBoardShareFragment('#smart-board=AAAA')).toMatchObject({ ok: false, error: { code: 'invalid_payload' } })
    expect(await parseBoardShareFragment(`#smart-board=${'A'.repeat(MAX_SHARE_FRAGMENT_CHARS)}`)).toMatchObject({ ok: false, error: { code: 'payload_too_large' } })
  })

  it('rejects decompressed payloads above the size limit', async () => {
    vi.stubGlobal('CompressionStream', CompressionStream)
    vi.stubGlobal('DecompressionStream', DecompressionStream)
    const oversized = await gzip('x'.repeat(8 * 1024 * 1024 + 1))

    expect(await parseBoardShareFragment(oversized)).toMatchObject({ ok: false, error: { code: 'payload_too_large' } })
  })

  it('rejects boards that would create links above the payload limit', async () => {
    vi.stubGlobal('CompressionStream', CompressionStream)
    let seed = 73
    const noise = Array.from({ length: 400 }, () => Array.from({ length: 1024 }, () => {
      seed = (seed * 16807) % 2147483647
      return String.fromCharCode(33 + seed % 90)
    }).join(''))
    const board: HistoryState = {
      initialDocument: {
        ...createEmptyBoard('large-share'),
        objects: [{ id: 'large-array', type: 'array', typeVersion: 1, position: { x: 0, y: 0 }, values: noise, highlightedIndices: [] }],
      },
      entries: [], cursor: 0,
    }

    expect(await createBoardShareUrl(board, 'https://example.test/')).toMatchObject({ ok: false, error: { code: 'payload_too_large' } })
  })

  it('reports unsupported browser compression clearly', async () => {
    vi.stubGlobal('CompressionStream', undefined)

    expect(await createBoardShareUrl(historyWithArray(), 'https://example.test/')).toMatchObject({ ok: false, error: { code: 'unsupported_browser' } })
  })

  it('reports unsupported browser decompression clearly', async () => {
    vi.stubGlobal('DecompressionStream', undefined)

    expect(await parseBoardShareFragment('#smart-board=H4sIAAAAAAAA')).toMatchObject({ ok: false, error: { code: 'unsupported_browser' } })
  })
})
