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
    logger.warn('[ezauth-webhook] EZAUTH_WEBHOOK_SECRET not set, skipping', {
      subscriptionId: payload.subscriptionId,
    })
    return
  }
  if (!apiKey) {
    logger.warn('[ezauth-webhook] EZPAY_SERVER_EZAUTH_KEY not set, skipping', {
      subscriptionId: payload.subscriptionId,
    })
    return
  }

  const ezauthApiUrl = getApiUrl('ezauth')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({ ...payload, timestamp })
  const signatureHeader = buildSignatureHeader(secret, timestamp, body)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(`${ezauthApiUrl}/api/subscriptions/webhook`, {
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

    if (!res.ok) {
      logger.warn('[ezauth-webhook] notify non-2xx', {
        status: res.status,
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
      })
    }
  } catch (err) {
    clearTimeout(timer)
    logger.warn('[ezauth-webhook] notify failed (fire-and-forget)', {
      error: err instanceof Error ? err.message : String(err),
      subscriptionId: payload.subscriptionId,
      stripeEventId: payload.stripeEventId,
    })
  }
}
