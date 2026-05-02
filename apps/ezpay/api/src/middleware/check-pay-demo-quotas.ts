/**
 * Pay demo quotas middleware — enforces hard caps on the `_pay-docs-demo`
 * sandbox Application (PAY_DOCS_DEMO_SANDBOX-001 = #178, mirror of #163's
 * ezauth-side `check-demo-quotas`).
 *
 * Visitors of /docs/pay can play with REAL components but the sandbox MUST
 * not be abusable as a free Stripe gateway. Three caps are enforced:
 *
 *  1. **`maxActiveSubscriptions`** (hardcoded 50) — total `subscription`
 *     payments with status `'completed'` (`'active'` semantics) targeting
 *     the sandbox Application. Once reached, `POST /api/subscribe` returns
 *     429 with a clear "Demo capacity reached" message. Reset every 24h
 *     by the cron.
 *
 *  2. **`maxPaymentsPerDay`** (hardcoded 200) — count of `Payment` docs
 *     with `projectId: '_pay-docs-demo'` AND `type !== 'donation'` over
 *     the last 24h. Once reached, payment-creating routes return 429.
 *
 *  3. **`maxDonationsPerDay`** (hardcoded 100) — count of `Payment` docs
 *     with `projectId: '_pay-docs-demo'` AND `type: 'donation'` over the
 *     last 24h. Once reached, `POST /api/donate` returns 429.
 *
 * The middleware is a strict no-op for any request that does NOT target
 * the sandbox. We do NOT want to penalise the live path with extra Mongo
 * lookups. Detection is via `req.apiKeyAppSlug`, `req.apiKeyApplicationId`,
 * `req.body.projectId`, or `req.body.applicationId`.
 *
 * @module apps/ezpay/api/src/middleware/check-pay-demo-quotas
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { PAY_DOCS_DEMO_APP_SLUG } from '../scripts/seed-pay-docs-demo-data.js'
import { getPaymentModel } from '../models/Payment.js'

/** Hard caps applied to the pay-docs-demo sandbox. Lower than ezauth's
 * docs-demo (100/500) because each pay-side mutation triggers heavier
 * downstream work (Stripe API call, webhook fan-out). */
export const PAY_DOCS_DEMO_QUOTAS = {
  maxActiveSubscriptions: 50,
  maxPaymentsPerDay: 200,
  maxDonationsPerDay: 100,
} as const

/**
 * Detect whether the incoming request targets the pay-docs-demo sandbox.
 * Multiple detection vectors are supported because the pay routes mix
 * publishable-key auth (Bearer / `X-API-Key`) and plain anonymous donation
 * paths that carry the project id in the body.
 *
 *  1. **API key** — `req.apiKeyAppSlug === '_pay-docs-demo'` OR
 *     `req.apiKeyApplicationId === '_pay-docs-demo'`. Set by the API key
 *     middleware when a sandbox key is presented.
 *  2. **Body / query** — `req.body.projectId === '_pay-docs-demo'` OR
 *     `req.body.applicationId === '_pay-docs-demo'`. Used by the public
 *     donation/purchase paths that don't currently gate behind an API
 *     key but accept the slug as a body field.
 *
 * @internal
 */
function isPayDocsDemoRequest(req: Request): boolean {
  if (req.apiKeyAppSlug === PAY_DOCS_DEMO_APP_SLUG) return true
  if (req.apiKeyApplicationId === PAY_DOCS_DEMO_APP_SLUG) return true
  const body = req.body as { projectId?: unknown; applicationId?: unknown } | undefined
  if (body?.projectId === PAY_DOCS_DEMO_APP_SLUG) return true
  if (body?.applicationId === PAY_DOCS_DEMO_APP_SLUG) return true
  return false
}

/** Detect whether the body targets a donation-shaped mutation. */
function isDonationRoute(req: Request): boolean {
  // Mounted on the donation/subscription/purchase create routes — the
  // `path` differs from `url` in mounted routers; check the route stack
  // path heuristic via the body.type or the path suffix.
  if (req.path.endsWith('/donate')) return true
  return false
}

/**
 * Express middleware that enforces pay-docs-demo quotas. No-op unless the
 * incoming request targets the sandbox.
 *
 * Mount AFTER `authJwtOrKey` / `authOptionalJwtOrKey` (so
 * `req.apiKeyAppSlug` is populated) AND AFTER `express.json()` (so the
 * body fields are parsed). Mount BEFORE the route handler that creates
 * payments / subscriptions / donations.
 *
 * @example
 * docRouter.post('/donate', authOptionalJwtOrKey(), checkPayDemoQuotas, createDonationHandler)
 */
export async function checkPayDemoQuotas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // No-op fast path — strict no-op for any request that did NOT target the
  // pay-docs-demo namespace.
  if (!isPayDocsDemoRequest(req)) {
    return next()
  }

  try {
    const Payment = await getPaymentModel()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Donation-specific gate first (cheapest single query path).
    if (isDonationRoute(req)) {
      const donationCount = await Payment.countDocuments(
        {
          projectId: PAY_DOCS_DEMO_APP_SLUG,
          type: 'donation',
          createdAt: { $gte: cutoff },
        },
        // Bypass the test mode scope plugin so the count is exact regardless
        // of the request context's derivedMode (the sandbox docs are always
        // `isTestMode: true` so this matters only if the plugin is wired into
        // an unexpected request frame).
        { skipTestModeScope: true } as { skipTestModeScope?: boolean }
      )
      if (donationCount >= PAY_DOCS_DEMO_QUOTAS.maxDonationsPerDay) {
        logger.warn(
          {
            donationCount,
            limit: PAY_DOCS_DEMO_QUOTAS.maxDonationsPerDay,
            path: req.path,
          },
          'Pay docs demo donation denied: max donations per day reached'
        )
        sendError(res, 'Demo capacity reached. Try again later (resets every 24h).', 429)
        return
      }
      return next()
    }

    // Subscription gate — count active sandbox subscriptions.
    if (req.path.endsWith('/subscribe')) {
      const activeSubsCount = await Payment.countDocuments(
        {
          projectId: PAY_DOCS_DEMO_APP_SLUG,
          type: 'subscription',
          status: 'completed',
        },
        { skipTestModeScope: true } as { skipTestModeScope?: boolean }
      )
      if (activeSubsCount >= PAY_DOCS_DEMO_QUOTAS.maxActiveSubscriptions) {
        logger.warn(
          {
            activeSubsCount,
            limit: PAY_DOCS_DEMO_QUOTAS.maxActiveSubscriptions,
            path: req.path,
          },
          'Pay docs demo subscription denied: max active subscriptions reached'
        )
        sendError(res, 'Demo capacity reached. Try again later (resets every 24h).', 429)
        return
      }
      // Continue to per-day payment gate (subscriptions count toward both).
    }

    // Payments-per-day gate — applies to ANY non-donation mutation.
    const paymentCount = await Payment.countDocuments(
      {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        type: { $ne: 'donation' },
        createdAt: { $gte: cutoff },
      },
      { skipTestModeScope: true } as { skipTestModeScope?: boolean }
    )
    if (paymentCount >= PAY_DOCS_DEMO_QUOTAS.maxPaymentsPerDay) {
      logger.warn(
        {
          paymentCount,
          limit: PAY_DOCS_DEMO_QUOTAS.maxPaymentsPerDay,
          path: req.path,
        },
        'Pay docs demo payment denied: max payments per day reached'
      )
      sendError(res, 'Demo capacity reached. Try again later (resets every 24h).', 429)
      return
    }

    next()
  } catch (err) {
    logger.error({ err, path: req.path }, 'Pay docs demo quota check failed')
    // Fail closed — never let a check-error flow through into an unmetered
    // sandbox mutation.
    sendError(res, 'Pay documentation demo sandbox temporarily unavailable', 503)
  }
}
