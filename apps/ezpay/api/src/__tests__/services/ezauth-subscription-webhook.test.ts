/**
 * Tests for the EZPay → EZAuth subscription webhook client.
 *
 * Validates happy path (headers + signature using the per-Application
 * webhook secret loaded from ezauth via S2S), missing-config short-circuits
 * (no throw), and network/error resilience (fire-and-forget).
 *
 * Post V2 refactor (2026-05-01): the sender no longer reads
 * `EZAUTH_WEBHOOK_SECRET` from env. It calls `getApplication(id, {
 * includeWebhookSecret: true })` and signs with the per-Application
 * `whsec_*` secret. The destination URL also comes from
 * `Application.webhookEndpointUrl` when set, else the canonical default.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import {
  notifyEzauthSubscription,
  buildSignatureHeader,
  type SubscriptionWebhookPayload,
} from '../../services/ezauth-subscription-webhook.js'
import * as ezauthClient from '../../services/ezauth-client.js'

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

const PER_APP_SECRET = 'whsec_per_application_secret_for_test_fixture_value_xxxxxxxxx'

function okResponse(status = 200): Response {
  return new Response(JSON.stringify({ success: true, data: { applied: true } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Mock the ezauth-client's `getApplication` so the test never reaches the
 * actual S2S endpoint. Returns the supplied Application shape (or null).
 */
function mockGetApplication(
  app: (Partial<ezauthClient.EzauthApplication> & { webhookSecret?: string }) | null
) {
  vi.spyOn(ezauthClient, 'getApplication').mockResolvedValue(
    app
      ? ({
          id: 'app-1',
          slug: 'acme',
          name: 'Acme',
          ownerId: 'system',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          webhookSecret: PER_APP_SECRET,
          webhookEndpointUrl: null,
          ...app,
        } as ezauthClient.EzauthApplication)
      : null
  )
}

describe('notifyEzauthSubscription', () => {
  let originalApiKey: string | undefined

  beforeEach(() => {
    originalApiKey = process.env.EZPAY_SERVER_EZAUTH_KEY
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalApiKey === undefined) delete process.env.EZPAY_SERVER_EZAUTH_KEY
    else process.env.EZPAY_SERVER_EZAUTH_KEY = originalApiKey
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('POSTs the payload with X-API-Key and X-EZStart-Signature headers', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
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

    it('signs the request with HMAC-SHA256 over `{timestamp}.{body}` using the per-Application secret', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
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

      // The signature MUST verify against the per-Application secret returned
      // by the mocked getApplication() call — proving the sender uses the
      // correct value, not a stale env var.
      const expected = createHmac('sha256', PER_APP_SECRET)
        .update(`${timestamp}.${body}`)
        .digest('hex')
      expect(signature).toBe(expected)
    })

    it('includes the signed `timestamp` field in the request body', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await notifyEzauthSubscription(BASE_PAYLOAD)

      const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      const parsed = JSON.parse(init.body as string)
      expect(parsed.timestamp).toMatch(/^\d+$/)
      expect(parsed.applicationId).toBe('app-1')
      expect(parsed.grantsRoles).toEqual(['pro'])
    })

    it('honors a custom webhookEndpointUrl override on the Application', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({ webhookEndpointUrl: 'https://acme.example.com/hooks/ezpay' })
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await notifyEzauthSubscription(BASE_PAYLOAD)

      const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('https://acme.example.com/hooks/ezpay')
    })

    it('uses a different signature when the per-Application secret differs', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'

      const extractSigTail = (mockFetch: ReturnType<typeof vi.fn>): string => {
        const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit] | undefined
        if (!call) throw new Error('fetch was not called')
        const headers = call[1].headers as Record<string, string>
        const sig = headers['X-EZStart-Signature']
        if (!sig) throw new Error('signature header missing')
        const tail = sig.split('v1=')[1]
        if (!tail) throw new Error('signature tail missing')
        return tail
      }

      mockGetApplication({
        webhookSecret: 'whsec_first_app_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      })
      const mockFetch1 = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch1 as typeof fetch
      await notifyEzauthSubscription({ ...BASE_PAYLOAD, stripeEventId: 'evt_first' })
      const tail1 = extractSigTail(mockFetch1)

      vi.restoreAllMocks()
      mockGetApplication({
        webhookSecret: 'whsec_second_app_secret_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      })
      const mockFetch2 = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch2 as typeof fetch
      await notifyEzauthSubscription({ ...BASE_PAYLOAD, stripeEventId: 'evt_second' })
      const tail2 = extractSigTail(mockFetch2)

      // Both signatures share the timestamp prefix at the same second-precision
      // wall clock, so we only compare the v1=<hex> tails.
      expect(tail1).not.toBe(tail2)
    })
  })

  describe('missing config — skip silently', () => {
    it('skips without calling fetch when EZPAY_SERVER_EZAUTH_KEY is absent', async () => {
      delete process.env.EZPAY_SERVER_EZAUTH_KEY
      mockGetApplication({})
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('skips without calling fetch when getApplication returns null', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication(null)
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('skips without calling fetch when the Application has no webhookSecret', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      // Application loaded but legacy doc is missing webhookSecret.
      mockGetApplication({ webhookSecret: undefined })
      const mockFetch = vi.fn(async () => okResponse())
      globalThis.fetch = mockFetch as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('resilience — never throws', () => {
    it('does not throw on network error', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
      globalThis.fetch = vi.fn(async () => {
        throw new Error('network down')
      }) as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
    })

    it('does not throw on 500 response', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
      globalThis.fetch = vi.fn(async () => okResponse(500)) as typeof fetch

      await expect(notifyEzauthSubscription(BASE_PAYLOAD)).resolves.toBeUndefined()
    })

    it('does not throw on abort (timeout)', async () => {
      process.env.EZPAY_SERVER_EZAUTH_KEY = 'ez_sk_live_abc'
      mockGetApplication({})
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
