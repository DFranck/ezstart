/**
 * Server-side publishable-key config helper — SSR companion to the
 * client-side {@link useKeyConfig} hook.
 *
 * Resolves a publishable key against `/api/keys/config` server-side and
 * returns the same {@link PublishableKeyConfig} payload the client SDK
 * receives (appName, applicationId, apiUrl, webUrl, plan, scope, ...).
 *
 * Use this from a Server Component / Route Handler when you need to build
 * an external URL (login bounce, pricing CTA, docs CTA) WITHOUT shipping
 * the legacy `NEXT_PUBLIC_EZAUTH_WEB_URL` / `NEXT_PUBLIC_EZAUTH_APP_ID`
 * env vars to the consumer app. The publishable key alone is the source
 * of truth — exactly the Stripe / Clerk single-key contract.
 *
 * @example
 * ```tsx
 * // app/[locale]/pricing/page.tsx (Server Component)
 * import { getServerKeyConfig } from '@ezstart/auth-sdk/server'
 *
 * export default async function PricingPage() {
 *   const config = await getServerKeyConfig({
 *     publishableKey: process.env.NEXT_PUBLIC_EZAUTH_KEY,
 *   })
 *   const ezauthUrl = config?.webUrl ?? 'https://ezauth.ezstart.xyz'
 *   return <Button asChild><a href={`${ezauthUrl}/pricing`}>Upgrade</a></Button>
 * }
 * ```
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies. Use the
 * client-side `useKeyConfig()` hook + `useAuthContext().webUrl` instead.
 */

import './_internal/server-only.js'

import { resolveAuthApiUrl } from './_internal/resolve-api-url.js'
import type { PublishableKeyConfig } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerKeyConfigLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Options for {@link getServerKeyConfig}. */
export interface GetServerKeyConfigOptions {
  /**
   * Publishable key (`ez_pk_*` for production, `ez_pk_test_*` for sandbox).
   *
   * When omitted (or empty), the helper short-circuits to `null` without
   * making a network call so callers can rely on it from pages that may
   * render in environments where the key is not configured.
   */
  publishableKey?: string | null
  /**
   * Base URL of the auth API.
   *
   * **Optional.** When omitted, falls back to
   * `process.env.NEXT_PUBLIC_EZAUTH_API_URL`, then to the shipped
   * production default (`https://ezauth-api.ezstart.xyz`). Pass an
   * explicit URL to override (self-hosted EZAuth, custom cloud, etc.).
   */
  apiUrl?: string
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerKeyConfigLogger
}

/**
 * Resolve the publishable-key config server-side via `/api/keys/config`.
 *
 * Returns:
 * - `null` when no `publishableKey` is provided
 * - `null` when the API responds with a non-2xx status (typically 401 / 404)
 * - `null` when the response cannot be parsed
 * - {@link PublishableKeyConfig} on success
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 */
export async function getServerKeyConfig(
  options: GetServerKeyConfigOptions
): Promise<PublishableKeyConfig | null> {
  const { publishableKey, apiUrl, fetchImpl, logger } = options

  if (!publishableKey || publishableKey.length === 0) {
    logger?.debug?.('[getServerKeyConfig] no publishableKey → returning null')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const resolvedApiUrl = resolveAuthApiUrl(apiUrl)
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')
  // Some callers pass the `/api/auth` suffix because that's what the client
  // `AuthClientConfig.apiUrl` shape expects — strip it to land on the bare
  // API base before appending `/api/keys/config`.
  const cleanBase = baseUrl.endsWith('/api/auth') ? baseUrl.slice(0, -'/api/auth'.length) : baseUrl
  const url = `${cleanBase}/api/keys/config?key=${encodeURIComponent(publishableKey)}`

  try {
    logger?.debug?.('[getServerKeyConfig] fetching /keys/config', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    logger?.debug?.('[getServerKeyConfig] /keys/config response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerKeyConfig] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractKeyConfig(body)
  } catch (err) {
    logger?.warn('[getServerKeyConfig] failed to fetch /api/keys/config', err)
    return null
  }
}

/**
 * Extract the key config from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: PublishableKeyConfig }` (api-core `sendSuccess`)
 * - `{ data: PublishableKeyConfig }` (legacy)
 * - `PublishableKeyConfig` (raw)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractKeyConfig(body: unknown): PublishableKeyConfig | null {
  if (body == null || typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (isKeyConfigLike(data)) return data as PublishableKeyConfig
  }

  if (isKeyConfigLike(record)) return record as unknown as PublishableKeyConfig

  return null
}

/**
 * Structural check for the minimum PublishableKeyConfig shape — `appName`
 * is the only field guaranteed to be present on every successful response,
 * so we use it as the discriminator.
 *
 * @internal
 */
function isKeyConfigLike(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.appName === 'string'
}
