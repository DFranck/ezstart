/**
 * Server-side plans bootstrap helper — SSR companion to the client-side
 * {@link usePlans} hook and the `<PricingPage>` component.
 *
 * Fetches the active plans for an Application via the public
 * `GET /api/plans?applicationId=…` endpoint (no auth — the publishable key
 * IS the scope). The result is intended to be passed as `initialPlans` on
 * `<PricingPage>` so the pricing grid renders on the very first paint — no
 * client `<Spinner>` / skeleton flash while the async fetch resolves.
 *
 * Without this companion, `<PricingPage>` relies on `usePlans`' `useEffect`
 * fetch as its PRIMARY source → the page renders the loading skeleton on
 * every server-rendered request, then swaps to the cards after hydration =
 * visible flash. With `initialPlans` the cards are correct at first paint
 * and the client `useEffect` becomes a revalidation-only fallback.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies. Use the client-side
 * `usePlans()` hook instead.
 */

import './_internal/server-only.js'

import { resolvePayApiUrl } from './_internal/resolve-api-url.js'
import type { Plan } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerPlansLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Options for {@link getServerPlans}. */
export interface GetServerPlansOptions {
  /**
   * Base URL of the pay API (e.g. `https://api.pay.example.com`).
   *
   * The `/api/plans` path is appended automatically. Trailing slashes are
   * tolerated.
   *
   * **Optional.** When omitted, falls back to
   * `process.env.NEXT_PUBLIC_EZPAY_API_URL`, then to the env-aware shipped
   * default (`https://ezpay-api.ezstart.xyz` in production). Pass an explicit
   * URL to override (self-hosted EZPay, custom cloud, etc.).
   */
  apiUrl?: string
  /**
   * Ezauth Application id the plans are scoped to (preferred). When provided,
   * the API returns only the plans belonging to this Application.
   */
  applicationId?: string
  /**
   * Legacy app-slug identifier (e.g. `'ezbill'`). Forwarded to the backend
   * only when `applicationId` is absent.
   *
   * @deprecated Use `applicationId` instead.
   */
  appName?: string
  /**
   * Publishable key (`ez_pk_*` for production, `ez_pk_test_*` for sandbox).
   * Optional — `/api/plans` is a public endpoint, but forwarding the key as
   * `?key=` keeps the request scoped to the right test/live data set when the
   * API filters by key mode.
   */
  publishableKey?: string | null
  /** Only return active plans. Defaults to `true`. */
  active?: boolean
  /** Max plans to return. Defaults to `50` (matches `usePlans`). */
  limit?: number
  /** Pagination offset. Defaults to `0`. */
  offset?: number
  /**
   * Raw `Cookie` header from the incoming request. Optional — plans are
   * public, but forwarding the cookie lets the API apply the caller's
   * test/live scope when authenticated.
   */
  cookieHeader?: string | null
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerPlansLogger
}

/**
 * Fetch the active plans for an Application via `GET /api/plans`.
 *
 * Returns:
 * - `null` when the API responds with a non-2xx status
 * - `null` when the response cannot be parsed or has no recognizable shape
 * - `Plan[]` on success (may be empty), sorted by `sortOrder`
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/pricing/page.tsx (Next.js App Router, Server Component)
 * import { getServerPlans } from '@ezstart/pay-sdk/server'
 * import { PricingPage } from '@ezstart/pay-sdk/components'
 *
 * export default async function Pricing() {
 *   const initialPlans = await getServerPlans({
 *     apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL!,
 *     applicationId: process.env.NEXT_PUBLIC_APPLICATION_ID,
 *   })
 *
 *   return <PricingPage initialPlans={initialPlans ?? undefined} />
 * }
 * ```
 */
export async function getServerPlans(options: GetServerPlansOptions): Promise<Plan[] | null> {
  const {
    apiUrl,
    applicationId,
    appName,
    publishableKey,
    active = true,
    limit = 50,
    offset = 0,
    cookieHeader,
    fetchImpl,
    logger,
  } = options

  const fetchFn = fetchImpl ?? fetch
  const resolvedApiUrl = resolvePayApiUrl(apiUrl)
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')

  const params = new URLSearchParams()
  if (applicationId) params.set('applicationId', applicationId)
  else if (appName) params.set('appName', appName)
  params.set('active', String(active))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (publishableKey) params.set('key', publishableKey)
  const url = `${baseUrl}/api/plans?${params.toString()}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (cookieHeader && cookieHeader.length > 0) headers.Cookie = cookieHeader

  try {
    logger?.debug?.('[getServerPlans] fetching /plans', { url })
    const response = await fetchFn(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    logger?.debug?.('[getServerPlans] /plans response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerPlans] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    return extractPlans(body)
  } catch (err) {
    logger?.warn('[getServerPlans] failed to fetch /api/plans', err)
    return null
  }
}

/**
 * Extract the plans array from the API response envelope.
 *
 * Handles:
 * - `{ success: true, data: Plan[] }` (api-core `sendSuccess` envelope)
 * - `{ data: Plan[] }` (legacy)
 * - `{ plans: Plan[] }` (legacy alt key)
 * - `Plan[]` (raw, very legacy)
 *
 * Maps MongoDB `_id` → `id` (matching the client `listPlans` normalization)
 * and sorts by `sortOrder`. Returns `null` when no recognizable shape is
 * found or when the envelope explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractPlans(body: unknown): Plan[] | null {
  if (body == null) return null

  if (Array.isArray(body)) return normalizePlans(body)

  if (typeof body !== 'object') return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null

  const data = record.data
  if (Array.isArray(data)) return normalizePlans(data)

  const plans = record.plans
  if (Array.isArray(plans)) return normalizePlans(plans)

  return null
}

/**
 * Normalize raw plan documents: map `_id` → `id` and sort by `sortOrder`.
 * Mirrors the client-side `listPlans` + `usePlans` post-processing so the SSR
 * snapshot is byte-identical to the hydrated client list (no re-sort flash).
 *
 * @internal
 */
function normalizePlans(raw: unknown[]): Plan[] {
  const plans = raw.map(p => {
    const record = p as Record<string, unknown> & { id?: string; _id?: string }
    return { ...record, id: record.id ?? record._id } as unknown as Plan
  })
  return plans.sort((a, b) => a.sortOrder - b.sortOrder)
}
