import type { HistoryState } from '../domain/history'
import type { Result } from '../domain/result'
import { parseBoardFile, serializeBoardFile } from './boardFile'

export type ShareLinkError = { code: 'unsupported_browser' | 'payload_too_large' | 'invalid_fragment' | 'invalid_payload'; message: string }

export const MAX_SHARE_FRAGMENT_CHARS = 256 * 1024
export const MAX_SHARED_BOARD_BYTES = 8 * 1024 * 1024
const sharePrefix = '#smart-board='
const maxCompressedBytes = Math.floor((MAX_SHARE_FRAGMENT_CHARS - sharePrefix.length) * 3 / 4)

function fail(code: ShareLinkError['code'], message: string): Result<never, ShareLinkError> {
  return { ok: false, error: { code, message } }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(payload: string): Uint8Array | null {
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload) || payload.length % 4 === 1) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4)
    const binary = atob(base64)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function byteStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close() } })
}

async function collectBounded(stream: ReadableStream<Uint8Array>, limit: number, message: string): Promise<Result<Uint8Array, ShareLinkError>> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel()
        return fail('payload_too_large', message)
      }
      chunks.push(value)
    }
  } catch {
    return fail('invalid_payload', 'The board data could not be compressed or decompressed.')
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, value: output }
}

export async function createBoardShareUrl(history: HistoryState, baseUrl: string): Promise<Result<string, ShareLinkError>> {
  const Compressor = globalThis.CompressionStream
  if (typeof Compressor !== 'function') return fail('unsupported_browser', 'This browser cannot compress share links. Export the board as a file instead.')
  const serialized = serializeBoardFile(history)
  if (!serialized.ok) return fail('invalid_payload', serialized.error.message)
  try {
    const source = byteStream(new TextEncoder().encode(serialized.value))
    const gzip = new Compressor('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>
    const compressed = await collectBounded(source.pipeThrough(gzip), maxCompressedBytes, 'This board is too large for a share link. Export it as a file instead.')
    if (!compressed.ok) return compressed
    const fragment = `${sharePrefix}${toBase64Url(compressed.value)}`
    if (fragment.length > MAX_SHARE_FRAGMENT_CHARS) return fail('payload_too_large', 'This board is too large for a share link. Export it as a file instead.')
    const url = new URL(baseUrl)
    url.hash = fragment.slice(1)
    return { ok: true, value: url.toString() }
  } catch {
    return fail('invalid_payload', 'The board could not be encoded as a share link.')
  }
}

async function decompressBounded(bytes: Uint8Array): Promise<Result<Uint8Array, ShareLinkError>> {
  const Decompressor = globalThis.DecompressionStream
  if (typeof Decompressor !== 'function') return fail('unsupported_browser', 'This browser cannot open compressed share links. Open the board file instead.')
  try {
    const gunzip = new Decompressor('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>
    return await collectBounded(byteStream(bytes).pipeThrough(gunzip), MAX_SHARED_BOARD_BYTES, 'This shared board exceeds the 8 MiB unpacked size limit.')
  } catch {
    return fail('invalid_payload', 'The share link is damaged or contains invalid compressed data.')
  }
}

export async function parseBoardShareFragment(fragment: string): Promise<Result<HistoryState, ShareLinkError>> {
  if (!fragment.startsWith(sharePrefix)) return fail('invalid_fragment', 'This URL does not contain a Smart Board share link.')
  if (fragment.length > MAX_SHARE_FRAGMENT_CHARS) return fail('payload_too_large', 'This share link exceeds the 256 KiB payload limit.')
  const bytes = fromBase64Url(fragment.slice(sharePrefix.length))
  if (!bytes) return fail('invalid_fragment', 'This Smart Board share link is malformed.')
  const decompressed = await decompressBounded(bytes)
  if (!decompressed.ok) return decompressed
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(decompressed.value)
  } catch {
    return fail('invalid_payload', 'The share link does not contain valid UTF-8 board data.')
  }
  const parsed = parseBoardFile(source)
  if (!parsed.ok) return fail('invalid_payload', parsed.error.message)
  return parsed
}
