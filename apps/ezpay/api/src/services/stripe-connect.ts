/**
 * Stripe Connect service — exposes the raw Stripe SDK for Connect-specific
 * operations that are not covered by the provider abstraction in pay-sdk.
 *
 * ## Test/live partition (Wave E MED-2)
 *
 * Like {@link import('./stripe.js')}, the raw SDK instance is selected by the
 * caller's derived mode (`req.derivedMode`), NOT by the process env prefix.
 * A `test` request builds the client from `STRIPE_TEST_SECRET_KEY`; a `live`
 * request from `STRIPE_SECRET_KEY`.
 *
 * **Fail-safe**: requesting `mode='test'` without `STRIPE_TEST_SECRET_KEY`
 * THROWS — it NEVER falls back to the live key (and vice-versa). A test
 * Connect operation must never touch the live Stripe account.
 */
import type { Request } from 'express'
import Stripe from 'stripe'
import type { StripeMode } from './stripe.js'
import { StripeModeUnavailableError, resolveRequestMode } from './stripe.js'

const instances: Partial<Record<StripeMode, Stripe>> = {}

/** Env var holding the secret key for each mode. */
const MODE_SECRET_ENV: Record<StripeMode, string> = {
  live: 'STRIPE_SECRET_KEY',
  test: 'STRIPE_TEST_SECRET_KEY',
}

/**
 * Returns the Stripe SDK instance for an explicit mode.
 *
 * Throws {@link StripeModeUnavailableError} (HTTP 503) when the mode's secret
 * key is not configured — fail-closed, never substitutes the other mode's key.
 *
 * @example
 * const stripe = getStripeInstanceForMode(resolveRequestMode(req))
 * await stripe.accounts.create(params)
 */
export function getStripeInstanceForMode(mode: StripeMode): Stripe {
  const cached = instances[mode]
  if (cached) return cached

  const envVar = MODE_SECRET_ENV[mode]
  const key = process.env[envVar]
  if (!key) {
    throw new StripeModeUnavailableError(mode, envVar)
  }

  const instance = new Stripe(key)
  instances[mode] = instance
  return instance
}

/**
 * Returns the Stripe SDK instance for the request's derived mode
 * (`req.derivedMode`). Defaults to `'live'` for requests with no API key.
 */
export function getStripeInstanceForRequest(req: Pick<Request, 'derivedMode'>): Stripe {
  return getStripeInstanceForMode(resolveRequestMode(req))
}

/**
 * Reset the memoised per-mode Stripe instances. Test-only helper so a suite
 * can re-evaluate the env after mutating `process.env`.
 *
 * @internal
 */
export function __resetStripeInstances(): void {
  delete instances.test
  delete instances.live
}
