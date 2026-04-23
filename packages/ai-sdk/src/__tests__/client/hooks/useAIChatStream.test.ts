/**
 * Unit tests for `readSseStream` — the pure SSE parser that powers
 * `useAIChatStream`. Tests are framework-free (no React renderer) and focus on
 * adversarial inputs:
 *
 * - multi-chunk reads with boundaries mid-event
 * - `[DONE]` terminator
 * - mixed `meta` / `chunk` / `error` events
 * - `\r\n\r\n` separators (some proxies rewrite line endings)
 * - malformed JSON is ignored (doesn't throw)
 * - empty `data:` lines are ignored
 * - partial trailing buffer (no final blank line) — silently drops
 * - errors from the underlying reader propagate to the caller
 */

import { describe, expect, it, vi } from 'vitest'
import { readSseStream, type AIChatStreamEvent } from '../../../client/hooks/useAIChatStream.js'

type EventKind = AIChatStreamEvent['type']

/** Build a ReadableStream<Uint8Array> from a list of raw string chunks. */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[i]))
      i += 1
    },
  })
}

function streamThatThrowsAfter(
  initialChunks: string[],
  errorMessage: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < initialChunks.length) {
        controller.enqueue(encoder.encode(initialChunks[i]))
        i += 1
        return
      }
      controller.error(new Error(errorMessage))
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<AIChatStreamEvent[]> {
  const events: AIChatStreamEvent[] = []
  await readSseStream(stream, e => events.push(e))
  return events
}

describe('readSseStream', () => {
  describe('basic flow', () => {
    it('parses meta + chunk + done events', async () => {
      const stream = streamFromChunks([
        'data: {"type":"meta","provider":"openai","conversationId":"c1"}\n\n',
        'data: {"type":"chunk","content":"Hello"}\n\n',
        'data: {"type":"chunk","content":" world"}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([
        { type: 'meta', provider: 'openai', conversationId: 'c1' },
        { type: 'chunk', content: 'Hello' },
        { type: 'chunk', content: ' world' },
        { type: 'done' },
      ])
    })

    it('emits each event separately even when packed into one read', async () => {
      const stream = streamFromChunks([
        'data: {"type":"chunk","content":"a"}\n\ndata: {"type":"chunk","content":"b"}\n\ndata: [DONE]\n\n',
      ])
      const events = await collect(stream)
      const kinds: EventKind[] = events.map(e => e.type)
      expect(kinds).toEqual(['chunk', 'chunk', 'done'])
    })

    it('handles chunk boundaries mid-event', async () => {
      // Split `data: {"type":"chunk","content":"split"}\n\n` across multiple reads.
      const stream = streamFromChunks([
        'data: {"type":"ch',
        'unk","content":"sp',
        'lit"}\n',
        '\ndata: [DONE]\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'chunk', content: 'split' }, { type: 'done' }])
    })
  })

  describe('line endings', () => {
    it('accepts \\r\\n\\r\\n separators (proxy-rewritten SSE)', async () => {
      const stream = streamFromChunks([
        'data: {"type":"chunk","content":"crlf"}\r\n\r\n',
        'data: [DONE]\r\n\r\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'chunk', content: 'crlf' }, { type: 'done' }])
    })
  })

  describe('adversarial inputs', () => {
    it('ignores malformed JSON without throwing', async () => {
      const stream = streamFromChunks([
        'data: {not-json\n\n',
        'data: {"type":"chunk","content":"ok"}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      // Malformed line is dropped; the rest still flows.
      expect(events).toEqual([{ type: 'chunk', content: 'ok' }, { type: 'done' }])
    })

    it('ignores events with unknown `type`', async () => {
      const stream = streamFromChunks([
        'data: {"type":"unknown","whatever":1}\n\n',
        'data: {"type":"chunk","content":"x"}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'chunk', content: 'x' }, { type: 'done' }])
    })

    it('ignores empty `data:` lines', async () => {
      const stream = streamFromChunks([
        'data:\n\n',
        'data: \n\n',
        'data: {"type":"chunk","content":"y"}\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'chunk', content: 'y' }])
    })

    it('ignores non-data lines (comments, event:, id:)', async () => {
      const stream = streamFromChunks([
        ': keep-alive\n\n',
        'event: ping\ndata: {"type":"chunk","content":"z"}\n\n',
        'id: 42\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'chunk', content: 'z' }])
    })

    it('emits error events with their message', async () => {
      const stream = streamFromChunks([
        'data: {"type":"error","error":"provider offline"}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([{ type: 'error', error: 'provider offline' }, { type: 'done' }])
    })

    it('silently drops a trailing partial event (no final blank line)', async () => {
      const stream = streamFromChunks(['data: {"type":"chunk","content":"done-before-sep"}'])
      const events = await collect(stream)
      // Without the terminating \n\n we never dispatch — matches the protocol.
      expect(events).toEqual([])
    })
  })

  describe('error propagation', () => {
    it('propagates upstream reader errors to the caller', async () => {
      const onEvent = vi.fn()
      const stream = streamThatThrowsAfter(
        ['data: {"type":"chunk","content":"a"}\n\n'],
        'socket hang up'
      )
      await expect(readSseStream(stream, onEvent)).rejects.toThrowError(/socket hang up/)
      // First chunk was still delivered before the error.
      expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', content: 'a' })
    })
  })

  describe('meta event parsing', () => {
    it('accepts meta with partial fields', async () => {
      const stream = streamFromChunks([
        'data: {"type":"meta","provider":"gemini-flash"}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      expect(events).toEqual([
        { type: 'meta', provider: 'gemini-flash', conversationId: undefined },
        { type: 'done' },
      ])
    })

    it('rejects meta where provider is a non-string (dropped as invalid type)', async () => {
      const stream = streamFromChunks([
        'data: {"type":"meta","provider":42}\n\n',
        'data: [DONE]\n\n',
      ])
      const events = await collect(stream)
      // `42` is not a string → `provider` becomes undefined, meta still dispatched
      // so the caller knows the server sent a meta frame.
      expect(events).toEqual([
        { type: 'meta', provider: undefined, conversationId: undefined },
        { type: 'done' },
      ])
    })
  })
})
