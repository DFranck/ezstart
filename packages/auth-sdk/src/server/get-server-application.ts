/**
 * Server-side single application bootstrap helper — companion to
 * {@link getServerApplications}.
 *
 * Fetches a single Application by id via `/api/applications/:id` using the
 * inbound session cookie. The result is intended to be passed as the
 * `initialApplication` prop on `<ApplicationDetailView>` so the detail tabs
 * (keys, settings, theme) render on the very first paint — no client
 * `<Spinner>` flash on the developer/[id] route.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 */

import 'server-only'

import type { Application } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerApplicationLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Options for {@link getServerApplication}. */
export interface GetServerApplicationOptions {
  /**
   * Base URL of the auth API (e.g. `https://api.auth.example.com`).
   *
   * The `/api/applications/:id` path is appended automatically. Trailing
   * slashes are tolerated.
   */
  apiUrl: string
  /**
   * Raw `Cookie` header from the incoming request. Pass `undefined` (or an
   * empty string) for unauthenticated requests — the helper short-circuits
   * to `null` without making a network call.
   */
  cookieHeader?: string | null
  /** Application id (Mongo ObjectId). Pass `undefined`/empty → `null`. */
  id: string | null | undefined
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerApplicationLogger
}

/**
 * Fetch a single Application by id via `/api/applications/:id`.
 *
 * Returns:
 * - `null` when no cookie header or no id is provided
 * - `null` when the API responds with a non-2xx status (typically 401 / 404)
 * - `null` when the response cannot be parsed or has no recognized shape
 * - `Application` on success
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/(dashboard)/developer/[id]/page.tsx (Server Component)
 * import { getServerApplication } from '@ezstart/auth-sdk/server'
 * import { headers } from 'next/headers'
 *
 * export default async function ApplicationDetailPage({
 *   params,
 * }: {
 *   params: Promise<{ id: string }>
 * }) {
 *   const { id } = await params
 *   const headersList = await headers()
 *   const initialApplication = await getServerApplication({
 *     apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
 *     cookieHeader: headersList.get('cookie'),
 *     id,
 *   })
 *
 *   return <ApplicationDetailView applicationId={id} initialApplication={initialApplication ?? undefined} />
 * }
 * ```
 */
export async function getServerApplication(
  options: GetServerApplicationOptions
): Promise<Application | null> {
  const { apiUrl, cookieHeader, id, fetchImpl, logger } = options

  if (!id || id.length === 0) {
    logger?.debug?.('[getServerApplication] no id → returning null')
    return null
  }

  if (!cookieHeader || cookieHeader.length === 0) {
    logger?.debug?.('[getServerApplication] no cookie header → returning null (anonymous)')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const baseUrl = apiUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/api/applications/${encodeURIComponent(id)}`

  try {
    logger?.debug?.('[getServerApplication] fetching application', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    logger?.debug?.('[getServerApplication] application response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerApplication] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractApplication(body)
  } catch (err) {
    logger?.warn('[getServerApplication] failed to fetch /api/applications/:id', err)
    return null
  }
}

/**
 * Extract the application object from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: Application }` (api-core `sendSuccess`)
 * - `{ data: Application }` (legacy)
 * - `Application` (raw, very legacy)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractApplication(body: unknown): Application | null {
  if (body == null || typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (isApplicationLike(data)) return data as Application
  }

  if (isApplicationLike(record)) return record as unknown as Application

  return null
}

/**
 * Structural check for the minimum Application shape — `id` + `slug` + `name`
 * are present on every serialized Application document. Avoids accidentally
 * returning empty envelopes or arbitrary objects.
 *
 * @internal
 */
function isApplicationLike(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.slug === 'string' && typeof v.name === 'string'
}
