/**
 * Date / monthly-quota window helpers shared by the server-side middleware
 * factories.
 *
 * Extracted from `auth-middleware.ts` / `api-key-middleware.ts` (Wave D
 * Lot 4) — both factories carried byte-identical copies of these three pure
 * functions for monthly usage aggregation + quota retry-after computation.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/usage-window
 */

import './server-only.js'

/** `YYYY-MM` prefix of the current month (UTC) — used to scope usage aggregates. */
export function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

/** `YYYY-MM-DD` date of today (UTC) — used as the per-day usage bucket key. */
export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Seconds until the first day of next month (local time) — fed to the
 * `Retry-After` hint on a 429 quota-exceeded response.
 */
export function getSecondsUntilNextMonth(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000)
}
