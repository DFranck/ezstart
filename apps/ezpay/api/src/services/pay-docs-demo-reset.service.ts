/**
 * Pay docs demo reset scheduler — wipes the `_pay-docs-demo` sandbox
 * dataset every 24h and re-seeds the deterministic baseline
 * (PAY_DOCS_DEMO_SANDBOX-001 = #178, mirror of #163).
 *
 * The sandbox Application powers `/docs/pay/*` live previews. Visitors
 * can play with REAL pay-sdk components, but every byte is hard-isolated
 * via `applicationId === '_pay-docs-demo'` + `isTestMode: true`. Without
 * a periodic reset the sandbox would slowly accumulate stale subscriptions
 * + payments + donations + invoices, defeating the purpose of an
 * "infinite-fresh demo".
 *
 * What gets wiped + re-seeded (per tick):
 *
 *  - All `Payment` docs with `projectId: '_pay-docs-demo'` (covers the 4
 *    payment subtypes: `subscription`, `purchase`, `donation`, `invoice`).
 *  - Re-seed the baseline via `seedPayDocsDemoData({ skipPlans: true })`
 *    so the sandbox always shows the deterministic shape (1 active sub +
 *    1 past_due sub + 4 payments + 5 donations + 2 invoices).
 *
 * What is intentionally PRESERVED:
 *
 *  - The `_pay-docs-demo` Application document (lives in the ezauth DB,
 *    not touched by this scheduler).
 *  - The 3 sandbox `Plan` rows (Free / Pro / Enterprise) — they're the
 *    stable baseline kept across resets via `skipPlans: true`. Wiping them
 *    each tick would invalidate any fresh subscription's `metadata.planId`
 *    references mid-cycle.
 *  - Any non-`_pay-docs-demo` data — every query is strictly scoped.
 *
 * Implementation pattern follows `connect-cleanup.ts`: a `setInterval`
 * timer (`unref()`-ed for graceful Node shutdown) starts on boot and
 * ticks every 24h, scheduled to run shortly after 4am UTC the first
 * time so the cron lands during a quiet window.
 *
 * Manual triggers via the superadmin endpoint
 * `POST /api/admin/pay-docs-demo/reset` short-circuit the scheduler and
 * run the core function directly.
 *
 * @module apps/ezpay/api/src/services/pay-docs-demo-reset.service
 */

import { logger } from '@ezstart/logger/server'
import { getPaymentModel } from '../models/Payment.js'
import {
  seedPayDocsDemoData,
  PAY_DOCS_DEMO_APP_SLUG,
  type SeedPayDocsDemoDataResult,
} from '../scripts/seed-pay-docs-demo-data.js'

/** Result of a single reset cycle — useful for tests + monitoring. */
export interface PayDocsDemoResetResult {
  durationMs: number
  paymentsDeleted: number
  /** Aggregated counts from the re-seed (pre-reset baseline). */
  reseed: SeedPayDocsDemoDataResult
}

/**
 * Core reset logic — extracted for testability + the manual reset endpoint.
 *
 * Defensive against running outside the demo namespace: the wipe filters
 * strictly on `projectId === '_pay-docs-demo'` and the re-seed never
 * touches any other collection. If the ezauth-side seed has never run
 * the function still completes cleanly (the wipe is a no-op, the re-seed
 * inserts the deterministic baseline).
 */
export async function resetPayDocsDemoData(): Promise<PayDocsDemoResetResult> {
  const before = Date.now()

  const Payment = await getPaymentModel()

  // Wipe all sandbox payments (covers subscription / purchase / donation /
  // invoice subtypes). Plans are NOT in this wipe — they're the stable
  // baseline preserved across resets.
  const paymentResult = await Payment.deleteMany(
    { projectId: PAY_DOCS_DEMO_APP_SLUG },
    // Skip the test mode scope plugin so the delete targets ALL sandbox
    // docs regardless of context (the cron runs outside any request
    // lifecycle, so the plugin is a no-op anyway, but explicit is better).
    { skipTestModeScope: true } as { skipTestModeScope?: boolean }
  )
  const paymentsDeleted = paymentResult.deletedCount ?? 0

  // Re-seed the deterministic baseline (skip plans — they survived the
  // wipe). Skip the key mirror too: keys are bootstrap-only — they were
  // mirrored once at the initial `pnpm seed:pay-docs-demo` and never
  // change after that. Re-mirroring on every reset tick would needlessly
  // round-trip to ezauth and pollute the logs.
  const reseed = await seedPayDocsDemoData({ skipPlans: true, skipKeyMirror: true })

  const result: PayDocsDemoResetResult = {
    durationMs: Date.now() - before,
    paymentsDeleted,
    reseed,
  }

  if (paymentsDeleted > 0 || reseed.subscriptionsCreated > 0) {
    logger.info(result, 'Pay docs demo data reset cycle complete')
  }

  return result
}

/** Default scheduler tick interval (24h). Exported for tests. */
export const PAY_DOCS_DEMO_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let firstTimeout: NodeJS.Timeout | null = null

/**
 * Compute the milliseconds remaining until the next 4am UTC. Used to align
 * the first scheduler tick on a quiet window so the wipe + re-seed doesn't
 * land in the middle of the day's traffic spike.
 *
 * @internal exposed for tests via property access on the module
 */
export function _msUntilNext4amUtc(now: Date = new Date()): number {
  const next4am = new Date(now)
  next4am.setUTCHours(4, 0, 0, 0)
  if (next4am <= now) {
    next4am.setUTCDate(next4am.getUTCDate() + 1)
  }
  return next4am.getTime() - now.getTime()
}

/**
 * Start the pay-docs-demo reset scheduler. Schedules the FIRST tick to land
 * shortly after the next 4am UTC, then ticks every 24h thereafter. Safe to
 * call multiple times (idempotent), but only one timer is held. Both timers
 * are `unref()`-ed so a graceful Node shutdown does not block on them.
 *
 * Skipped automatically under `NODE_ENV=test` so unit tests don't race the
 * scheduler.
 */
export function startPayDocsDemoResetScheduler(): void {
  if (timer || firstTimeout) return
  if (process.env.NODE_ENV === 'test') return

  const msUntilNext = _msUntilNext4amUtc()

  firstTimeout = setTimeout(() => {
    resetPayDocsDemoData().catch(err => {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Pay docs demo reset scheduler first tick failed'
      )
    })

    timer = setInterval(() => {
      resetPayDocsDemoData().catch(err => {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'Pay docs demo reset scheduler tick failed'
        )
      })
    }, PAY_DOCS_DEMO_RESET_INTERVAL_MS)
    if (timer.unref) timer.unref()

    firstTimeout = null
  }, msUntilNext)

  if (firstTimeout.unref) firstTimeout.unref()

  logger.info(
    {
      firstTickInMs: msUntilNext,
      intervalMs: PAY_DOCS_DEMO_RESET_INTERVAL_MS,
    },
    'Pay docs demo reset scheduler started'
  )
}

/**
 * Stop the scheduler — primarily for tests / graceful shutdown.
 */
export function stopPayDocsDemoResetScheduler(): void {
  if (firstTimeout) {
    clearTimeout(firstTimeout)
    firstTimeout = null
  }
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
