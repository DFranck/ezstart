/**
 * Tests for the @ezstart/api-core crypto module.
 *
 * Three concentric layers of coverage:
 *
 *   1. **base64url** — round-trip + edge cases (empty, binary, unicode).
 *
 *   2. **hmacSign / hmacVerify** — round-trip in both encodings (`hex` and
 *      `base64url`), tampered-signature rejection, length-mismatch rejection,
 *      and a structural check that the verify uses `crypto.timingSafeEqual`
 *      (NOT `===` — see `.claude/rules/standard-saas-security.md` §6).
 *
 *   3. **EZStart-Signature protocol** — parse / verify / replay window, and a
 *      **round-trip lock** test that proves `buildEzstartSignatureHeader`
 *      output is always accepted by `verifyEzstartSignature`. This is the
 *      contract between sender (`apps/ezpay/api`) and receiver
 *      (`apps/ezauth/api`); if it ever drifts, this test catches the regression.
 *
 * @module @ezstart/api-core/__tests__/core/crypto.test
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  base64urlDecode,
  base64urlEncode,
  buildEzstartSignatureHeader,
  EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS,
  hmacSign,
  hmacVerify,
  parseEzstartSignatureHeader,
  verifyEzstartSignature,
} from '../../core/crypto.js'

// ============================================================================
//  base64url
// ============================================================================

describe('base64url', () => {
  it('round-trips ASCII text', () => {
    const original = Buffer.from('hello world', 'utf8')
    const encoded = base64urlEncode(original)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    expect(base64urlDecode(encoded).toString('utf8')).toBe('hello world')
  })

  it('round-trips binary buffers including bytes that map to + and /', () => {
    // Bytes 0xFB / 0xFF / 0xBF push standard base64 to use `+` and `/` chars,
    // which base64url MUST replace with `-` and `_` respectively.
    const original = Buffer.from([0xfb, 0xff, 0xbf, 0xfe, 0x00, 0xab])
    const encoded = base64urlEncode(original)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    const decoded = base64urlDecode(encoded)
    expect(decoded.equals(original)).toBe(true)
  })

  it('round-trips an empty buffer', () => {
    expect(base64urlEncode(Buffer.alloc(0))).toBe('')
    expect(base64urlDecode('').length).toBe(0)
  })
})

// ============================================================================
//  hmacSign / hmacVerify
// ============================================================================

describe('hmacSign / hmacVerify', () => {
  const SECRET = 'whsec_test_super_secret_xyz'
  const PAYLOAD = '1714518000.{"foo":"bar","baz":42}'

  it('round-trips a hex signature', () => {
    const sig = hmacSign(PAYLOAD, SECRET)
    // SHA-256 hex output is exactly 64 chars
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
    expect(hmacVerify(PAYLOAD, sig, SECRET)).toBe(true)
  })

  it('round-trips a base64url signature', () => {
    const sig = hmacSign(PAYLOAD, SECRET, 'base64url')
    // SHA-256 base64url output: 32 raw bytes -> 43 chars (no padding)
    expect(sig).toHaveLength(43)
    expect(sig).not.toContain('+')
    expect(sig).not.toContain('/')
    expect(sig).not.toContain('=')
    expect(hmacVerify(PAYLOAD, sig, SECRET, 'base64url')).toBe(true)
  })

  it('rejects a signature signed with a different secret', () => {
    const sig = hmacSign(PAYLOAD, SECRET)
    expect(hmacVerify(PAYLOAD, sig, 'whsec_different_secret_zzz')).toBe(false)
  })

  it('rejects a tampered hex signature (one bit flipped)', () => {
    const sig = hmacSign(PAYLOAD, SECRET)
    // Flip the last hex char to produce a same-length but invalid signature.
    const tampered = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    expect(tampered).toHaveLength(sig.length)
    expect(hmacVerify(PAYLOAD, tampered, SECRET)).toBe(false)
  })

  it('rejects an empty signature without throwing', () => {
    expect(hmacVerify(PAYLOAD, '', SECRET)).toBe(false)
  })

  it('rejects a signature with mismatched length (no exception)', () => {
    expect(hmacVerify(PAYLOAD, 'short', SECRET)).toBe(false)
  })

  it('uses crypto.timingSafeEqual under the hood (timing-attack defense)', () => {
    // Spy-based verification is impossible in ESM (the `node:crypto` module
    // namespace is not configurable, see vitest ESM limitations). We instead
    // assert the property structurally by reading the compiled source: the
    // verifier MUST import + call `timingSafeEqual`, and MUST NOT contain a
    // raw `===` over signature strings. A regression to `===` would be a
    // security violation banned by .claude/rules/standard-saas-security.md §6.
    const here = dirname(fileURLToPath(import.meta.url))
    const cryptoSrc = readFileSync(resolve(here, '../../core/crypto.ts'), 'utf8')
    expect(cryptoSrc).toContain('timingSafeEqual')
    // No `signature ===` raw compare anywhere in the module (only allowed
    // shape is `expected.length !== signature.length` for the length guard).
    expect(cryptoSrc).not.toMatch(/signature\s*===\s*expected/)
    expect(cryptoSrc).not.toMatch(/expected\s*===\s*signature/)
  })
})

// ============================================================================
//  parseEzstartSignatureHeader
// ============================================================================

describe('parseEzstartSignatureHeader', () => {
  it('parses a well-formed header', () => {
    const result = parseEzstartSignatureHeader('t=1714518000,v1=8f3cabcdef')
    expect(result).toEqual({ timestamp: '1714518000', signature: '8f3cabcdef' })
  })

  it('tolerates and ignores extra k=v pairs (forward-compat with v2=)', () => {
    const result = parseEzstartSignatureHeader('t=1714518000,v1=hex,v2=future,extra=junk')
    expect(result).toEqual({ timestamp: '1714518000', signature: 'hex' })
  })

  it('returns null for an undefined header', () => {
    expect(parseEzstartSignatureHeader(undefined)).toBeNull()
  })

  it('returns null when v1= is missing', () => {
    expect(parseEzstartSignatureHeader('t=1714518000')).toBeNull()
  })

  it('returns null when t= is missing', () => {
    expect(parseEzstartSignatureHeader('v1=8f3c')).toBeNull()
  })

  it('returns null when t= or v1= value is empty', () => {
    expect(parseEzstartSignatureHeader('t=,v1=8f3c')).toBeNull()
    expect(parseEzstartSignatureHeader('t=1714518000,v1=')).toBeNull()
  })

  it('returns null on completely malformed input', () => {
    expect(parseEzstartSignatureHeader('garbage without separators')).toBeNull()
    expect(parseEzstartSignatureHeader('')).toBeNull()
  })
})

// ============================================================================
//  verifyEzstartSignature
// ============================================================================

describe('verifyEzstartSignature', () => {
  const SECRET = 'whsec_test_super_secret_xyz'
  const FIXED_NOW_SEC = 1_714_518_000 // 2026-04-30 (any stable value works)
  const TS = String(FIXED_NOW_SEC)
  const RAW_BODY = JSON.stringify({ stripeEventId: 'evt_123', timestamp: TS })

  function fixedNow() {
    return FIXED_NOW_SEC
  }

  function buildHeader(opts: { secret?: string; timestamp?: string; body?: string } = {}) {
    return buildEzstartSignatureHeader({
      secret: opts.secret ?? SECRET,
      timestamp: opts.timestamp ?? TS,
      body: opts.body ?? RAW_BODY,
    })
  }

  it('accepts a signature signed with the same secret + body', () => {
    const header = buildHeader()
    const result = verifyEzstartSignature({
      header,
      secret: SECRET,
      rawBody: RAW_BODY,
      now: fixedNow,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects with reason "signature" when the secret does not match', () => {
    const header = buildHeader()
    const result = verifyEzstartSignature({
      header,
      secret: 'whsec_wrong_secret',
      rawBody: RAW_BODY,
      now: fixedNow,
    })
    expect(result).toEqual({ ok: false, reason: 'signature' })
  })

  it('rejects with reason "signature" when the body has been tampered', () => {
    const header = buildHeader()
    const result = verifyEzstartSignature({
      header,
      secret: SECRET,
      rawBody: RAW_BODY + ' ', // single trailing space = byte-different body
      now: fixedNow,
    })
    expect(result).toEqual({ ok: false, reason: 'signature' })
  })

  it('rejects with reason "malformed" when the header is missing', () => {
    expect(
      verifyEzstartSignature({
        header: undefined,
        secret: SECRET,
        rawBody: RAW_BODY,
        now: fixedNow,
      })
    ).toEqual({ ok: false, reason: 'malformed' })
  })

  it('rejects with reason "malformed" when the header is unparseable', () => {
    expect(
      verifyEzstartSignature({
        header: 'garbage,v1=only',
        secret: SECRET,
        rawBody: RAW_BODY,
        now: fixedNow,
      })
    ).toEqual({ ok: false, reason: 'malformed' })
  })

  it('rejects with reason "malformed" when the timestamp is non-numeric', () => {
    // Re-build the header but with a non-numeric "timestamp" — the signature
    // is still valid for that string, but the verifier must reject before
    // doing any time-arithmetic.
    const badTs = 'not-a-number'
    const header = buildEzstartSignatureHeader({
      secret: SECRET,
      timestamp: badTs,
      body: RAW_BODY,
    })
    expect(
      verifyEzstartSignature({
        header,
        secret: SECRET,
        rawBody: RAW_BODY,
        now: fixedNow,
      })
    ).toEqual({ ok: false, reason: 'malformed' })
  })

  it('rejects with reason "replay" when the timestamp is too old', () => {
    const header = buildHeader({ timestamp: String(FIXED_NOW_SEC - 600) })
    const result = verifyEzstartSignature({
      header,
      secret: SECRET,
      rawBody: RAW_BODY,
      now: fixedNow,
    })
    expect(result).toEqual({ ok: false, reason: 'replay' })
  })

  it('rejects with reason "replay" when the timestamp is too far in the future', () => {
    const header = buildHeader({ timestamp: String(FIXED_NOW_SEC + 600) })
    const result = verifyEzstartSignature({
      header,
      secret: SECRET,
      rawBody: RAW_BODY,
      now: fixedNow,
    })
    expect(result).toEqual({ ok: false, reason: 'replay' })
  })

  it('honours a custom replayWindowSec', () => {
    // 30s old, default 5min window would accept; force a 10s window to reject.
    const header = buildHeader({ timestamp: String(FIXED_NOW_SEC - 30) })
    expect(
      verifyEzstartSignature({
        header,
        secret: SECRET,
        rawBody: RAW_BODY,
        replayWindowSec: 10,
        now: fixedNow,
      })
    ).toEqual({ ok: false, reason: 'replay' })

    // Same input under the default window passes.
    expect(
      verifyEzstartSignature({
        header,
        secret: SECRET,
        rawBody: RAW_BODY,
        now: fixedNow,
      }).ok
    ).toBe(true)
  })

  it('exports the documented default replay window (5 min)', () => {
    expect(EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS).toBe(5 * 60)
  })
})

// ============================================================================
//  PROTOCOL ROUND-TRIP LOCK — sender ↔ receiver contract
// ============================================================================

describe('EZStart-Signature protocol — round-trip lock', () => {
  /**
   * Hard guarantee: anything `buildEzstartSignatureHeader` produces MUST be
   * accepted by `verifyEzstartSignature` when given the same secret + body.
   *
   * This is the contract between sender (`apps/ezpay/api/src/services/
   * ezauth-subscription-webhook.ts`) and receiver (`apps/ezauth/api/src/
   * routes/subscriptions/webhook.ts`). If anyone ever changes one side
   * without the other (e.g. switches encoding, tweaks the separator,
   * normalizes the body), this test fails loudly.
   */
  it('build → verify always passes for arbitrary bodies', () => {
    const SECRET = 'whsec_round_trip_xyz'
    const FIXED_NOW = 1_714_518_000
    const bodies = [
      '',
      '{}',
      JSON.stringify({ a: 1 }),
      JSON.stringify({ stripeEventId: 'evt_abc', nested: { x: [1, 2, 3] } }),
      // UTF-8 content (accents, CJK, emoji) — the protocol must be byte-clean.
      JSON.stringify({ note: 'café — 茶 — coffee' }),
      // Long body — exercise the hashing path with > 4 KB of data.
      JSON.stringify({ blob: 'x'.repeat(8192) }),
    ]
    for (const body of bodies) {
      const header = buildEzstartSignatureHeader({
        secret: SECRET,
        timestamp: String(FIXED_NOW),
        body,
      })
      const result = verifyEzstartSignature({
        header,
        secret: SECRET,
        rawBody: body,
        now: () => FIXED_NOW,
      })
      expect(result.ok, `body length ${body.length} must round-trip`).toBe(true)
    }
  })

  it('build with default timestamp → verify with default clock passes', () => {
    // No explicit timestamp / now — exercise the live `Date.now()` paths so a
    // future regression that mismatches the units (ms vs s) gets caught.
    const SECRET = 'whsec_default_clock_xyz'
    const body = JSON.stringify({ hello: 'world' })
    const header = buildEzstartSignatureHeader({ secret: SECRET, body })
    const result = verifyEzstartSignature({ header, secret: SECRET, rawBody: body })
    expect(result.ok).toBe(true)
  })
})
