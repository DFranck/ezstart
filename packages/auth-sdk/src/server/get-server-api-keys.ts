/**
 * Server-side API keys bootstrap helper — companion to {@link getServerAuth}.
 *
 * Fetches the current user's API keys via `/api/keys` using the inbound
 * session cookie. The result is intended to be passed as the `initialKeys`
 * prop on `<DeveloperPortal>` so the table renders on the very first paint —
 * no client-side `<Spinner>` flash on dashboard / developer routes.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 */

import type { ApiKeyItem } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerApiKeysLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Options for {@link getServerApiKeys}. */
export interface GetServerApiKeysOptions {
  /**
   * Base URL of the auth API (e.g. `https://api.auth.example.com`).
   *
   * The `/api/keys` path is appended automatically. Trailing slashes are
   * tolerated.
   */
  apiUrl: string
  /**
   * Raw `Cookie` header from the incoming request. Pass `undefined` (or an
   * empty string) for unauthenticated requests — the helper short-circuits
   * to `null` without making a network call.
   */
  cookieHeader?: string | null
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerApiKeysLogger
}

/**
 * Fetch the current user's API keys via `/api/keys` using the provided
 * cookie header.
 *
 * Returns:
 * - `null` when no cookie header is provided
 * - `null` when the API responds with a non-2xx status (typically 401)
 * - `null` when the response cannot be parsed as JSON or has no `data` array
 * - `ApiKeyItem[]` on success (may be empty)
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/(dashboard)/developer/page.tsx (Server Component)
 * import { getServerApiKeys } from '@ezstart/auth-sdk/server'
 * import { headers } from 'next/headers'
 * import { DeveloperPortal } from '@ezstart/auth-sdk/components'
 *
 * export default async function DeveloperPage() {
 *   const headersList = await headers()
 *   const initialKeys = await getServerApiKeys({
 *     apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
 *     cookieHeader: headersList.get('cookie'),
 *   })
 *
 *   return <DeveloperPortal initialKeys={initialKeys ?? undefined} />
 * }
 * ```
 */
export async function getServerApiKeys(
  options: GetServerApiKeysOptions
): Promise<ApiKeyItem[] | null> {
  const { apiUrl, cookieHeader, fetchImpl, logger } = options

  if (!cookieHeader || cookieHeader.length === 0) {
    logger?.debug?.('[getServerApiKeys] no cookie header → returning null (anonymous)')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const baseUrl = apiUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/api/keys`

  try {
    logger?.debug?.('[getServerApiKeys] fetching /keys', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    logger?.debug?.('[getServerApiKeys] /keys response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerApiKeys] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractKeys(body)
  } catch (err) {
    logger?.warn('[getServerApiKeys] failed to fetch /api/keys', err)
    return null
  }
}

/**
 * Extract the keys array from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: ApiKeyItem[] }` (api-core `sendSuccess`)
 * - `{ data: ApiKeyItem[] }` (legacy)
 * - `ApiKeyItem[]` (raw, very legacy)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractKeys(body: unknown): ApiKeyItem[] | null {
  if (body == null) return null

  if (Array.isArray(body)) return body as ApiKeyItem[]

  if (typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (Array.isArray(data)) return data as ApiKeyItem[]

  return null
}
