/**
 * Tests for the deep-health check factories.
 *
 * Each factory is exercised in isolation to lock the {@link HealthCheck}
 * contract: status mapping (`ok` / `degraded` / `down`), timeout handling,
 * and the precise URL / header shape each one ships.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAnthropicCheck,
  createGeminiCheck,
  createHttpCheck,
  createMongoosePingCheck,
  createOpenAICheck,
  createResendCheck,
  createStripeBalanceCheck,
  type MongoosePingable,
  type StripeBalanceClient,
} from '../../core/deep-health-checks.js'

describe('createMongoosePingCheck', () => {
  it('returns down when readyState !== 1', async () => {
    const mongoose: MongoosePingable = {
      connection: { readyState: 0 },
    }
    const check = createMongoosePingCheck(mongoose)
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/readyState=0/)
  })

  it('returns down when connection has no db handle', async () => {
    const mongoose: MongoosePingable = {
      connection: { readyState: 1, db: null },
    }
    const check = createMongoosePingCheck(mongoose)
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/no active db handle/)
  })

  it('returns ok when ping resolves quickly', async () => {
    const mongoose: MongoosePingable = {
      connection: {
        readyState: 1,
        db: { admin: () => ({ ping: () => Promise.resolve({ ok: 1 }) }) },
      },
    }
    const check = createMongoosePingCheck(mongoose)
    const result = await check.check()
    expect(result.status).toBe('ok')
  })

  it('returns degraded when ping is slower than the threshold', async () => {
    const mongoose: MongoosePingable = {
      connection: {
        readyState: 1,
        db: {
          admin: () => ({
            ping: () => new Promise(resolve => setTimeout(() => resolve({ ok: 1 }), 50)),
          }),
        },
      },
    }
    const check = createMongoosePingCheck(mongoose, { slowThresholdMs: 10 })
    const result = await check.check()
    expect(result.status).toBe('degraded')
    expect(result.message).toMatch(/Slow response/)
  })

  it('returns down when ping never resolves before the per-check timeout', async () => {
    const mongoose: MongoosePingable = {
      connection: {
        readyState: 1,
        db: {
          admin: () => ({ ping: () => new Promise(() => {}) }),
        },
      },
    }
    const check = createMongoosePingCheck(mongoose, { timeoutMs: 20 })
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/timed out after 20ms/)
  })
})

describe('createStripeBalanceCheck', () => {
  it('returns ok when balance.retrieve resolves', async () => {
    const stripe: StripeBalanceClient = {
      balance: { retrieve: () => Promise.resolve({ available: [] }) },
    }
    const check = createStripeBalanceCheck(stripe)
    const result = await check.check()
    expect(result.status).toBe('ok')
  })

  it('returns down when balance.retrieve rejects', async () => {
    const stripe: StripeBalanceClient = {
      balance: { retrieve: () => Promise.reject(new Error('invalid key')) },
    }
    const check = createStripeBalanceCheck(stripe, { timeoutMs: 100 })
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toBe('invalid key')
  })

  it('returns down when balance.retrieve hangs longer than the timeout', async () => {
    const stripe: StripeBalanceClient = {
      balance: { retrieve: () => new Promise(() => {}) },
    }
    const check = createStripeBalanceCheck(stripe, { timeoutMs: 15 })
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/timed out after 15ms/)
  })
})

describe('createHttpCheck', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on 200', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    const check = createHttpCheck({ name: 'svc', url: 'https://example.com/ok' })
    const result = await check.check()
    expect(result.status).toBe('ok')
  })

  it('returns ok on 301 (redirect treated as reachable)', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 301 }))
    const check = createHttpCheck({ name: 'svc', url: 'https://example.com/r' })
    const result = await check.check()
    expect(result.status).toBe('ok')
  })

  it('returns down on 500', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }))
    const check = createHttpCheck({ name: 'svc', url: 'https://example.com/err' })
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/HTTP 500/)
  })

  it('returns down on network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const check = createHttpCheck({ name: 'svc', url: 'https://example.com/x' })
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toBe('Failed to fetch')
  })

  it('uses HEAD method by default', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    const check = createHttpCheck({ name: 'svc', url: 'https://example.com/h' })
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/h',
      expect.objectContaining({ method: 'HEAD' })
    )
  })

  it('forwards custom headers', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    const check = createHttpCheck({
      name: 'svc',
      url: 'https://example.com/p',
      method: 'GET',
      headers: { 'X-Custom': 'yes' },
    })
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/p',
      expect.objectContaining({ method: 'GET', headers: { 'X-Custom': 'yes' } })
    )
  })
})

describe('createResendCheck', () => {
  it('hits /domains with Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createResendCheck('re_test_key')
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/domains',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer re_test_key' },
      })
    )
    vi.unstubAllGlobals()
  })
})

describe('createGeminiCheck', () => {
  it('passes the api key via x-goog-api-key header (not query string)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createGeminiCheck('gemini-secret-abc')
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models',
      expect.objectContaining({
        method: 'GET',
        headers: { 'x-goog-api-key': 'gemini-secret-abc' },
      })
    )
    vi.unstubAllGlobals()
  })

  it('never leaks the api key into the request URL (hacker-A8 V1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createGeminiCheck('TOP_SECRET_KEY')
    await check.check()
    const [calledUrl] = fetchMock.mock.calls[0] as [string, unknown]
    expect(calledUrl).not.toContain('TOP_SECRET_KEY')
    expect(calledUrl).not.toContain('?key=')
    vi.unstubAllGlobals()
  })

  it('does not leak the api key in details.url on 401 from Google (hacker-A8 V1)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 401, statusText: 'Unauthorized' }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createGeminiCheck('TOP_SECRET_KEY')
    const result = await check.check()
    expect(result.status).toBe('down')
    expect(result.message).toMatch(/HTTP 401/)
    const detailsUrl = (result.details?.url ?? '') as string
    expect(detailsUrl).not.toContain('TOP_SECRET_KEY')
    expect(detailsUrl).not.toContain('?')
    vi.unstubAllGlobals()
  })
})

describe('createHttpCheck URL sanitization (hacker-A8 V1 defense-in-depth)', () => {
  it('strips query params from details.url when a check returns down', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createHttpCheck({
      name: 'legacy',
      url: 'https://example.com/api?key=LEAKED_SECRET&foo=bar',
      method: 'GET',
    })
    const result = await check.check()
    expect(result.status).toBe('down')
    const detailsUrl = (result.details?.url ?? '') as string
    expect(detailsUrl).toBe('https://example.com/api')
    expect(detailsUrl).not.toContain('LEAKED_SECRET')
    vi.unstubAllGlobals()
  })

  it('strips embedded userinfo (https://user:pass@host) from details.url', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 503, statusText: 'Down' }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createHttpCheck({
      name: 'inline-creds',
      url: 'https://admin:HUNTER2@example.com/api',
      method: 'GET',
    })
    const result = await check.check()
    const detailsUrl = (result.details?.url ?? '') as string
    expect(detailsUrl).not.toContain('HUNTER2')
    expect(detailsUrl).not.toContain('admin')
    vi.unstubAllGlobals()
  })

  it('preserves the path component of the URL in details.url', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createHttpCheck({
      name: 'svc',
      url: 'https://api.example.com/v1/healthz?token=xyz',
    })
    const result = await check.check()
    expect((result.details?.url ?? '') as string).toBe('https://api.example.com/v1/healthz')
    vi.unstubAllGlobals()
  })
})

describe('createOpenAICheck', () => {
  it('hits /v1/models with Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createOpenAICheck('sk-test')
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer sk-test' },
      })
    )
    vi.unstubAllGlobals()
  })
})

describe('createAnthropicCheck', () => {
  it('hits /v1/models with x-api-key + anthropic-version headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const check = createAnthropicCheck('sk-ant-test')
    await check.check()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        },
      })
    )
    vi.unstubAllGlobals()
  })
})
