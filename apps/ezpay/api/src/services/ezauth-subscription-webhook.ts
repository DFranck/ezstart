/**
 * EZPay -> EZAuth subscription webhook client (S2S, fire-and-forget).
 *
 * Triggered by the Stripe webhook handler after a subscription-related event
 * (`checkout.session.completed` in `subscription` mode, `customer.subscription.updated`,
 * `customer.subscription.deleted`). Notifies EZAuth so it can grant/revoke the
 * subscribed user's roles and features on the target Application.
 *
 * Design:
 * - Authenticated via superadmin S2S API key (`EZPAY_SERVER_EZAUTH_KEY`).
 * - Authenticity is further proven via HMAC-SHA256 signature over
 *   `"{timestamp}.{body}"` using a shared secret (`EZAUTH_WEBHOOK_SECRET`).
 * - Header format: `X-EZStart-Signature: t=<unix>,v1=<hex>`.
 * - Timeout 5s per request; no retry here — the Stripe webhook is the source
 *   of truth and EZAuth deduplicates by `stripeEventId` so Stripe's native
 *   retries are the safety net.
 * - Never throws — payment processing is the source of truth, grants are a
 *   side-effect. A fire-and-forget `try/catch` keeps the Stripe webhook 2xx.
 *
 * @module apps/ezpay/api/src/services/ezauth-subscription-webhook
 */
import { createHmac } from 'crypto'
import { logger } from '@ezstart/logger/server'
import { getApiUrl } from '@ezstart/config'

/**
 * Payload sent to `POST {ezauth}/api/subscriptions/webhook`.
 *
 * `stripeEventId` is the Stripe `evt_*` id of the originating event and is
 * the idempotency key — replaying the same event does NOT re-grant.
 */
export interface SubscriptionWebhookPayload {
  /** ezauth Application id the subscription grants against. */
  applicationId: string
  /** ezauth user id of the paying customer. */
  userId: string
  /** Stripe subscription id (`sub_*`). */
  subscriptionId: string
  /** ezpay Plan id (MongoDB `_id` as string). */
  planId: string
  /** Stripe event id (`evt_*`) — idempotency key. */
  stripeEventId: string
  /**
   * Subscription lifecycle status — drives whether EZAuth grants or revokes.
   * `canceled` removes the grants; everything else applies them.
   */
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  /** Roles to grant/revoke on `appRoles[<slug>]`. */
  grantsRoles?: string[]
  /** Features to grant/revoke on `features`. */
  grantsFeatures?: string[]
  /** Current period end — unix timestamp in seconds. */
  currentPeriodEnd?: number
}

/** Millisecond timeout for the S2S fetch. */
const DEFAULT_TIMEOUT_MS = 5_000

/**
 * @internal Exposed for tests. Builds the HMAC-SHA256 signature header value
 * in Stripe-like format (`t=<unix>,v1=<hex>`).
 */
export function buildSignatureHeader(secret: string, timestamp: string, body: string): string {
  const signedPayload = `${timestamp}.${body}`
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/**
 * Redact a secret/API key for safe logging — keeps the prefix + last 4 chars
 * so the operator can tell which value is in use without leaking it.
 */
function redactSecret(value: string | undefined): string {
  if (!value) return '<unset>'
  if (value.length <= 10) return '<redacted>'
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

/**
 * Notify EZAuth of a subscription lifecycle event. Fire-and-forget — NEVER
 * throws. If required env vars are missing, logs a warning and returns.
 *
 * @example
 * await notifyEzauthSubscription({
 *   applicationId: 'app-1',
 *   userId: 'user-1',
 *   subscriptionId: 'sub_123',
 *   planId: 'plan-1',
 *   stripeEventId: 'evt_123',
 *   status: 'active',
 *   grantsRoles: ['pro'],
 * })
 */
export async function notifyEzauthSubscription(payload: SubscriptionWebhookPayload): Promise<void> {
  const secret = process.env.EZAUTH_WEBHOOK_SECRET
  const apiKey = process.env.EZPAY_SERVER_EZAUTH_KEY

  if (!secret) {
    logger.warn(
      '[ezauth-webhook] EZAUTH_WEBHOOK_SECRET not set — skipping cross-service grant. ' +
        'Add EZAUTH_WEBHOOK_SECRET to apps/ezpay/api/.env.local (and match it in ' +
        'apps/ezauth/api/.env.local) to enable subscription role grants.',
      {
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
        applicationId: payload.applicationId,
        userId: payload.userId,
      }
    )
    return
  }
  if (!apiKey) {
    logger.warn(
      '[ezauth-webhook] EZPAY_SERVER_EZAUTH_KEY not set — skipping cross-service grant. ' +
        'Generate a superadmin ez_sk_live_* key via the EZAuth dashboard and set ' +
        'EZPAY_SERVER_EZAUTH_KEY in apps/ezpay/api/.env.local to enable subscription ' +
        'role grants.',
      {
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
        applicationId: payload.applicationId,
        userId: payload.userId,
      }
    )
    return
  }

  const ezauthApiUrl = getApiUrl('ezauth')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({ ...payload, timestamp })
  const signatureHeader = buildSignatureHeader(secret, timestamp, body)
  const url = `${ezauthApiUrl}/api/subscriptions/webhook`

  logger.info('[ezauth-webhook] notify sending', {
    url,
    subscriptionId: payload.subscriptionId,
    stripeEventId: payload.stripeEventId,
    applicationId: payload.applicationId,
    userId: payload.userId,
    status: payload.status,
    grantsRoles: payload.grantsRoles,
    grantsFeatures: payload.grantsFeatures,
    apiKeyPrefix: redactSecret(apiKey),
    secretPrefix: redactSecret(secret),
    signatureTimestamp: timestamp,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-EZStart-Signature': signatureHeader,
      },
      body,
      signal: controller.signal,
    })
    clearTimeout(timer)

    // Always read the response body (small JSON payload) so we can surface
    // the error/message in logs when the receiver rejects the request.
    let responseText = ''
    try {
      responseText = await res.text()
    } catch {
      responseText = '<unreadable>'
    }

    if (!res.ok) {
      logger.warn('[ezauth-webhook] notify non-2xx', {
        url,
        status: res.status,
        response: responseText,
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
        applicationId: payload.applicationId,
        userId: payload.userId,
        apiKeyPrefix: redactSecret(apiKey),
        secretPrefix: redactSecret(secret),
      })
      return
    }

    logger.info('[ezauth-webhook] notify succeeded', {
      url,
      status: res.status,
      response: responseText,
      subscriptionId: payload.subscriptionId,
      stripeEventId: payload.stripeEventId,
    })
  } catch (err) {
    clearTimeout(timer)
    logger.warn('[ezauth-webhook] notify failed (fire-and-forget)', {
      url,
      error: err instanceof Error ? err.message : String(err),
      subscriptionId: payload.subscriptionId,
      stripeEventId: payload.stripeEventId,
      applicationId: payload.applicationId,
      userId: payload.userId,
    })
  }
}
