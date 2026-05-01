/**
 * Tests for `signWebhook` — generic HMAC webhook signer.
 *
 * Round-trip with `verifyEzstartSignature` from `@ezstart/api-core` proves
 * sender output is always accepted by the canonical receiver.
 */
import { describe, expect, it } from 'vitest'
import { parseEzstartSignatureHeader, verifyEzstartSignature } from '@ezstart/api-core'
import { signWebhook } from '../../server/webhook-signer.js'

describe('signWebhook', () => {
  it('returns a single-key headers object with the X-EZStart-Signature key', () => {
    const headers = signWebhook({
      secret: 'whsec_test',
      body: '{"hello":"world"}',
      timestamp: '1700000000',
    })
    expect(headers).toEqual({
      'X-EZStart-Signature': expect.stringMatching(/^t=1700000000,v1=[0-9a-f]{64}$/),
    })
  })

  it('uses the provided timestamp verbatim in the t= field', () => {
    const headers = signWebhook({
      secret: 'whsec_test',
      body: '{}',
      timestamp: '1234567890',
    })
    const parsed = parseEzstartSignatureHeader(headers['X-EZStart-Signature'])
    expect(parsed?.timestamp).toBe('1234567890')
  })

  it('defaults to a current unix-seconds timestamp when omitted', () => {
    const before = Math.floor(Date.now() / 1000)
    const headers = signWebhook({
      secret: 'whsec_test',
      body: '{}',
    })
    const after = Math.floor(Date.now() / 1000)
    const parsed = parseEzstartSignatureHeader(headers['X-EZStart-Signature'])
    expect(parsed).not.toBeNull()
    const ts = Number(parsed?.timestamp)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('round-trips: signed header is accepted by verifyEzstartSignature with the same secret', () => {
    const secret = 'whsec_round_trip_secret'
    const body = '{"event":"subscription.created","userId":"u-1"}'
    const timestamp = String(Math.floor(Date.now() / 1000))

    const headers = signWebhook({ secret, body, timestamp })
    const result = verifyEzstartSignature({
      header: headers['X-EZStart-Signature'],
      secret,
      rawBody: body,
    })
    expect(result).toEqual({ ok: true })
  })

  it('round-trip fails when the receiver uses a different secret', () => {
    const body = '{"foo":"bar"}'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const headers = signWebhook({ secret: 'sender-secret', body, timestamp })
    const result = verifyEzstartSignature({
      header: headers['X-EZStart-Signature'],
      secret: 'wrong-secret',
      rawBody: body,
    })
    expect(result).toEqual({ ok: false, reason: 'signature' })
  })

  it('throws when secret is missing', () => {
    expect(() => signWebhook({ secret: '', body: '{}' })).toThrow('secret is required')
  })

  it('throws when body is not a string', () => {
    // Force a runtime type violation through a typed cast — the public API
    // refuses non-string bodies and the runtime guard must back that up.
    const misuse = signWebhook as (opts: { secret: string; body: unknown }) => unknown
    expect(() => misuse({ secret: 's', body: { foo: 1 } })).toThrow('body must be a string')
  })
})
