/**
 * Docs Demo reset scheduler — wipes the `_docs-demo` sandbox dataset every
 * 24h (DOCS_DEMO_SANDBOX_BACKEND-001).
 *
 * The sandbox Application powers /docs/components live previews. Visitors
 * sign up / sign in with REAL components but with hard-isolated data.
 * Without a periodic reset, the sandbox would slowly fill up with stale
 * accounts and audit log noise — defeating the purpose of "infinite-fresh
 * demo".
 *
 * What gets wiped (per tick):
 *
 *  1. `AuthUser` documents whose `apps` array contains `_docs-demo` — hard
 *     deleted (no soft delete in a sandbox where data is by design
 *     ephemeral).
 *  2. `AuditLog` entries with `appName: '_docs-demo'` and
 *     `createdAt < now - 24h` — keeps the most-recent 24h around for
 *     debugging without letting the collection grow forever.
 *  3. `RefreshToken` documents whose `userId` was deleted in step 1 (cascade).
 *
 * What is intentionally PRESERVED:
 *
 *  - The `_docs-demo` Application document itself (`reservedSlug: true`).
 *  - The 2 system-seeded API keys for the sandbox.
 *  - Any non-`_docs-demo` data — the cron is strictly scoped.
 *
 * Implementation pattern follows `apps/ezpay/api/src/services/connect-cleanup.ts`:
 * a `setInterval` timer (`unref()`-ed so Node can exit cleanly) starts on
 * boot and ticks every 24h. Manual triggers via the superadmin endpoint
 * `POST /api/admin/docs-demo/reset` short-circuit the scheduler and run the
 * core function directly.
 *
 * @module apps/ezauth/api/src/services/docs-demo-reset.service
 */

import type { Types } from 'mongoose'
import { logger } from '@ezstart/logger/server'
import { DOCS_DEMO_APP_SLUG } from '../scripts/seed-docs-demo-app.js'
import { getAuthUserModel } from '../models/auth-user.js'
import { getAuditLogModel } from '../models/audit-log.js'
import { getRefreshTokenModel } from '../models/refresh-token.js'

/** Result of a single reset cycle — useful for tests + monitoring. */
export interface DocsDemoResetResult {
  durationMs: number
  usersDeleted: number
  refreshTokensDeleted: number
  auditLogsDeleted: number
}

/**
 * Core reset logic — extracted for testability and the manual reset endpoint.
 *
 * Defensive against running outside the demo namespace: every query is
 * explicitly scoped to `_docs-demo` (slug match for users, appName match for
 * audit logs, derived userId match for refresh tokens). If the seed script
 * has never run, the function is a clean no-op (returns zero counters).
 */
export async function resetDocsDemoData(): Promise<DocsDemoResetResult> {
  const before = Date.now()

  const [AuthUser, AuditLog, RefreshToken] = await Promise.all([
    getAuthUserModel(),
    getAuditLogModel(),
    getRefreshTokenModel(),
  ])

  // 1. Find demo users first so we can cascade their refresh tokens. We use
  //    `includeDeleted: true` so soft-deleted demo users are also purged
  //    (sandbox data is ephemeral by design).
  const demoUsers = await AuthUser.find(
    { apps: DOCS_DEMO_APP_SLUG },
    { _id: 1 },
    { includeDeleted: true }
  ).lean()
  const demoUserIds: Types.ObjectId[] = demoUsers.map(u => u._id as Types.ObjectId)

  // 2. Cascade delete refresh tokens for those users (orphaned otherwise).
  let refreshTokensDeleted = 0
  if (demoUserIds.length > 0) {
    const stringIds = demoUserIds.map(id => id.toString())
    const tokenResult = await RefreshToken.deleteMany({ userId: { $in: stringIds } })
    refreshTokensDeleted = tokenResult.deletedCount ?? 0
  }

  // 3. Hard delete the users themselves.
  let usersDeleted = 0
  if (demoUserIds.length > 0) {
    const userResult = await AuthUser.deleteMany(
      { _id: { $in: demoUserIds } },
      { includeDeleted: true }
    )
    usersDeleted = userResult.deletedCount ?? 0
  }

  // 4. Delete demo audit logs older than 24h (keep the recent ones around
  //    so superadmin can inspect what happened in the last day).
  const auditCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const auditResult = await AuditLog.deleteMany({
    appName: DOCS_DEMO_APP_SLUG,
    createdAt: { $lt: auditCutoff },
  })
  const auditLogsDeleted = auditResult.deletedCount ?? 0

  const result: DocsDemoResetResult = {
    durationMs: Date.now() - before,
    usersDeleted,
    refreshTokensDeleted,
    auditLogsDeleted,
  }

  if (usersDeleted > 0 || refreshTokensDeleted > 0 || auditLogsDeleted > 0) {
    logger.info(result, 'Docs demo data reset cycle complete')
  }

  return result
}

/**
 * Default scheduler tick interval (24h). Exported for tests / shutdown
 * orchestration.
 */
export const DOCS_DEMO_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null

/**
 * Start the docs-demo reset scheduler — fires `resetDocsDemoData` once per
 * 24h. Safe to call multiple times (idempotent), but only one timer is
 * held. The timer is `unref()`-ed so a graceful Node shutdown does not
 * block on it.
 */
export function startDocsDemoResetScheduler(): void {
  if (timer) return
  timer = setInterval(() => {
    resetDocsDemoData().catch(err => {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Docs demo reset scheduler tick failed'
      )
    })
  }, DOCS_DEMO_RESET_INTERVAL_MS)
  if (timer.unref) timer.unref()
  logger.info({ intervalMs: DOCS_DEMO_RESET_INTERVAL_MS }, 'Docs demo reset scheduler started')
}

/**
 * Stop the scheduler — primarily for tests / graceful shutdown.
 */
export function stopDocsDemoResetScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
