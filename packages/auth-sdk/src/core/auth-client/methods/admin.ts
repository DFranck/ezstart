/**
 * Admin + audit-log methods — user audit log listing and superadmin analytics
 * overview. Each function takes the shared {@link ClientContext} and mirrors
 * the corresponding `CoreAuthClient` method exactly.
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

import { AuthError } from '../../errors.js'
import type { AdminAnalyticsOverview, AuditLogFilters, AuditLogListResponse } from '../../types.js'
import { type ClientContext, parseError, parseErrorCode, unwrapEnvelope } from '../context.js'

/**
 * List the current user's audit log entries (paginated, filterable).
 * Defaults to the latest 20 entries across the free-tier 30-day retention
 * window.
 *
 * @example
 * ```ts
 * const { items, total } = await client.listAuditLog({ limit: 50 })
 * for (const entry of items) console.log(entry.action, entry.createdAt)
 * ```
 */
export async function listAuditLog(
  ctx: ClientContext,
  filters: AuditLogFilters = {},
  accessToken?: string
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams()
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  if (filters.action) params.set('action', filters.action)
  const query = params.toString()
  const url =
    query.length > 0 ? `${ctx.apiUrl}/me/audit-log?${query}` : `${ctx.apiUrl}/me/audit-log`

  const response = await fetch(url, {
    headers: ctx.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    credentials: 'include',
  })

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to list audit log'),
      response.status,
      parseErrorCode(result)
    )
  }
  return unwrapEnvelope<AuditLogListResponse>(result)
}

/**
 * Fetch the platform analytics overview (superadmin only).
 *
 * Returns user/app/key totals, MAU proxy, verified+2FA percentages, the
 * last-30-day signup trend (always 30 contiguous days, zero-filled), and
 * the top 5 apps by user count. The endpoint is gated by `requireAdmin` +
 * an explicit superadmin check on the API.
 *
 * @example
 * ```ts
 * const overview = await client.getAdminAnalyticsOverview(accessToken)
 * console.log(overview.totalUsers, overview.signupTrend.length) // → 30
 * ```
 */
export async function getAdminAnalyticsOverview(
  ctx: ClientContext,
  accessToken?: string
): Promise<AdminAnalyticsOverview> {
  // Admin endpoints live under `/api/admin`, NOT `/api/auth/admin`. The
  // configured `apiUrl` points at `/api/auth`, so we strip that suffix
  // before appending the admin path. Same logic as `normalizeApiBaseUrl`
  // but kept inline to avoid leaking the helper out of the module.
  let base = ctx.apiUrl
  if (base.endsWith('/api/auth')) base = base.slice(0, -'/api/auth'.length)
  if (base.endsWith('/')) base = base.slice(0, -1)

  const response = await fetch(`${base}/api/admin/analytics/overview`, {
    headers: ctx.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    credentials: 'include',
  })

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to fetch analytics overview'),
      response.status,
      parseErrorCode(result)
    )
  }
  return unwrapEnvelope<AdminAnalyticsOverview>(result)
}
