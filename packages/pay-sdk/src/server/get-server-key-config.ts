/**
 * Server-side publishable-key config helper — SSR companion to the
 * `<PayProvider publishableKey="…" />` auto-resolution.
 *
 * Resolves a publishable key against `GET /api/keys/config?key=…`
 * server-side and returns the same {@link ApplicationConfigResponse} payload
 * the client provider receives (`applicationId`, `appSlug`, `apiUrl`,
 * `webUrl`, `type`, `env`, `scope`).
 *
 * Use this from a Server Component / Route Handler when you need the resolved
 * `applicationId` / `appSlug` (or the ezpay `webUrl` for a "Get your key" CTA)
 * BEFORE the client `<PayProvider>` mounts and runs its own `/keys/config`
 * fetch — so the dependent UI renders correct on the first paint.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies. Use the client-side
 * `<PayProvider>` auto-resolution + `useApplicationContext()` instead.
 */

import './_internal/server-only.js'

import { resolvePayApiUrl } from './_internal/resolve-api-url.js'
import type { ApplicationConfigResponse } from '../core/types.js'

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
   * Base URL of the pay API.
   *
   * **Optional.** When omitted, falls back to
   * `process.env.NEXT_PUBLIC_EZPAY_API_URL`, then to the env-aware shipped
   * default (`https://ezpay-api.ezstart.xyz` in production). Pass an explicit
   * URL to override (self-hosted EZPay, custom cloud, etc.).
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
 * Resolve the publishable-key config server-side via `GET /api/keys/config`.
 *
 * Returns:
 * - `null` when no `publishableKey` is provided
 * - `null` when the API responds with a non-2xx status (typically 401 / 404)
 * - `null` when the response cannot be parsed or lacks `applicationId`
 * - {@link ApplicationConfigResponse} on success
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/pricing/page.tsx (Server Component)
 * import { getServerKeyConfig } from '@ezstart/pay-sdk/server'
 *
 * const config = await getServerKeyConfig({
 *   publishableKey: process.env.NEXT_PUBLIC_EZPAY_KEY,
 * })
 * const applicationId = config?.applicationId
 * ```
 */
export async function getServerKeyConfig(
  options: GetServerKeyConfigOptions
): Promise<ApplicationConfigResponse | null> {
  const { publishableKey, apiUrl, fetchImpl, logger } = options

  if (!publishableKey || publishableKey.length === 0) {
    logger?.debug?.('[getServerKeyConfig] no publishableKey → returning null')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const resolvedApiUrl = resolvePayApiUrl(apiUrl)
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/api/keys/config?key=${encodeURIComponent(publishableKey)}`

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
 * Extract the application config from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: ApplicationConfigResponse }` (api-core `sendSuccess`)
 * - `{ data: ApplicationConfigResponse }` (legacy)
 * - `ApplicationConfigResponse` (raw)
 *
 * Returns `null` when no recognizable shape is found or when the envelope
 * explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractKeyConfig(body: unknown): ApplicationConfigResponse | null {
  if (body == null || typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (isKeyConfigLike(data)) return data as ApplicationConfigResponse
  }

  if (isKeyConfigLike(record)) return record as unknown as ApplicationConfigResponse

  return null
}

/**
 * Structural check for the minimum ApplicationConfigResponse shape —
 * `applicationId` + `appSlug` are the two non-optional fields. Avoids
 * accidentally returning empty envelopes or arbitrary objects.
 *
 * @internal
 */
function isKeyConfigLike(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.applicationId === 'string' && typeof v.appSlug === 'string'
}
