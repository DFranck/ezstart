/**
 * Tests for the new `responseType` option supporting binary downloads
 * (PDF, images), plain text, and raw `Response` access.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../core/create-client.js'

type FetchMock = ReturnType<typeof vi.fn>

describe('apiCall — responseType', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function client() {
    return createApiClient({
      baseUrl: 'https://api.test',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })
  }

  it('returns a Blob for responseType: "blob"', async () => {
    const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' })
    fetchMock.mockResolvedValueOnce(
      new Response(blob, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    const result = await client().apiCall<Blob>('/invoice.pdf', { responseType: 'blob' })

    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('application/pdf')
    const text = await result.text()
    expect(text).toBe('%PDF-fake')
  })

  it('returns the raw text body for responseType: "text"', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('hello world', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    )

    const result = await client().apiCall<string>('/note.txt', { responseType: 'text' })

    expect(result).toBe('hello world')
  })

  it('returns an ArrayBuffer for responseType: "arrayBuffer"', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer
    fetchMock.mockResolvedValueOnce(new Response(bytes, { status: 200 }))

    const result = await client().apiCall<ArrayBuffer>('/binary', {
      responseType: 'arrayBuffer',
    })

    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  it('returns the raw Response for responseType: "raw"', async () => {
    const res = new Response('any', { status: 200 })
    fetchMock.mockResolvedValueOnce(res)

    const result = await client().apiCall<Response>('/whatever', {
      responseType: 'raw',
    })

    expect(result).toBeInstanceOf(Response)
    expect(result.status).toBe(200)
  })

  it('throws ApiError on non-2xx even when responseType is binary', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(client().apiCall('/invoice.pdf', { responseType: 'blob' })).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    })
  })

  it('does not unwrap the envelope on non-json responses', async () => {
    // Even though body looks like JSON envelope, "text" returns it untouched
    fetchMock.mockResolvedValueOnce(
      new Response('{"success":true,"data":42}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await client().apiCall<string>('/x', { responseType: 'text' })

    expect(result).toBe('{"success":true,"data":42}')
  })
})
