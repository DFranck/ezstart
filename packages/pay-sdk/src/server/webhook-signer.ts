/**
 * Generic HMAC webhook signer for cross-service S2S notifications.
 *
 * Wraps `buildEzstartSignatureHeader` from `@ezstart/api-core` to provide an
 * ergonomic API that returns a ready-to-spread headers object. Used by
 * payment-service consumers (ezpay today) to authenticate outbound webhooks
 * to subscriber endpoints (ezauth subscription grants today, future external
 * receivers tomorrow).
 *
 * Protocol: `X-EZStart-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>` over
 * the signed payload `"{timestamp}.{body}"`. See
 * `packages/api-core/src/core/crypto.ts` for the canonical reference.
 *
 * Receivers verify with `verifyEzstartSignature` from `@ezstart/api-core`.
 *
 * @module @ezstart/pay-sdk/server/webhook-signer
 */
import './_internal/server-only.js'
import { buildEzstartSignatureHeader } from '@ezstart/api-core'

/** Options for `signWebhook`. */
export interface SignWebhookOptions {
  /**
   * Per-recipient webhook secret (e.g. `Application.webhookSecret`,
   * `whsec_*`-style). NEVER reuse a single secret across recipients — that
   * defeats the per-Application authentication model.
   */
  secret: string
  /**
   * JSON-stringified payload to send. The receiver will sign the **exact**
   * bytes received, so this string MUST match the request body byte-for-byte.
   * Senders typically include their own `timestamp` field inside the body so
   * both endpoints agree on the value to sign.
   */
  body: string
  /**
   * Unix-seconds timestamp as a string. Defaults to the current time when
   * omitted. Pass an explicit value when you need the same timestamp inside
   * the signed body (mirrors the `body.timestamp` field receivers cross-check).
   */
  timestamp?: string
}

/**
 * Sign a webhook payload and return the headers to attach to the request.
 *
 * Returns a single-key object `{ 'X-EZStart-Signature': 't=<unix>,v1=<hex>' }`
 * so callers can spread it into a `fetch` `headers` map without restating
 * the header name.
 *
 * @example
 * const ts = Math.floor(Date.now() / 1000).toString()
 * const body = JSON.stringify({ ...payload, timestamp: ts })
 * const sigHeader = signWebhook({ secret: app.webhookSecret, body, timestamp: ts })
 *
 * await fetch(url, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-API-Key': apiKey,
 *     ...sigHeader,
 *   },
 *   body,
 * })
 */
export function signWebhook(opts: SignWebhookOptions): { 'X-EZStart-Signature': string } {
  if (!opts.secret) {
    throw new Error('signWebhook: secret is required')
  }
  if (typeof opts.body !== 'string') {
    throw new Error('signWebhook: body must be a string (already JSON-stringified)')
  }
  const headerValue = buildEzstartSignatureHeader({
    secret: opts.secret,
    body: opts.body,
    timestamp: opts.timestamp,
  })
  return { 'X-EZStart-Signature': headerValue }
}
