/**
 * EZPay -> EZAuth subscription webhook client (S2S, fire-and-forget).
 *
 * Triggered by the Stripe webhook handler after a subscription-related event
 * (`checkout.session.completed` in `subscription` mode, `customer.subscription.updated`,
 * `customer.subscription.deleted`). Notifies EZAuth so it can grant/revoke the
 * subscribed user's roles and features on the target Application.
 *
 * Design (V2 — per-Application secret, 2026-05-01):
 * - Authenticated via superadmin S2S API key (`EZPAY_SERVER_EZAUTH_KEY`).
 * - Authenticity is further proven via HMAC-SHA256 signature over
 *   `"{timestamp}.{body}"` using the **per-Application** `webhookSecret`
 *   loaded from ezauth via `getApplication(id, { includeWebhookSecret: true })`.
 *   Replaces the legacy `EZAUTH_WEBHOOK_SECRET` shared env var (MVP shortcut
 *   that did not scale to multiple consumers).
 * - Header format: `X-EZStart-Signature: t=<unix>,v1=<hex>`.
 * - Destination URL: `Application.webhookEndpointUrl` when set, else the
 *   canonical `${getApiUrl('ezauth')}/api/subscriptions/webhook` default.
 *   This lets future external consumers route ezpay events to their own
 *   receivers without code changes here.
 * - Timeout 5s per request; no retry here — the Stripe webhook is the source
 *   of truth and EZAuth deduplicates by `stripeEventId` so Stripe's native
 *   retries are the safety net.
 * - Never throws — payment processing is the source of truth, grants are a
 *   side-effect. A fire-and-forget `try/catch` keeps the Stripe webhook 2xx.
 *
 * @module apps/ezpay/api/src/services/ezauth-subscription-webhook
 */
import { buildEzstartSignatureHeader } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { signWebhook } from '@ezstart/pay-sdk/server'
import { getApiUrl } from '@ezstart/config'
import { getApplication } from './ezauth-client.js'

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
 * @internal Exposed for tests. Thin positional-args wrapper around
 * `buildEzstartSignatureHeader` from `@ezstart/api-core`. Kept so the
 * existing ezpay test suite (which calls `buildSignatureHeader(secret, ts,
 * body)`) does not need to change. New callsites should use the api-core
 * primitive directly.
 *
 * @deprecated Use `buildEzstartSignatureHeader` from `@ezstart/api-core` —
 * this re-export only exists to preserve the ezpay test API.
 */
export function buildSignatureHeader(secret: string, timestamp: string, body: string): string {
  return buildEzstartSignatureHeader({ secret, timestamp, body })
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
 * throws. If required env vars are missing OR the target Application cannot
 * be loaded with its webhook secret, logs a warning and returns.
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
  const apiKey = process.env.EZPAY_SERVER_EZAUTH_KEY

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

  // Load the target Application + its per-Application webhook secret in a
  // single S2S call. Returns `null` on 404 / circuit-open / network error;
  // we treat those identically — log and bail. The Stripe webhook stays
  // 2xx because grants are a side-effect, not the source of truth.
  const application = await getApplication(payload.applicationId, {
    includeWebhookSecret: true,
  })
  if (!application) {
    logger.warn(
      '[ezauth-webhook] could not load Application — skipping cross-service grant. ' +
        'The receiving Application may have been archived or the S2S key may lack admin scope.',
      {
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
        applicationId: payload.applicationId,
        userId: payload.userId,
      }
    )
    return
  }
  if (!application.webhookSecret) {
    logger.warn(
      '[ezauth-webhook] Application loaded but webhookSecret is absent — ' +
        'run `pnpm --filter api-ezauth seed:webhook-secrets` to backfill.',
      {
        subscriptionId: payload.subscriptionId,
        stripeEventId: payload.stripeEventId,
        applicationId: payload.applicationId,
        slug: application.slug,
      }
    )
    return
  }
  const secret = application.webhookSecret

  // Destination URL — explicit Application override wins, otherwise fall
  // back to the canonical ezauth subscriptions endpoint. The override is
  // reserved for future external consumers that host their own receivers.
  const url = application.webhookEndpointUrl ?? `${getApiUrl('ezauth')}/api/subscriptions/webhook`

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({ ...payload, timestamp })
  // Use the pay-sdk wrapper so any future cross-service payment webhook
  // shares the same signing primitive (returns a ready-to-spread headers
  // object). Underlying impl still routes through @ezstart/api-core.
  const signatureHeaders = signWebhook({ secret, body, timestamp })

  logger.info('[ezauth-webhook] notify sending', {
    url,
    subscriptionId: payload.subscriptionId,
    stripeEventId: payload.stripeEventId,
    applicationId: payload.applicationId,
    slug: application.slug,
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
        ...signatureHeaders,
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
