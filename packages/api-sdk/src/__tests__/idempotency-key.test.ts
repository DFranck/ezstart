import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiCall, __resetRefreshPromiseForTests } from '../ezstart-client.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

// RFC 4122 v4 UUID — version nibble fixed to 4, variant nibble in [8,9,a,b].
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function headersFromInit(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>
}

describe('apiCall — idempotencyKey option (Wave C lot 4)', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    __resetRefreshPromiseForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("'auto' generates an RFC 4122 v4 UUID and sets the Idempotency-Key header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { amount: 1000 },
      skipAuth: true,
      idempotencyKey: 'auto',
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    const key = headers['Idempotency-Key']
    expect(key).toBeDefined()
    expect(key).toMatch(UUID_V4_RE)
  })

  it("'auto' generates a fresh UUID for each call (no reuse across calls)", async () => {
    // Each `Response` body can be read once — use `mockResolvedValueOnce`
    // twice to hand back two fresh instances.
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { n: 1 },
      skipAuth: true,
      idempotencyKey: 'auto',
    })
    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { n: 2 },
      skipAuth: true,
      idempotencyKey: 'auto',
    })

    const h1 = headersFromInit(fetchMock.mock.calls[0]?.[1] as RequestInit)
    const h2 = headersFromInit(fetchMock.mock.calls[1]?.[1] as RequestInit)
    const k1 = h1['Idempotency-Key']
    const k2 = h2['Idempotency-Key']
    expect(k1).toMatch(UUID_V4_RE)
    expect(k2).toMatch(UUID_V4_RE)
    expect(k1).not.toBe(k2)
  })

  it('caller-supplied string is forwarded verbatim (no SDK-side validation)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/refunds', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { chargeId: 'ch_123' },
      skipAuth: true,
      idempotencyKey: 'custom-key-123',
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    expect(headers['Idempotency-Key']).toBe('custom-key-123')
  })

  it('omitted idempotencyKey sends no Idempotency-Key header (backward-compat)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { amount: 1000 },
      skipAuth: true,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    // Belt-and-braces — neither canonical nor any common alt case.
    expect(headers['Idempotency-Key']).toBeUndefined()
    expect(headers['idempotency-key']).toBeUndefined()
    expect(headers['IDEMPOTENCY-KEY']).toBeUndefined()
  })

  it('caller-supplied Idempotency-Key header (canonical case) wins over idempotencyKey: auto', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: {},
      skipAuth: true,
      idempotencyKey: 'auto',
      headers: { 'Idempotency-Key': 'caller-key' },
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    expect(headers['Idempotency-Key']).toBe('caller-key')
    // Confirm the SDK did not also inject under a different casing.
    expect(headers['idempotency-key']).toBeUndefined()
  })

  it('caller-supplied idempotency-key header (lowercase) wins case-insensitively', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/donations', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: {},
      skipAuth: true,
      idempotencyKey: 'auto',
      headers: { 'idempotency-key': 'caller-lower' },
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    expect(headers['idempotency-key']).toBe('caller-lower')
    // SDK must not duplicate under the canonical case.
    expect(headers['Idempotency-Key']).toBeUndefined()
  })

  it("'auto' on a GET request still sends the header (SDK does not filter by method)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await apiCall('/things', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'GET',
      skipAuth: true,
      idempotencyKey: 'auto',
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = headersFromInit(init)
    expect(init.method).toBe('GET')
    expect(headers['Idempotency-Key']).toMatch(UUID_V4_RE)
  })

  it("throws explicit error when crypto.randomUUID is unavailable and idempotencyKey is 'auto'", async () => {
    // Mock the runtime as if `crypto` exists but `randomUUID` is missing
    // (covers legacy browsers / old Node without secure-context crypto).
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {})

    // Fetch must NOT be called — the error fires before request building completes.
    await expect(
      apiCall('/donations', {
        appName: 'ezauth',
        baseUrl: TEST_BASE,
        method: 'POST',
        body: {},
        skipAuth: true,
        idempotencyKey: 'auto',
      })
    ).rejects.toThrow(/crypto\.randomUUID/)

    expect(fetchMock).not.toHaveBeenCalled()

    // Restore for other tests in the file.
    vi.stubGlobal('crypto', originalCrypto)
  })
})
