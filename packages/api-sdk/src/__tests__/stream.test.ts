import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../core/api-error.js'
import { apiStream } from '../ezstart-client.js'

type FetchMock = ReturnType<typeof vi.fn>

function sseResponse(chunks: string[], init: { status?: number } = {}): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('apiStream', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses JSON chunks and fires onChunk for each event', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"type":"chunk","content":"Hello"}\n\n',
        'data: {"type":"chunk","content":" world"}\n\n',
      ])
    )

    const chunks: unknown[] = []
    await apiStream('/chat', {
      appName: 'ezstart',
      baseUrl: 'http://api.test',
      skipAuth: true,
      onChunk: data => chunks.push(data),
    })

    expect(chunks).toEqual([
      { type: 'chunk', content: 'Hello' },
      { type: 'chunk', content: ' world' },
    ])
  })

  it('honors [DONE] sentinel and invokes onDone', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(['data: {"v":1}\n\n', 'data: [DONE]\n\n']))

    const chunks: unknown[] = []
    const doneFn = vi.fn()

    await apiStream('/chat', {
      appName: 'ezstart',
      baseUrl: 'http://api.test',
      skipAuth: true,
      onChunk: data => chunks.push(data),
      onDone: doneFn,
    })

    expect(chunks).toEqual([{ v: 1 }])
    expect(doneFn).toHaveBeenCalledTimes(1)
  })

  it('invokes onError for SSE error events', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'event: error\ndata: {"error":{"message":"Stream broke","code":"STREAM_ERROR"}}\n\n',
      ])
    )

    const errFn = vi.fn()
    await apiStream('/chat', {
      appName: 'ezstart',
      baseUrl: 'http://api.test',
      skipAuth: true,
      onChunk: () => {},
      onError: errFn,
    })

    expect(errFn).toHaveBeenCalledTimes(1)
    const [errArg] = errFn.mock.calls[0] ?? []
    expect(ApiError.isApiError(errArg)).toBe(true)
    expect((errArg as ApiError).message).toBe('Stream broke')
    expect((errArg as ApiError).code).toBe('STREAM_ERROR')
  })

  it('throws ApiError before streaming when initial response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      apiStream('/chat', {
        appName: 'ezstart',
        baseUrl: 'http://api.test',
        skipAuth: true,
        onChunk: () => {},
      })
    ).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })

  it('stops reading when the AbortSignal fires mid-stream', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        // First chunk immediately.
        streamController.enqueue(encoder.encode('data: {"v":1}\n\n'))
        // Abort triggers cancellation.
        controller.signal.addEventListener('abort', () => {
          streamController.error(new DOMException('The operation was aborted.', 'AbortError'))
        })
      },
    })

    fetchMock.mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    )

    const chunks: unknown[] = []

    const promise = apiStream('/chat', {
      appName: 'ezstart',
      baseUrl: 'http://api.test',
      skipAuth: true,
      signal: controller.signal,
      onChunk: data => {
        chunks.push(data)
        // Abort after the first chunk is received.
        controller.abort()
      },
    })

    let caught: unknown
    try {
      await promise
    } catch (err) {
      caught = err
    }

    // First chunk was received before abort.
    expect(chunks).toEqual([{ v: 1 }])
    // Reader error propagates as a thrown error (DOMException or ApiError).
    expect(caught).toBeDefined()
  })
})
