/**
 * Tests for the EZPay → EZAuth subscription webhook client.
 *
 * Validates happy path (headers + signature), missing env short-circuits
 * (no throw), and network/error resilience (fire-and-forget).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import {
  notifyEzauthSubscription,
  buildSignatureHeader,
  type SubscriptionWebhookPayload,
} from '../../services/ezauth-subscription-webhook.js'

const originalFetch = globalThis.fetch

const BASE_PAYLOAD: SubscriptionWebhookPayload = {
  applicationId: 'app-1',
  userId: 'user-1',
  subscriptionId: 'sub_test',
  planId: 'plan-1',
  stripeEventId: 'evt_test',
  status: 'active',
  grantsRoles: ['pro'],
  grantsFeatures: ['beta-dashboard'],
}

function okResponse(status = 200): Response {
  return new Response(JSON.stringify({ success: true, data: { applied: true } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('notifyEzauthSubscription', () => {
  let originalSecret: string | undefined
  let originalApiKey: string | undefined

  beforeEach(() => {
    originalSecret = process.env.EZAUTH_WEBHOOK_SECRET
    originalApiKey = process.env.EZPAY_SERVER_EZAUTH_KEY
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.EZAUTH_WEBHOOK_SECRET
    else process.env.EZAUTH_WEBHOOK_SECRET = originalSecret
    if (originalApiKey === undefined) delete process.env.EZPAY_SERVER_EZAUTH_KEY
    else process.env.EZPAY_SERVER_EZAUTH_KEY = originalApiKey
  })

  describe('happy path', () => {
    it('POSTs the payload with X-API-Key and X-EZStart-Signature headers', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await notifyEzauthSubscription(BASE_PAYLOAD)

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toMatch(/\/api\/subscriptions\/webhook$/)
      expect(init.method).toBe('POST')
      const headers = init.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-API-Key']).toBe('ez_sk_live_abc')
      expect(headers['X-EZStart-Signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
    })

    it('signs the request with HMAC-SHA256 over `{timestamp}.{body}`', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await notifyEzauthSubscription(BASE_PAYLOAD)

      const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      const sigHeader = headers['X-EZStart-Signature']
      expect(sigHeader).toBeDefined()
      const match = sigHeader?.match(/^t=(\d+),v1=([0-9a-f]+)$/)
      if (!match) {
        throw new Error('signature header did not match expected format')
      }
      const timestamp = match[1]
      const signature = match[2]
      const body = init.body as string

      const expected = createHmac('sha256', 'test-secret')
        .update(`${timestamp}.${body}`)
        .digest('hex')
      expect(signature).toBe(expected)
    })

    it('includes the signed `timestamp` field in the request body', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await notifyEzauthSubscription(BASE_PAYLOAD)

      const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      const parsed = JSON.parse(init.body as string)
      expect(parsed.timestamp).toMatch(/^\d+$/)
      expect(parsed.applicationId).toBe('app-1')
      expect(parsed.grantsRoles).toEqual(['pro'])
    })
  })

  describe('missing env vars — skip silently', () => {
    it('skips without calling fetch when EZAUTH_WEBHOOK_SECRET is absent', async () => {
      delete process.env.EZAUTH_WEBHOOK_SECRET
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('skips without calling fetch when EZPAY_SERVER_EZAUTH_KEY is absent', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      delete process.env.EZPAY_SERVER_EZAUTH_KEY
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('resilience — never throws', () => {
    it('does not throw on network error', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      globalThis.fetch = vi.fn(async () => {
        throw new Error('network down')
      }) as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
    })

    it('does not throw on 500 response', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      globalThis.fetch = vi.fn(async () => okResponse(500)) as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
    })

    it('does not throw on abort (timeout)', async () => {
      process.env.EZAUTH_WEBHOOK_SECRET = 'test-secret'
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      globalThis.fetch = vi.fn(async () => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        throw err
      }) as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
    })
  })
})

describe('buildSignatureHeader', () => {
  it('produces `t=<ts>,v1=<hex>` format', () => {
    const header = buildSignatureHeader('secret', '1700000000', '{"x":1}')
    expect(header).toMatch(/^t=1700000000,v1=[0-9a-f]{64}$/)
  })

  it('is deterministic given the same inputs', () => {
    const a = buildSignatureHeader('s', '1', 'body')
    const b = buildSignatureHeader('s', '1', 'body')
    expect(a).toBe(b)
  })

  it('differs when secret changes', () => {
    const a = buildSignatureHeader('s1', '1', 'body')
    const b = buildSignatureHeader('s2', '1', 'body')
    expect(a).not.toBe(b)
  })

  it('differs when body changes', () => {
    const a = buildSignatureHeader('s', '1', 'b1')
    const b = buildSignatureHeader('s', '1', 'b2')
    expect(a).not.toBe(b)
  })
})
