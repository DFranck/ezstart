/**
 * Cryptographic primitives for the @ezstart platform.
 *
 * Three layers, ordered from most generic to most opinionated:
 *
 *   1. **base64url** — `base64urlEncode` / `base64urlDecode`. URL-safe base64
 *      with padding stripped (RFC 4648 §5). Used for compact tokens that need
 *      to ride inside URL query strings without `encodeURIComponent`.
 *
 *   2. **HMAC** — `hmacSign` / `hmacVerify`. Generic HMAC-SHA256 sign and
 *      constant-time verify. The encoding (`hex` | `base64url`) is a parameter
 *      so the same primitive serves both the EZStart-Signature protocol (hex)
 *      and the Stripe Connect signed-state pattern (base64url).
 *
 *   3. **EZStart-Signature protocol** — `buildEzstartSignatureHeader` /
 *      `parseEzstartSignatureHeader` / `verifyEzstartSignature`. Implements
 *      the cross-service S2S webhook authentication header used between
 *      `apps/ezpay/api` (sender) and `apps/ezauth/api` (receiver):
 *
 *      ```
 *      X-EZStart-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>
 *      ```
 *
 *      The signed payload is `"{timestamp}.{rawBody}"`. The receiver verifies
 *      both the signature and a 5-minute replay window. Same protocol as
 *      Stripe webhooks, hex-encoded for consistency with Stripe's `v1=`.
 *
 * **Why this lives in @ezstart/api-core**: before this module, the protocol
 * was implemented twice (sender in ezpay, receiver in ezauth) and Stripe
 * Connect had its own private base64url + HMAC primitives in
 * `apps/ezpay/api/src/utils/connect-state.ts`. Drift between sender and
 * receiver = silent webhook breakage in production. Centralizing in api-core
 * locks the protocol forever and enables the round-trip test in
 * `__tests__/core/crypto.test.ts` that proves sender output is always
 * accepted by the receiver.
 *
 * **Security**: every signature comparison goes through
 * `crypto.timingSafeEqual` to defeat timing-oracle attacks. The `===`
 * operator on raw signature strings is forbidden by
 * `.claude/rules/standard-saas-security.md` §6.
 *
 * @module @ezstart/api-core/core/crypto
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

// ============================================================================
//  base64url encoding helpers
// ============================================================================

/**
 * Encode a Buffer as a URL-safe base64 string with padding stripped.
 *
 * Follows RFC 4648 §5: `+` → `-`, `/` → `_`, trailing `=` removed. The
 * output can be embedded directly in a URL query parameter without an
 * additional `encodeURIComponent` call.
 *
 * @example
 * base64urlEncode(Buffer.from('hello')) // → 'aGVsbG8'
 */
export function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a base64url string back into a Buffer.
 *
 * Restores standard base64 padding before delegating to `Buffer.from`.
 * Note that `Buffer.from` is permissive: characters outside the base64url
 * alphabet round-trip to garbage rather than throw, so callers MUST validate
 * the decoded payload shape after decoding (e.g. parse JSON, then check the
 * resulting object's fields).
 *
 * @example
 * base64urlDecode('aGVsbG8').toString('utf8') // → 'hello'
 */
export function base64urlDecode(str: string): Buffer {
  const padLen = (4 - (str.length % 4)) % 4
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  return Buffer.from(normalized, 'base64')
}

// ============================================================================
//  Generic HMAC sign / verify
// ============================================================================

/** Encoding used for the signature output (hex string vs base64url string). */
export type HmacEncoding = 'hex' | 'base64url'

/**
 * Compute the HMAC-SHA256 signature of a UTF-8 payload string using the
 * provided secret. The output encoding defaults to `hex`.
 *
 * @example
 * // Hex signature (used by the EZStart-Signature protocol)
 * hmacSign('5.{"foo":"bar"}', 'whsec_xxx')
 * // → '8f3c…'  (64 hex chars)
 *
 * @example
 * // base64url signature (used by Stripe Connect signed state)
 * hmacSign(payloadB64, jwtSecret, 'base64url')
 * // → 'jLPVl…'  (no padding)
 */
export function hmacSign(payload: string, secret: string, encoding: HmacEncoding = 'hex'): string {
  const digest = createHmac('sha256', secret).update(payload).digest()
  return encoding === 'base64url' ? base64urlEncode(digest) : digest.toString('hex')
}

/**
 * Constant-time verify of an HMAC-SHA256 signature.
 *
 * Re-computes the expected signature from `payload` + `secret` (using the
 * provided `encoding`) and compares it against `signature` via
 * `crypto.timingSafeEqual`. Returns `false` on length mismatch or when
 * either buffer cannot be constructed — never throws.
 *
 * Plain `===` comparison on signature strings is **forbidden**: it returns
 * early on the first byte difference and leaks timing information that an
 * attacker can use to forge signatures byte-by-byte
 * (cf. `.claude/rules/standard-saas-security.md` §6).
 *
 * @example
 * const sig = hmacSign(payload, secret)
 * hmacVerify(payload, sig, secret) // → true
 * hmacVerify(payload, 'tampered', secret) // → false
 */
export function hmacVerify(
  payload: string,
  signature: string,
  secret: string,
  encoding: HmacEncoding = 'hex'
): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false
  const expected = hmacSign(payload, secret, encoding)
  // timingSafeEqual requires equal-length buffers — a length mismatch is the
  // fast-path "definitely not the same" result; we still allocate the buffers
  // first so the timing of the negative path matches the positive path as
  // closely as possible.
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
  } catch {
    return false
  }
}

// ============================================================================
//  EZStart-Signature protocol — S2S webhook authentication
// ============================================================================

/**
 * Default replay window for `verifyEzstartSignature`. Matches Stripe's
 * webhook tolerance — 5 minutes in the past from `now`.
 *
 * The window is **directional** (past-only with small forward skew):
 * a signature is accepted when `now - signedAt` is within
 * `[−EZSTART_SIGNATURE_FORWARD_SKEW_SECONDS, +EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS]`.
 * This prevents a captured signature from gaining `2× window` of lifespan
 * via clock-skew abuse (hacker A1b.5 — E3).
 */
export const EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS = 5 * 60

/**
 * Maximum forward clock-skew tolerated by `verifyEzstartSignature`. Allows
 * a few seconds of legitimate sender-vs-receiver clock drift, but rejects
 * intentionally-future timestamps (which extend a captured signature's
 * effective replay window).
 *
 * Stripe's reference implementation tolerates "a few seconds" — we pick
 * 5 seconds, well below NTP-typical skew on managed cloud platforms
 * (Railway / Vercel sync to NTP < 1s).
 */
export const EZSTART_SIGNATURE_FORWARD_SKEW_SECONDS = 5

/** Parsed components of a well-formed `X-EZStart-Signature` header value. */
export interface EzstartSignatureHeader {
  /** Unix-seconds timestamp at which the payload was signed (string form). */
  timestamp: string
  /** Hex-encoded HMAC-SHA256 of `"{timestamp}.{body}"`. */
  signature: string
}

/**
 * Build the value of the `X-EZStart-Signature` header.
 *
 * Format: `t=<unix-seconds>,v1=<hex-hmac-sha256>`. The signed payload is
 * `"{timestamp}.{body}"` — the receiver MUST sign the **exact** raw body
 * bytes the sender sent (no re-serialization). This is why senders typically
 * include their own `timestamp` field in the JSON body so both endpoints
 * agree on the value to sign.
 *
 * @example
 * const ts = Math.floor(Date.now() / 1000).toString()
 * const body = JSON.stringify({ ...payload, timestamp: ts })
 * const headerValue = buildEzstartSignatureHeader({ secret, timestamp: ts, body })
 * // → 't=1714518000,v1=8f3c…'
 *
 * res.setHeader('X-EZStart-Signature', headerValue)
 */
export function buildEzstartSignatureHeader(opts: {
  /** Per-Application webhook secret (`whsec_*`-style). */
  secret: string
  /**
   * Unix-seconds timestamp as a string. Defaults to the current time if
   * omitted. Pass an explicit value when you need the same timestamp inside
   * the signed body (mirrors the `body.timestamp` field receivers cross-check).
   */
  timestamp?: string
  /** Raw request body — must match exactly what is sent over the wire. */
  body: string
}): string {
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000).toString()
  const signedPayload = `${timestamp}.${opts.body}`
  const signature = hmacSign(signedPayload, opts.secret, 'hex')
  return `t=${timestamp},v1=${signature}`
}

/**
 * Parse `X-EZStart-Signature: t=<unix>,v1=<hex>` into its components.
 *
 * Returns `null` when the header is missing, when `t=` or `v1=` is absent,
 * or when either value is empty. Extra `k=v` pairs are tolerated and
 * ignored (forward-compat with future signature schemes like `v2=`).
 *
 * @example
 * parseEzstartSignatureHeader('t=1714518000,v1=8f3c')
 * // → { timestamp: '1714518000', signature: '8f3c' }
 *
 * parseEzstartSignatureHeader(undefined)        // → null
 * parseEzstartSignatureHeader('t=,v1=8f3c')     // → null
 * parseEzstartSignatureHeader('garbage')        // → null
 */
export function parseEzstartSignatureHeader(
  header: string | undefined
): EzstartSignatureHeader | null {
  if (!header || typeof header !== 'string') return null
  const parts = header.split(',').map(s => s.trim())
  let timestamp: string | null = null
  let signature: string | null = null
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq)
    const value = part.slice(eq + 1)
    if (key === 't') timestamp = value
    else if (key === 'v1') signature = value
  }
  if (!timestamp || !signature) return null
  return { timestamp, signature }
}

/** Discriminated result of `verifyEzstartSignature`. */
export type EzstartSignatureVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'malformed' | 'signature' | 'replay' }

/**
 * Verify an inbound EZStart-Signature header against the raw request body.
 *
 * Three failure modes, distinguished so receivers can log meaningfully but
 * still answer with a single opaque 401 to the network (avoid leaking which
 * check failed to an attacker):
 *
 *   - `'malformed'` — header missing, ill-formed, or timestamp not numeric
 *   - `'signature'` — well-formed but HMAC mismatch
 *   - `'replay'` — well-formed and HMAC ok, but timestamp outside the
 *     `replayWindowSec` window (default 5 min, mirrors Stripe)
 *
 * The function NEVER throws.
 *
 * @example
 * const result = verifyEzstartSignature({
 *   header: req.headers['x-ezstart-signature'],
 *   secret: application.webhookSecret,
 *   rawBody: JSON.stringify(req.body),
 * })
 * if (!result.ok) {
 *   logger.warn('webhook rejected', { reason: result.reason })
 *   return sendError(res, 'Invalid signature', 401, { code: 'INVALID_SIGNATURE' })
 * }
 */
export function verifyEzstartSignature(opts: {
  /** Raw value of the `X-EZStart-Signature` request header. */
  header: string | undefined
  /** Per-Application webhook secret. */
  secret: string
  /** Raw request body the sender signed (string-equal to the bytes received). */
  rawBody: string
  /** Replay tolerance in seconds (past direction). Defaults to 5 minutes. */
  replayWindowSec?: number
  /**
   * Forward clock-skew tolerance in seconds. Defaults to 5 seconds — enough
   * to absorb legitimate NTP drift between sender / receiver but small enough
   * that a captured signature cannot be replayed for an additional `2× window`
   * by setting a future timestamp (hacker A1b.5 — E3).
   */
  forwardSkewSec?: number
  /** Override the clock — used by tests. Returns unix-seconds. */
  now?: () => number
}): EzstartSignatureVerifyResult {
  const parsed = parseEzstartSignatureHeader(opts.header)
  if (!parsed) return { ok: false, reason: 'malformed' }

  const signedAtSec = Number(parsed.timestamp)
  if (!Number.isFinite(signedAtSec)) return { ok: false, reason: 'malformed' }

  const signedPayload = `${parsed.timestamp}.${opts.rawBody}`
  if (!hmacVerify(signedPayload, parsed.signature, opts.secret, 'hex')) {
    return { ok: false, reason: 'signature' }
  }

  // Directional replay window (hacker A1b.5 — E3):
  //   • Accept up to `replayWindowSec` IN THE PAST (default 5 min).
  //   • Accept up to `forwardSkewSec` IN THE FUTURE (default 5s NTP drift).
  // Rejects intentionally-future timestamps that would otherwise extend a
  // captured signature's effective replay window by `2× replayWindowSec`.
  const replayWindow = opts.replayWindowSec ?? EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS
  const forwardSkew = opts.forwardSkewSec ?? EZSTART_SIGNATURE_FORWARD_SKEW_SECONDS
  const nowSec = opts.now ? opts.now() : Math.floor(Date.now() / 1000)
  const ageSec = nowSec - signedAtSec
  if (ageSec < -forwardSkew) return { ok: false, reason: 'replay' } // too far in the future
  if (ageSec > replayWindow) return { ok: false, reason: 'replay' } // too old

  return { ok: true }
}
