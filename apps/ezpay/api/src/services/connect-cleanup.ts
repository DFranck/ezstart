/**
 * Background cleanup for stale ConnectedAccount rows in `pending` status.
 *
 * Two-step lifecycle, run hourly by the scheduler wired in `index.ts`:
 *
 *   J  : User starts onboarding via `POST /api/connect/onboard`. Row created
 *        with status='pending', expiryWarningEmailSent=false.
 *
 *   J+6: First scheduler tick that sees `createdAt < now - 6d` AND
 *        `expiryWarningEmailSent === false` sends the J-6 expiry warning
 *        email and flips the flag. Idempotent — repeated ticks within the
 *        same window are no-ops.
 *
 *   J+7: First scheduler tick that sees `createdAt < now - 7d` HARD-DELETES
 *        the row + audit-logs the deletion. Stripe Connect accounts created
 *        but never finished are zero-cost to leave on Stripe's side; we just
 *        clean up our DB row.
 *
 * Why hard delete (and not soft delete):
 * - The convert.ts pattern (the only existing audit trail in ezpay) uses
 *   metadata fields, not soft-delete. Adding a `deletedAt` column for this
 *   one cleanup flow would be inconsistent with the rest of the model.
 * - The user can always re-start a fresh onboarding by hitting
 *   `POST /api/connect/onboard` again — the flow is idempotent at the
 *   application level.
 * - Audit log via `logger.info` keeps a forensic trail of every deletion.
 *
 * @module apps/ezpay/api/src/services/connect-cleanup
 */

import { logger } from '@ezstart/logger/server'
import { getWebUrl } from '@ezstart/config'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import { emailService } from './email.service.js'
import { connectOnboardingExpiresTemplate } from '../email/templates/connect-onboarding-expires.js'

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Result returned by a single cleanup cycle. Useful for the scheduler log
 * line and the test assertions.
 */
export interface CleanupCycleResult {
  /** Number of pending rows older than 7d that were hard-deleted. */
  deleted: number
  /** Number of pending rows that crossed the 6d threshold and got an email. */
  warned: number
  /** Number of pending rows that should have been emailed but failed. */
  warnFailed: number
}

interface CleanupOptions {
  /**
   * Current time used as the cutoff. Defaults to `Date.now()`. Tests use
   * this to time-travel without spying on Date.now globally.
   */
  now?: number
  /**
   * Locale used to render the expiry warning email. Real production usage
   * would pull this from the user record; for now we default to `'en'`
   * since ezpay does not yet persist the user's preferred locale on the
   * ConnectedAccount row. Tests can override.
   */
  locale?: 'en' | 'fr' | 'vi'
}

/**
 * Perform one full cleanup cycle. Idempotent: re-running within the same
 * hour-window will not double-send emails or fail because rows are already
 * gone.
 *
 * Surface returns the counts so the scheduler can structured-log the result
 * and tests can assert behaviour.
 */
export async function cleanupExpiredPendingConnects(
  opts: CleanupOptions = {}
): Promise<CleanupCycleResult> {
  const now = opts.now ?? Date.now()
  const sixDaysAgo = new Date(now - SIX_DAYS_MS)
  const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS)
  const locale = opts.locale ?? 'en'

  const ConnectedAccount = await getConnectedAccountModel()

  // ----------------------------------------------------------------------
  // Step 1 — hard-delete pending rows older than 7d (audit-logged).
  // ----------------------------------------------------------------------
  // We fetch first so we can audit-log per-row before deletion. A bulk
  // deleteMany would lose the per-row context.
  const expired = await ConnectedAccount.find({
    status: 'pending',
    createdAt: { $lt: sevenDaysAgo },
  }).lean()

  let deleted = 0
  for (const acc of expired) {
    try {
      const result = await ConnectedAccount.deleteOne({ _id: acc._id })
      if (result.deletedCount === 1) {
        deleted += 1
        logger.info('Connect pending account auto-cleaned (>7d expired)', {
          action: 'connect_pending_auto_cleaned',
          connectedAccountId: String(acc._id),
          stripeAccountId: acc.stripeAccountId,
          applicationId: acc.applicationId,
          userId: acc.userId,
          createdAt: acc.createdAt,
          ageMs: now - acc.createdAt.getTime(),
        })
      }
    } catch (err) {
      logger.error(
        '[ConnectCleanup] failed to delete expired pending row',
        err instanceof Error ? err : String(err)
      )
    }
  }

  // ----------------------------------------------------------------------
  // Step 2 — send J-6 warning emails for rows crossing the 6d threshold
  //         that have NOT yet been emailed.
  // ----------------------------------------------------------------------
  // Note we filter `createdAt: { $lt: sixDaysAgo, $gte: sevenDaysAgo }` so
  // we only catch rows in the warning window — anything older than 7d is
  // already deleted (or will be on the next tick) and emailing them would
  // be useless.
  //
  // The `$ne: true` filter is the idempotency guard: once we flip the flag
  // a future tick within the same window cannot double-send.
  const toWarn = await ConnectedAccount.find({
    status: 'pending',
    createdAt: { $lt: sixDaysAgo, $gte: sevenDaysAgo },
    expiryWarningEmailSent: { $ne: true },
  })

  let warned = 0
  let warnFailed = 0

  for (const acc of toWarn) {
    try {
      const webBase = getWebUrl('ezpay')
      const resumeUrl = `${webBase}/${locale}/developer/applications/${acc.applicationId}/connect`

      const rendered = connectOnboardingExpiresTemplate(
        {
          resumeUrl,
          businessName: acc.businessName,
        },
        {
          appName: 'EZPay',
          appKey: 'ezpay',
          locale,
        }
      )

      await emailService.send({
        to: acc.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })

      acc.expiryWarningEmailSent = true
      await acc.save()
      warned += 1

      logger.info('Connect onboarding expiry warning sent', {
        action: 'connect_expiry_warning_sent',
        connectedAccountId: String(acc._id),
        stripeAccountId: acc.stripeAccountId,
        applicationId: acc.applicationId,
        userId: acc.userId,
        to: acc.email,
      })
    } catch (err) {
      warnFailed += 1
      logger.error(
        '[ConnectCleanup] failed to send expiry warning email',
        err instanceof Error ? err : String(err)
      )
      // Do NOT flip expiryWarningEmailSent — let the next tick retry.
    }
  }

  return { deleted, warned, warnFailed }
}

/**
 * Default scheduler tick interval (1 hour). Exported for tests / shutdown.
 */
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null

/**
 * Start the cleanup scheduler — fires `cleanupExpiredPendingConnects` once
 * per hour. Safe to call multiple times (idempotent), but only one timer
 * is held.
 */
export function startConnectCleanupScheduler(): void {
  if (timer) return
  timer = setInterval(() => {
    cleanupExpiredPendingConnects()
      .then(result => {
        if (result.deleted === 0 && result.warned === 0 && result.warnFailed === 0) return
        logger.info('[ConnectCleanup] cycle done', result)
      })
      .catch(err => {
        logger.error(
          '[ConnectCleanup] scheduler tick failed',
          err instanceof Error ? err : String(err)
        )
      })
  }, CLEANUP_INTERVAL_MS)
  // Allow Node to exit even if the timer is still scheduled (graceful
  // shutdown without explicit clearInterval).
  if (timer.unref) timer.unref()
  logger.info(`[ConnectCleanup] scheduler started — interval ${CLEANUP_INTERVAL_MS}ms`)
}

/**
 * Stop the scheduler — primarily for tests / graceful shutdown.
 */
export function stopConnectCleanupScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
