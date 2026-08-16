/**
 * Signed state helpers for the Stripe Connect onboarding callback.
 *
 * Stripe hands the browser back to `GET /api/connect/callback` after the user
 * finishes onboarding. Without a signed state, an attacker can forge requests
 * to that endpoint with arbitrary `account_id` values, burning Stripe quota
 * and leaking `stripeAccountId → applicationId` mappings through the 302
 * `Location` header.
 *
 * The pattern below is the standard OAuth/CSRF signed-state approach:
 *  - `POST /api/connect/onboard` generates a signed payload that carries the
 *    `applicationId` (plus a timestamp and a random nonce) and appends it to
 *    the Stripe `return_url` / `refresh_url`.
 *  - `GET /api/connect/callback` verifies the signature and freshness of the
 *    state, and only then trusts the `applicationId` carried in the payload.
 *
 * Secret: `JWT_SECRET`, resolved via `@ezstart/config`. Reusing this secret
 * is fine — HMAC and JWT signing are independent uses of the same key.
 *
 * @module apps/ezpay/api/src/utils/connect-state
 */
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { base64urlDecode, base64urlEncode, hmacSign } from '@ezstart/api-core'
import { getJwtSecret } from '@ezstart/config'

/**
 * Default max age of a signed state, in milliseconds. One hour matches the
 * Stripe AccountLink expiry so the browser and the server agree on freshness.
 */
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000

/** Decoded, verified state payload. */
export interface ConnectStatePayload {
  applicationId: string
  timestamp: number
  nonce: string
}

/** Generic error thrown on any verification failure (signature, freshness,
 * shape). Intentionally opaque: callers should treat every failure the same
 * and answer with a generic 400 to avoid leaking which check failed. */
export class ConnectStateError extends Error {
  constructor(message = 'Invalid state') {
    super(message)
    this.name = 'ConnectStateError'
  }
}

// base64url + HMAC primitives are imported from `@ezstart/api-core` to keep a
// single source of truth across the platform. The local `sign()` wrapper is
// kept (one-line) so the verify path stays a literal mirror of the generate
// path, which makes the timing-safe compare below trivially auditable.

/** Compute the HMAC-SHA256 signature of a payload string, base64url-encoded. */
function sign(payload: string, secret: string): string {
  return hmacSign(payload, secret, 'base64url')
}

/**
 * Generate a signed state string carrying `applicationId`.
 *
 * The returned value has the shape `${payloadBase64}.${signatureBase64}` —
 * both segments are base64url-encoded (no padding). Include it as-is in a URL
 * query param; no extra `encodeURIComponent` is needed.
 *
 * @example
 * const state = generateConnectState({ applicationId: 'app-123' })
 * const returnUrl = `${base}/api/connect/callback?account_id=${id}&state=${state}`
 */
export function generateConnectState(opts: { applicationId: string }): string {
  const { applicationId } = opts
  if (!applicationId) {
    throw new ConnectStateError('applicationId is required to generate state')
  }
  const secret = getJwtSecret()
  const nonce = randomBytes(16).toString('hex')
  const timestamp = Date.now()
  const body: ConnectStatePayload = { applicationId, timestamp, nonce }
  const payloadJson = JSON.stringify(body)
  const payloadB64 = base64urlEncode(Buffer.from(payloadJson, 'utf8'))
  const signature = sign(payloadB64, secret)
  return `${payloadB64}.${signature}`
}

/**
 * Verify a signed state string and return the decoded payload.
 *
 * @throws ConnectStateError on any failure — missing/malformed state,
 *   bad signature, or stale timestamp. The message is always generic to avoid
 *   giving attackers a signal about which check failed.
 *
 * @example
 * try {
 *   const { applicationId } = verifyConnectState(state)
 *   // trust applicationId
 * } catch {
 *   return sendError(res, 'Invalid state', 400)
 * }
 */
export function verifyConnectState(
  state: string,
  opts: { maxAgeMs?: number } = {}
): ConnectStatePayload {
  if (typeof state !== 'string' || state.length === 0) {
    throw new ConnectStateError()
  }
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  const secret = getJwtSecret()

  const dotIdx = state.indexOf('.')
  if (dotIdx <= 0 || dotIdx === state.length - 1) {
    throw new ConnectStateError()
  }
  const payloadB64 = state.slice(0, dotIdx)
  const providedSig = state.slice(dotIdx + 1)

  // Re-compute the expected signature and compare with timingSafeEqual to
  // prevent timing-oracle attacks. timingSafeEqual requires equal-length
  // buffers, so a length mismatch is treated as an invalid state.
  const expectedSig = sign(payloadB64, secret)
  const providedBuf = Buffer.from(providedSig, 'utf8')
  const expectedBuf = Buffer.from(expectedSig, 'utf8')
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    throw new ConnectStateError()
  }

  // Signature OK — now we can safely decode the payload.
  let parsed: unknown
  try {
    const json = base64urlDecode(payloadB64).toString('utf8')
    parsed = JSON.parse(json)
  } catch {
    throw new ConnectStateError()
  }

  if (!isConnectStatePayload(parsed)) {
    throw new ConnectStateError()
  }

  const age = Date.now() - parsed.timestamp
  if (age < 0 || age > maxAgeMs) {
    throw new ConnectStateError()
  }

  return parsed
}

/** Narrow an unknown parsed JSON value into a valid payload shape. */
function isConnectStatePayload(value: unknown): value is ConnectStatePayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.applicationId === 'string' &&
    v.applicationId.length > 0 &&
    typeof v.timestamp === 'number' &&
    Number.isFinite(v.timestamp) &&
    typeof v.nonce === 'string' &&
    v.nonce.length > 0
  )
}
