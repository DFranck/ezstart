/**
 * Server-side audit log bootstrap helper — companion to {@link getServerAuth}.
 *
 * Fetches the current user's recent audit log entries via
 * `/api/auth/me/audit-log` using the inbound session cookie. The result is
 * intended to be passed as the `initialEntries` prop on `<AuditLogSection>`
 * (or `initialAuditEntries` on `<EZAuthDashboard>`) so the activity table
 * renders on the very first paint — no client `<Spinner>` flash on dashboard
 * activity loads.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 */

import './_internal/server-only.js'

import type { AuditLogAction, AuditLogEntry } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerAuditLogLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Filters accepted by {@link getServerAuditLog}. */
export interface GetServerAuditLogFilters {
  /** Page size (1–100). Defaults to 20 server-side. */
  limit?: number
  /** Pagination offset. Defaults to 0 server-side. */
  offset?: number
  /** Optional action type filter. */
  action?: AuditLogAction
}

/** Options for {@link getServerAuditLog}. */
export interface GetServerAuditLogOptions {
  /**
   * Base URL of the auth API (e.g. `https://api.auth.example.com`).
   *
   * The `/api/auth/me/audit-log` path is appended automatically. Trailing
   * slashes are tolerated.
   */
  apiUrl: string
  /**
   * Raw `Cookie` header from the incoming request. Pass `undefined` (or an
   * empty string) for unauthenticated requests — the helper short-circuits
   * to `null` without making a network call.
   */
  cookieHeader?: string | null
  /** Optional pagination / action filters. */
  filters?: GetServerAuditLogFilters
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerAuditLogLogger
}

/**
 * Fetch the current user's audit log entries via `/api/auth/me/audit-log`.
 *
 * Returns:
 * - `null` when no cookie header is provided
 * - `null` when the API responds with a non-2xx status (typically 401)
 * - `null` when the response cannot be parsed or has no `items` array
 * - `AuditLogEntry[]` on success (may be empty)
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/(dashboard)/dashboard/page.tsx (Server Component)
 * import { getServerAuditLog } from '@ezstart/auth-sdk/server'
 * import { headers } from 'next/headers'
 *
 * const headersList = await headers()
 * const initialAuditEntries = await getServerAuditLog({
 *   apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
 *   cookieHeader: headersList.get('cookie'),
 *   filters: { limit: 20 },
 * })
 *
 * return <EZAuthDashboard initialAuditEntries={initialAuditEntries ?? undefined} />
 * ```
 */
export async function getServerAuditLog(
  options: GetServerAuditLogOptions
): Promise<AuditLogEntry[] | null> {
  const { apiUrl, cookieHeader, filters, fetchImpl, logger } = options

  if (!cookieHeader || cookieHeader.length === 0) {
    logger?.debug?.('[getServerAuditLog] no cookie header → returning null (anonymous)')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const baseUrl = apiUrl.replace(/\/+$/, '')

  const params = new URLSearchParams()
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters?.offset !== undefined) params.set('offset', String(filters.offset))
  if (filters?.action) params.set('action', filters.action)
  const qs = params.toString()
  const url =
    qs.length > 0 ? `${baseUrl}/api/auth/me/audit-log?${qs}` : `${baseUrl}/api/auth/me/audit-log`

  try {
    logger?.debug?.('[getServerAuditLog] fetching audit log', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    logger?.debug?.('[getServerAuditLog] audit log response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerAuditLog] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractEntries(body)
  } catch (err) {
    logger?.warn('[getServerAuditLog] failed to fetch /api/auth/me/audit-log', err)
    return null
  }
}

/**
 * Extract the items array from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: { items: AuditLogEntry[], ... } }` (api-core
 *   `sendSuccess` envelope)
 * - `{ items: AuditLogEntry[] }` (legacy direct payload)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractEntries(body: unknown): AuditLogEntry[] | null {
  if (body == null || typeof body !== 'object') return null
  const record = body as Record<string, unknown>

  if (record.success === false) return null

  const data = record.data
  if (data && typeof data === 'object') {
    const dataRecord = data as Record<string, unknown>
    if (Array.isArray(dataRecord.items)) return dataRecord.items as AuditLogEntry[]
  }

  // Legacy: items at top level.
  if (Array.isArray(record.items)) return record.items as AuditLogEntry[]

  return null
}
