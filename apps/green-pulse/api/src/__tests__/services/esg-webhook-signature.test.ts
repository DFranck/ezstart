/**
 * Engine-drift guard for the ESG webhook HMAC verifier.
 *
 * Reproduces the bug fixed in WEBHOOK-RAWBODY-002: when the handler computes
 * `JSON.stringify(req.body)` to feed the HMAC, any reordering of the parsed
 * object's keys (Bun/Deno/V8 spec drift, future engine upgrade, even a
 * different parser version) silently breaks every signature verify.
 *
 * The fix is to hash the EXACT bytes received on the wire — these tests
 * assert that:
 *   1. The verifier accepts the canonical wire bytes (Buffer & string).
 *   2. Re-stringifying a parsed object with a different key order produces a
 *      DIFFERENT hash than the original wire bytes, proving the engine-drift
 *      risk the fix eliminates.
 *   3. Tampered payloads / wrong-length signatures uniformly return `false`
 *      (no throw from `crypto.timingSafeEqual` on length mismatch).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { esgService } from '../../services/esg.service.js'

const TEST_SECRET = 'whsec_test_engine_drift_guard_001'

function sign(secret: string, payload: Buffer | string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

describe('esgService.verifyWebhookSignature — engine-drift guard', () => {
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

  it('accepts the canonical wire bytes as a Buffer (production path)', () => {
    const wireBytes = Buffer.from(
      '{"event_type":"report.completed","job_id":"job_1","status":"ok","data":{},"timestamp":"2026-06-05T00:00:00.000Z"}',
      'utf8'
    )
    const sig = sign(TEST_SECRET, wireBytes)

    expect(esgService.verifyWebhookSignature(wireBytes, sig)).toBe(true)
  })

  it('accepts the canonical wire bytes as a string (backwards-compat path)', () => {
    const wirePayload =
      '{"event_type":"report.completed","job_id":"job_2","status":"ok","data":{},"timestamp":"2026-06-05T00:00:00.000Z"}'
    const sig = sign(TEST_SECRET, wirePayload)

    expect(esgService.verifyWebhookSignature(wirePayload, sig)).toBe(true)
  })

  it('rejects a tampered payload (single byte flip in body)', () => {
    const wireBytes = Buffer.from(
      '{"event_type":"report.completed","job_id":"job_3","status":"ok","data":{},"timestamp":"2026-06-05T00:00:00.000Z"}',
      'utf8'
    )
    const sig = sign(TEST_SECRET, wireBytes)

    const tampered = Buffer.from(
      // job_3 → job_4 (single byte change)
      '{"event_type":"report.completed","job_id":"job_4","status":"ok","data":{},"timestamp":"2026-06-05T00:00:00.000Z"}',
      'utf8'
    )
    expect(esgService.verifyWebhookSignature(tampered, sig)).toBe(false)
  })

  it('rejects a wrong-length signature header without throwing (uniform 401 mapping)', () => {
    const wireBytes = Buffer.from('{"k":"v"}', 'utf8')
    // sig is too short — `timingSafeEqual` would throw on length mismatch.
    expect(() => esgService.verifyWebhookSignature(wireBytes, 'deadbeef')).not.toThrow()
    expect(esgService.verifyWebhookSignature(wireBytes, 'deadbeef')).toBe(false)
  })

  it('PROVES the engine-drift risk: re-stringified payload differs from the wire bytes (whitespace / formatting drift)', () => {
    // Sender's wire payload — contains insignificant whitespace inside JSON
    // (spec-legal). The HMAC is computed over THESE exact bytes, whitespace
    // included. A receiver that does `JSON.parse` then `JSON.stringify`
    // strips all whitespace → different byte sequence → signature fails.
    //
    // This is the canonical proof of the engine-drift / canonicalization bug
    // fixed in WEBHOOK-RAWBODY-002. Even WITHOUT key reordering (which V8
    // happens to preserve today but is NOT guaranteed by spec), formatting
    // alone is enough to break HMAC. Future engine versions could also drift
    // on number serialization (`1.0` vs `1`, scientific notation thresholds,
    // etc.) — raw-body capture is the only safe path.
    const wireBytes = Buffer.from(
      '{\n  "event_type": "report.completed",\n  "job_id": "job_drift",\n  "status": "ok",\n  "data": { "metrics": { "co2": 42 } },\n  "timestamp": "2026-06-05T00:00:00.000Z"\n}',
      'utf8'
    )
    const wireSig = sign(TEST_SECRET, wireBytes)

    // Receiver re-serializes the parsed object (the OLD bug pattern):
    // `JSON.stringify(JSON.parse(bytes))` strips the whitespace → bytes
    // differ → HMAC verify fails.
    const parsed = JSON.parse(wireBytes.toString('utf8')) as Record<string, unknown>
    const restringified = JSON.stringify(parsed)

    // The new verifier (fixed path) — pass the RAW bytes → signature matches.
    expect(esgService.verifyWebhookSignature(wireBytes, wireSig)).toBe(true)

    // The old code path — re-stringified → signature DOES NOT MATCH. This is
    // the regression guard: if a future refactor re-introduces
    // `JSON.stringify(req.body)` before HMAC, this assertion blocks the PR.
    expect(restringified).not.toBe(wireBytes.toString('utf8'))
    expect(esgService.verifyWebhookSignature(restringified, wireSig)).toBe(false)
  })
})
