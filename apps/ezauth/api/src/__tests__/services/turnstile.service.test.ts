import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyTurnstileToken } from '../../services/turnstile.service.js'

describe('verifyTurnstileToken', () => {
  const ORIGINAL_SECRET = process.env['TURNSTILE_SECRET_KEY']

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env['TURNSTILE_SECRET_KEY']
    } else {
      process.env['TURNSTILE_SECRET_KEY'] = ORIGINAL_SECRET
    }
  })

  it('returns success=true (no-op) when TURNSTILE_SECRET_KEY is unset', async () => {
    delete process.env['TURNSTILE_SECRET_KEY']
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await verifyTurnstileToken('any-token', '127.0.0.1')

    expect(result).toEqual({ success: true })
    // No network call should have been made — the no-op short-circuits early.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns success=false with missing-token code when token is empty and secret IS set', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await verifyTurnstileToken(undefined, '127.0.0.1')

    expect(result.success).toBe(false)
    expect(result.errorCodes).toEqual(['missing-token'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('forwards Cloudflare success result when verification passes', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await verifyTurnstileToken('valid-token', '203.0.113.42')

    expect(result.success).toBe(true)
    expect(result.errorCodes).toBeUndefined()
  })

  it('forwards Cloudflare failure result with error codes', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await verifyTurnstileToken('bad-token', '127.0.0.1')

    expect(result.success).toBe(false)
    expect(result.errorCodes).toEqual(['invalid-input-response'])
  })

  it('returns network-error code when fetch throws', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'))

    const result = await verifyTurnstileToken('valid-token', '127.0.0.1')

    expect(result.success).toBe(false)
    expect(result.errorCodes).toEqual(['network-error'])
  })

  it('sends secret + response + remoteip in the URL-encoded form body', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await verifyTurnstileToken('the-token', '198.51.100.7')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(init?.method).toBe('POST')
    const body = init?.body as URLSearchParams
    expect(body.get('secret')).toBe('test-secret')
    expect(body.get('response')).toBe('the-token')
    expect(body.get('remoteip')).toBe('198.51.100.7')
  })

  it('omits remoteip when not provided', async () => {
    process.env['TURNSTILE_SECRET_KEY'] = 'test-secret'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await verifyTurnstileToken('the-token')

    const [, init] = fetchMock.mock.calls[0]!
    const body = init?.body as URLSearchParams
    expect(body.has('remoteip')).toBe(false)
  })
})
