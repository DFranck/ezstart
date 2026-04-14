import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../core/api-error.js'
import { fetchExternal } from '../index.js'

type FetchMock = ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('fetchExternal', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches a GitHub-like URL without auth headers', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: 'next.js', stars: 12345 }))

    const repo = await fetchExternal<{ name: string; stars: number }>(
      'https://api.github.com/repos/vercel/next.js'
    )

    expect(repo).toEqual({ name: 'next.js', stars: 12345 })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.['Authorization']).toBeUndefined()
  })

  it('parses JSON response body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))
    const result = await fetchExternal<{ ok: number }>('https://npm.example/x')
    expect(result.ok).toBe(1)
  })

  it('returns raw text when response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('plain text', { status: 200 }))
    const result = await fetchExternal<string>('https://example.com/text')
    expect(result).toBe('plain text')
  })

  it('throws ApiError on non-200 with parsed message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Not found' }, { status: 404 }))

    let caught: unknown
    try {
      await fetchExternal('https://api.github.com/nope')
    } catch (err) {
      caught = err
    }

    expect(ApiError.isApiError(caught)).toBe(true)
    expect(caught).toMatchObject({ status: 404, message: 'Not found' })
  })

  it('throws network ApiError when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('DNS fail'))
    await expect(fetchExternal('https://broken.example')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })
})
