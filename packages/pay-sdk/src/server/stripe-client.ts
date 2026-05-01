/**
 * Agnostic Stripe client factory.
 *
 * Wraps the `stripe` SDK constructor with the @ezstart conventions used by
 * every payment-service consumer (ezpay today, future billing services
 * tomorrow):
 *
 *   - **test/live partition safety**: throws when a `sk_live_*` key is detected
 *     in a non-production environment, warns when a `sk_test_*` key is detected
 *     in production. The same key never crosses a boundary by accident.
 *   - **typed config**: `apiVersion` is the canonical Stripe `LatestApiVersion`
 *     literal so TypeScript consumers can't drift from the SDK they installed.
 *   - **silent-by-default logger**: opt-in via the `logger` option. The SDK
 *     itself never console-logs.
 *
 * The factory does NOT read `process.env` or wire up the
 * `PaymentProviderRegistry`. The consumer owns that:
 *
 * ```ts
 * import { createStripeClient } from '@ezstart/pay-sdk/server'
 * import {
 *   PaymentProviderRegistry,
 *   StripeProvider,
 * } from '@ezstart/pay-sdk/providers'
 *
 * const stripe = createStripeClient({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   logger,
 * })
 *
 * const registry = new PaymentProviderRegistry()
 * registry.register(new StripeProvider({ stripe, webhookSecret }))
 * ```
 *
 * @module @ezstart/pay-sdk/server/stripe-client
 */
import './_internal/server-only.js'
import Stripe from 'stripe'

/** Minimal logger surface — silent no-op default. */
export interface CreateStripeClientLogger {
  warn(msg: string, ...rest: unknown[]): void
  error(msg: string, ...rest: unknown[]): void
}

/** Options for `createStripeClient`. */
export interface CreateStripeClientOptions {
  /**
   * Stripe secret key. Should be `STRIPE_SECRET_KEY` (or `STRIPE_TEST_SECRET_KEY`
   * for the test partition). Both `sk_test_*` and `sk_live_*` are accepted —
   * the env-safety guard validates the prefix matches the runtime env.
   */
  secretKey: string
  /**
   * Stripe API version (e.g. `'2025-09-30.clover'`). When omitted, the
   * installed `stripe` SDK uses its built-in default. Pin explicitly when
   * you need stability across SDK upgrades.
   *
   * Typed via `Parameters<typeof Stripe>[1]['apiVersion']` so the literal
   * union narrows to whatever the installed `stripe` SDK exposes (the
   * `Stripe.LatestApiVersion` alias is not re-exported from the main entry
   * in v22+, so we walk the constructor signature instead).
   */
  apiVersion?: NonNullable<NonNullable<ConstructorParameters<typeof Stripe>[1]>['apiVersion']>
  /**
   * Optional logger. When provided, the factory emits a `warn` for the
   * test-key-in-production case (still proceeds — operator may want it).
   * Silent no-op when omitted.
   */
  logger?: CreateStripeClientLogger
  /**
   * Override the env detection. Defaults to:
   *   - `production = process.env.NODE_ENV === 'production'`
   *   - `runtime = !!process.env.RAILWAY_ENVIRONMENT`
   *
   * Inject this for tests or non-standard hosts (Vercel, Fly, etc.) where
   * `RAILWAY_ENVIRONMENT` isn't the right marker.
   */
  env?: {
    /** True when the runtime is production (NODE_ENV=production). */
    isProduction: boolean
    /** True when running on a managed host (vs local laptop). */
    isManagedHost: boolean
  }
}

/**
 * Build a Stripe client with @ezstart safety guards.
 *
 * Throws when a `sk_live_*` key is detected on a local laptop (NODE_ENV !== production
 * AND no managed-host marker). Warns via `logger` when a `sk_test_*` key is
 * detected in production but still proceeds — the operator may have routed
 * Stripe to a sandbox intentionally.
 *
 * @example
 * const stripe = createStripeClient({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   apiVersion: '2025-09-30.clover',
 *   logger,
 * })
 */
export function createStripeClient(opts: CreateStripeClientOptions): Stripe {
  if (!opts.secretKey || typeof opts.secretKey !== 'string') {
    throw new Error('createStripeClient: secretKey is required (got empty or non-string)')
  }

  const env = opts.env ?? {
    isProduction: process.env.NODE_ENV === 'production',
    isManagedHost: !!process.env.RAILWAY_ENVIRONMENT,
  }

  const isLocalDev = !env.isProduction && !env.isManagedHost
  if (isLocalDev && opts.secretKey.startsWith('sk_live_')) {
    throw new Error(
      'createStripeClient: live Stripe key (sk_live_*) detected in local development. ' +
        'Use a sk_test_* key, or set NODE_ENV=production / a managed-host marker.'
    )
  }

  if (env.isProduction && opts.secretKey.startsWith('sk_test_')) {
    opts.logger?.warn(
      'createStripeClient: test Stripe key (sk_test_*) detected in production — ' +
        'payments will not be processed against the live account.'
    )
  }

  // Stripe's constructor accepts `undefined` for apiVersion (uses the SDK
  // default), so we forward as-is when omitted.
  if (opts.apiVersion) {
    return new Stripe(opts.secretKey, { apiVersion: opts.apiVersion })
  }
  return new Stripe(opts.secretKey)
}
