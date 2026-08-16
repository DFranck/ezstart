/**
 * Server-side applications bootstrap helper — companion to {@link getServerAuth}.
 *
 * Fetches the current user's owned applications (or all, when superadmin
 * passes `all: true`) via `/api/applications` using the inbound session
 * cookie. The result is intended to be passed as `initialApplications` on
 * `<EZAuthDashboard>` (or a `<ApplicationsList>` consumer) so the list
 * renders on the very first paint — no client `<Spinner>` flash on the
 * applications section / page.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 */

import './_internal/server-only.js'

import { resolveAuthApiUrl } from './_internal/resolve-api-url.js'
import type { Application } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerApplicationsLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Filters accepted by {@link getServerApplications}. */
export interface GetServerApplicationsFilters {
  /** Superadmin only — list every Application across all owners. */
  all?: boolean
  /** Include archived applications. */
  includeArchived?: boolean
}

/** Options for {@link getServerApplications}. */
export interface GetServerApplicationsOptions {
  /**
   * Base URL of the auth API (e.g. `https://api.auth.example.com`).
   *
   * The `/api/applications` path is appended automatically. Trailing
   * slashes are tolerated.
   *
   * **Optional since Phase A1 (2026-05-05).** When omitted, the helper
   * falls back to `process.env.NEXT_PUBLIC_EZAUTH_API_URL`, then to the
   * shipped production default (`https://ezauth-api.ezstart.xyz`). Pass
   * an explicit URL to override (self-hosted EZAuth, custom cloud, etc.).
   */
  apiUrl?: string
  /**
   * Raw `Cookie` header from the incoming request. Pass `undefined` (or an
   * empty string) for unauthenticated requests — the helper short-circuits
   * to `null` without making a network call.
   */
  cookieHeader?: string | null
  /** Optional list filters. */
  filters?: GetServerApplicationsFilters
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerApplicationsLogger
}

/**
 * Fetch the current user's applications via `/api/applications`.
 *
 * Returns:
 * - `null` when no cookie header is provided
 * - `null` when the API responds with a non-2xx status (typically 401)
 * - `null` when the response cannot be parsed or has no `data` array
 * - `Application[]` on success (may be empty)
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/(dashboard)/dashboard/page.tsx (Server Component)
 * import { getServerApplications } from '@ezstart/auth-sdk/server'
 * import { headers } from 'next/headers'
 *
 * const headersList = await headers()
 * const initialApplications = await getServerApplications({
 *   apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
 *   cookieHeader: headersList.get('cookie'),
 * })
 *
 * return <EZAuthDashboard initialApplications={initialApplications ?? undefined} />
 * ```
 */
export async function getServerApplications(
  options: GetServerApplicationsOptions
): Promise<Application[] | null> {
  const { apiUrl, cookieHeader, filters, fetchImpl, logger } = options

  if (!cookieHeader || cookieHeader.length === 0) {
    logger?.debug?.('[getServerApplications] no cookie header → returning null (anonymous)')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const resolvedApiUrl = resolveAuthApiUrl(apiUrl)
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')

  const params = new URLSearchParams()
  if (filters?.all) params.set('all', 'true')
  if (filters?.includeArchived) params.set('includeArchived', 'true')
  const qs = params.toString()
  const url = qs.length > 0 ? `${baseUrl}/api/applications?${qs}` : `${baseUrl}/api/applications`

  try {
    logger?.debug?.('[getServerApplications] fetching applications', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    logger?.debug?.('[getServerApplications] applications response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerApplications] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractApplications(body)
  } catch (err) {
    logger?.warn('[getServerApplications] failed to fetch /api/applications', err)
    return null
  }
}

/**
 * Extract the applications array from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: Application[] }` (api-core `sendSuccess` envelope)
 * - `{ data: Application[] }` (legacy)
 * - `Application[]` (raw, very legacy)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractApplications(body: unknown): Application[] | null {
  if (body == null) return null

  if (Array.isArray(body)) return body as Application[]

  if (typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (Array.isArray(data)) return data as Application[]

  return null
}
