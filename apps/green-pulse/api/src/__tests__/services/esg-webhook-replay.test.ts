/**
 * Replay protection guard for the ESG webhook verifier (hacker A1b — V3).
 *
 * Reproduces the replay-attack vulnerability where a captured legitimate
 * signature could be replayed indefinitely (no timestamp / tolerance window
 * — green-pulse accepted any signed body, forever). The fix is the
 * EZStart-Signature timestamped protocol with a 5-minute tolerance window
 * (matches Stripe / ezauth pattern).
 *
 * Header format: `t=<unix-seconds>,v1=<hex-hmac-sha256>` where the HMAC is
 * computed over `"{timestamp}.{rawBody}"` — so an attacker who captures a
 * legitimate signature cannot replay it past the tolerance window without
 * also knowing the secret.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { esgService } from '../../services/esg.service.js'

const TEST_SECRET = 'whsec_replay_protection_test'

function buildHeader(secret: string, timestamp: string, body: string): string {
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${sig}`
}

describe('esgService.verifyTimestampedSignature — replay protection (V3)', () => {
  const originalSecret = process.env.WEBHOOK_SIGNING_SECRET

  beforeEach(() => {
    process.env.WEBHOOK_SIGNING_SECRET = TEST_SECRET
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.WEBHOOK_SIGNING_SECRET
    } else {
      process.env.WEBHOOK_SIGNING_SECRET = originalSecret
    }
  })

  it('accepts a fresh timestamped signature within the tolerance window', () => {
    const body = '{"event_type":"report.completed","job_id":"job_fresh"}'
    const ts = '1700000000'
    const header = buildHeader(TEST_SECRET, ts, body)

    const result = esgService.verifyTimestampedSignature(
      Buffer.from(body, 'utf8'),
      header,
      () => 1700000010 // 10s after signing — well within 5min window
    )

    expect(result.ok).toBe(true)
  })

  it('rejects a replay 6 minutes after signing (outside 5min tolerance)', () => {
    const body = '{"event_type":"report.completed","job_id":"job_replay"}'
    const ts = '1700000000'
    const header = buildHeader(TEST_SECRET, ts, body)

    const result = esgService.verifyTimestampedSignature(
      Buffer.from(body, 'utf8'),
      header,
      () => 1700000000 + 6 * 60 // 6 min later — past the 5min window
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('replay')
  })

  it('rejects a future timestamp more than 5 minutes ahead (clock skew abuse)', () => {
    const body = '{"event_type":"report.completed","job_id":"job_future"}'
    const ts = '1700000600' // 10 min in the future from "now"
    const header = buildHeader(TEST_SECRET, ts, body)

    const result = esgService.verifyTimestampedSignature(
      Buffer.from(body, 'utf8'),
      header,
      () => 1700000000
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('replay')
  })

  it('rejects a tampered timestamp (signature was over a different t)', () => {
    const body = '{"k":"v"}'
    const ts = '1700000000'
    const header = buildHeader(TEST_SECRET, ts, body)
    // Attacker bumps `t=` to slide back into the tolerance window but the
    // signature was computed over the ORIGINAL ts → HMAC mismatch.
    const tamperedHeader = header.replace(`t=${ts}`, 't=1700000600')

    const result = esgService.verifyTimestampedSignature(
      Buffer.from(body, 'utf8'),
      tamperedHeader,
      () => 1700000600
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('signature')
  })

  it('rejects a malformed header (no `t=` part)', () => {
    const result = esgService.verifyTimestampedSignature(
      Buffer.from('{}', 'utf8'),
      'v1=deadbeef',
      () => 1700000000
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('malformed')
  })

  it('rejects an undefined header', () => {
    const result = esgService.verifyTimestampedSignature(
      Buffer.from('{}', 'utf8'),
      undefined,
      () => 1700000000
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('malformed')
  })

  it('rejects a tampered body (signature was over a different body)', () => {
    const originalBody = '{"event_type":"report.completed","job_id":"orig"}'
    const ts = '1700000000'
    const header = buildHeader(TEST_SECRET, ts, originalBody)
    // Attacker swaps the body — HMAC was computed over the original bytes.
    const tamperedBody = '{"event_type":"report.completed","job_id":"hacker"}'

    const result = esgService.verifyTimestampedSignature(
      Buffer.from(tamperedBody, 'utf8'),
      header,
      () => 1700000010
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('signature')
  })
})
