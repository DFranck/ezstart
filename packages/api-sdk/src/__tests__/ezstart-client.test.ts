/**
 * Smoke tests for the pre-configured @ezstart wrapper.
 *
 * Verifies that the bound `apiCall` reads tokens from
 * `localStorage['ezauth-storage']` (the Zustand state shape) and that the
 * `apiQuery(appName)` factory still produces stable query keys.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetRefreshPromiseForTests,
  apiCall,
  apiQuery,
  ezstartClient,
} from '../ezstart-client.js'

type FetchMock = ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ezstart-client (pre-configured wrapper)', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    __resetRefreshPromiseForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the access token from localStorage["ezauth-storage"].state.accessToken', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1 } }))

    const storage: Record<string, string> = {
      'ezauth-storage': JSON.stringify({
        state: { accessToken: 'tok-from-store', refreshToken: 'r' },
      }),
    }
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value
        },
        removeItem: (key: string) => {
          delete storage[key]
        },
      },
    })

    await apiCall('/me', {
      appName: 'ezauth',
      baseUrl: 'http://api.test.local',
    })

    const headers = fetchMock.mock.calls[0]?.[1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-from-store')
  })

  it('exposes a stable apiQuery(appName) namespace', () => {
    const api = apiQuery('ezbill')
    expect(api.queryKey('/invoices', { page: 1 })).toEqual(['ezbill', '/invoices', { page: 1 }])
  })

  it('exposes the underlying client config as read-only', () => {
    expect(ezstartClient.config.pathPrefix).toBe('/api')
    expect(ezstartClient.config.envelope.unwrap).toBe(true)
    expect(ezstartClient.config.envelope.throwOnFailureEnvelope).toBe(true)
  })
})
