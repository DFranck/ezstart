/**
 * EZPay Stripe registry — wires per-mode `PaymentProviderRegistry` instances
 * for this API process from environment variables.
 *
 * ## Why per-mode (the test/live partition — `standard-saas-data.md` §4)
 *
 * A single Stripe client built from `STRIPE_SECRET_KEY` is a critical bug on a
 * `sk_live_*` process: a request authenticated with a TEST publishable key
 * (`ez_pk_test_*`) would still route its charge through the LIVE Stripe
 * account — a test key triggering real money movement (Wave E MED-2). The mode
 * MUST be carried by the API key of the caller (`req.derivedMode`), never by
 * the process env prefix.
 *
 * This module therefore builds two independent providers:
 *
 *   - **live**  ← `STRIPE_SECRET_KEY`        + `STRIPE_WEBHOOK_SECRET`
 *   - **test**  ← `STRIPE_TEST_SECRET_KEY`   + `STRIPE_TEST_WEBHOOK_SECRET`
 *
 * Callers select the provider for the request's derived mode via
 * {@link getProviderForMode} / {@link getProviderForRequest}.
 *
 * ## Fail-safe (the core of the MED-2 fix)
 *
 * If a request resolves to `mode='test'` but no `STRIPE_TEST_SECRET_KEY` is
 * configured, {@link getProviderForMode} THROWS — it NEVER falls back to the
 * live client. The whole point of the partition is that a test key can never
 * touch the live Stripe account, so a missing test key is a fail-closed error
 * (the route surfaces a 503), not a silent downgrade to live.
 *
 * The Stripe SDK construction + env-safety guards live in
 * `@ezstart/pay-sdk/server` (`createStripeClient`); this file is the
 * ezpay-specific glue.
 *
 * @module apps/ezpay/api/src/services/stripe
 */
import type { Request } from 'express'
import { logger } from '@ezstart/logger/server'
import { createStripeClient } from '@ezstart/pay-sdk/server'
import {
  PaymentProviderRegistry,
  StripeProvider,
  ConsoleProvider,
} from '@ezstart/pay-sdk/providers'
import type { IPaymentProvider, StripeInstance, WebhookEvent } from '@ezstart/pay-sdk/providers'

/** Stripe-pattern test/live partition mode, carried by the caller's API key. */
export type StripeMode = 'test' | 'live'

// ========================================
// Per-mode provider registries (lazy singletons)
// ========================================

const registries: Partial<Record<StripeMode, PaymentProviderRegistry>> = {}

/** Env var names per mode — single source of truth for the selection logic. */
const MODE_ENV: Record<StripeMode, { secretKey: string; webhookSecret: string }> = {
  live: { secretKey: 'STRIPE_SECRET_KEY', webhookSecret: 'STRIPE_WEBHOOK_SECRET' },
  test: { secretKey: 'STRIPE_TEST_SECRET_KEY', webhookSecret: 'STRIPE_TEST_WEBHOOK_SECRET' },
}

/**
 * Build the provider registry for a given mode. Returns `null` when the
 * mode's secret key is absent — the caller decides whether that is a
 * fail-closed error (live operations) or an allowed console fallback (only
 * for the explicit operator-opted console mode, never for a test→live slide).
 *
 * @internal
 */
function buildRegistryForMode(mode: StripeMode): PaymentProviderRegistry | null {
  const { secretKey: secretKeyVar, webhookSecret: webhookSecretVar } = MODE_ENV[mode]
  const secretKey = process.env[secretKeyVar]

  // Operator can force console mode globally (no real Stripe). This is the
  // ONLY non-Stripe fallback and it is symmetric for both modes — it never
  // routes a test request to the live account.
  if (process.env.PAYMENT_PROVIDER === 'console') {
    const registry = new PaymentProviderRegistry()
    registry.register(new ConsoleProvider())
    return registry
  }

  if (!secretKey) {
    return null
  }

  // Safety guards (live-key-in-dev throw, test-key-in-prod warn) are enforced
  // inside `createStripeClient` — see @ezstart/pay-sdk/server.
  const stripe = createStripeClient({ secretKey, logger })

  const registry = new PaymentProviderRegistry()
  registry.register(
    new StripeProvider({
      stripe: stripe as unknown as StripeInstance,
      webhookSecret: process.env[webhookSecretVar],
    })
  )
  return registry
}

/**
 * Resolve (and memoise) the registry for a mode. Throws when the mode's secret
 * key is missing — the fail-closed guarantee that a test request can NEVER
 * fall back to the live Stripe account (and vice-versa).
 *
 * @internal
 */
function getRegistryForMode(mode: StripeMode): PaymentProviderRegistry {
  const cached = registries[mode]
  if (cached) return cached

  const built = buildRegistryForMode(mode)
  if (!built) {
    const { secretKey: secretKeyVar } = MODE_ENV[mode]
    // Fail-closed: never substitute the other mode's client. A missing test
    // key on a live process must NOT silently charge the live account.
    throw new StripeModeUnavailableError(mode, secretKeyVar)
  }

  registries[mode] = built
  return built
}

/**
 * Error thrown when a request resolves to a Stripe mode whose secret key is
 * not configured. Carries an HTTP `statusCode` (503) so route error handlers
 * can surface a clear "payments unavailable in <mode> mode" response without
 * leaking which key is missing to the client.
 */
export class StripeModeUnavailableError extends Error {
  readonly statusCode = 503
  readonly mode: StripeMode

  constructor(mode: StripeMode, envVar: string) {
    super(
      `Stripe ${mode}-mode is not configured (${envVar} is missing). ` +
        `Refusing to fall back to the other mode — a ${mode} key must never ` +
        `route through the ${mode === 'test' ? 'live' : 'test'} Stripe account.`
    )
    this.name = 'StripeModeUnavailableError'
    this.mode = mode
  }
}

/** Type guard for {@link StripeModeUnavailableError} without `instanceof` pitfalls. */
export function isStripeModeUnavailableError(err: unknown): err is StripeModeUnavailableError {
  return err instanceof StripeModeUnavailableError
}

// ========================================
// Public API
// ========================================

/**
 * The active payment provider for an explicit mode.
 *
 * Throws {@link StripeModeUnavailableError} (HTTP 503) when the mode's secret
 * key is absent — NEVER falls back to the other mode's client.
 *
 * @example
 * const provider = getProviderForMode(req.derivedMode ?? 'live')
 * await provider.createCheckoutSession(opts)
 */
export function getProviderForMode(mode: StripeMode): IPaymentProvider {
  return getRegistryForMode(mode).getDefault()
}

/**
 * Resolve the test/live mode for an Express request from `req.derivedMode`
 * (set by api-core `attachDerivedMode` from the API key prefix). Defaults to
 * `'live'` for requests with no API key (cookie-auth dashboard), matching the
 * api-core default.
 */
export function resolveRequestMode(req: Pick<Request, 'derivedMode'>): StripeMode {
  return req.derivedMode === 'test' ? 'test' : 'live'
}

/**
 * The active payment provider for the request's derived mode. Convenience
 * wrapper around {@link getProviderForMode} + {@link resolveRequestMode}.
 *
 * @example
 * const provider = getProviderForRequest(req)
 * const session = await provider.createCheckoutSession(opts)
 */
export function getProviderForRequest(req: Pick<Request, 'derivedMode'>): IPaymentProvider {
  return getProviderForMode(resolveRequestMode(req))
}

// ========================================
// Webhook verification (mode-aware)
// ========================================

/**
 * Verify an inbound Stripe webhook signature against BOTH the live and test
 * webhook secrets, returning the mapped event from whichever secret matches.
 *
 * ## Why try both
 *
 * Stripe signs TEST-mode events with the test webhook secret
 * (`STRIPE_TEST_WEBHOOK_SECRET`) and LIVE-mode events with the live secret
 * (`STRIPE_WEBHOOK_SECRET`). A single-secret verifier silently drops the other
 * mode's deliveries (or, worse, an operator points both endpoints at one
 * secret). We try the live secret first (the common production case) and fall
 * back to the test secret; the dataset the handler writes is then derived from
 * the verified event's own `livemode` field — never guessed.
 *
 * A mode whose secret/key is not configured is skipped (its `StripeProvider`
 * either can't be built or `verifyWebhookSignature` throws "secret not
 * configured"). When NO configured secret matches, the last error is rethrown
 * so the route returns 400 — an unverifiable payload is never processed.
 *
 * ## Mode is bound to the VERIFYING secret, not the payload (HACK E1.5)
 *
 * The dataset the handler writes MUST be derived from {@link VerifiedWebhook.mode}
 * — the mode of the secret that actually verified the HMAC — NOT from the
 * event's self-declared `livemode` field. `stripe.webhooks.constructEvent`
 * only proves the payload's integrity against a secret; it does NOT prove the
 * `livemode` flag is consistent with that secret's mode. An attacker (or a
 * misconfigured operator) holding the loosely-guarded TEST webhook secret
 * could otherwise sign a payload with `livemode: true` and have it mutate LIVE
 * data. To make that impossible, this function:
 *   1. returns `mode` = the mode whose secret matched, and
 *   2. overrides the mapped `event.livemode` to match that mode, and
 *   3. THROWS if the payload's self-declared `livemode` contradicts the
 *      verifying secret (a forged / cross-wired delivery is rejected, not
 *      silently corrected — surfaces the misconfiguration loudly as a 400).
 *
 * @param payload - The raw request body (Buffer/string) as delivered.
 * @param signature - The `Stripe-Signature` header value.
 * @returns The mapped {@link WebhookEvent} + the verified `mode`.
 * @throws When no configured webhook secret verifies the signature, OR when the
 *   payload's `livemode` contradicts the verifying secret's mode.
 */
export interface VerifiedWebhook {
  /** The mapped event. Its `livemode` is forced to match {@link mode}. */
  event: WebhookEvent
  /** The mode of the secret that verified the signature — the trusted mode. */
  mode: StripeMode
}

export function verifyStripeWebhook(payload: string | Buffer, signature: string): VerifiedWebhook {
  // Live first (common production path), then test.
  const order: StripeMode[] = ['live', 'test']
  let lastError: unknown

  for (const mode of order) {
    let provider: IPaymentProvider
    try {
      provider = getProviderForMode(mode)
    } catch (err) {
      // Mode not configured (no secret key) — skip it, try the other.
      if (isStripeModeUnavailableError(err)) {
        lastError = err
        continue
      }
      throw err
    }

    let event: WebhookEvent
    try {
      event = provider.verifyWebhookSignature(payload, signature)
    } catch (err) {
      // Signature didn't match this mode's secret (or the secret is unset —
      // StripeProvider throws "Webhook secret not configured"). Try the other.
      lastError = err
      continue
    }

    // The signature verified against THIS mode's secret — that is the only
    // trustworthy mode signal. Reject a payload whose self-declared `livemode`
    // contradicts it (forged or cross-wired delivery). Then force the mapped
    // `livemode` to the verified mode so downstream readers can't be misled.
    const expectedLive = mode === 'live'
    if (typeof event.livemode === 'boolean' && event.livemode !== expectedLive) {
      throw new Error(
        `Webhook livemode mismatch: payload claims livemode=${event.livemode} but the ` +
          `signature verified against the ${mode} secret. Refusing to process a ` +
          `cross-mode event (possible forgery or mis-wired webhook endpoint).`
      )
    }
    event.livemode = expectedLive
    return { event, mode }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Webhook signature verification failed for all configured modes')
}

/**
 * Reset the memoised per-mode registries. Test-only helper so a suite can
 * re-evaluate the env after mutating `process.env`.
 *
 * @internal
 */
export function __resetStripeRegistries(): void {
  delete registries.test
  delete registries.live
}
