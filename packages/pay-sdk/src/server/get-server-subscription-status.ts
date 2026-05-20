/**
 * Server-side subscription-status bootstrap helper — SSR companion to the
 * client-side {@link useSubscriptionStatus} hook and the `<BillingDashboard>`
 * component.
 *
 * Fetches the authenticated user's most recent subscription via
 * `GET /api/subscriptions` (cookie or bearer auth), optionally resolves plan
 * features via `GET /api/plans`, and returns a serializable
 * {@link SubscriptionStatusSnapshot}. Pass it as `initialSubscription` on
 * `<BillingDashboard>` / `<PricingPage>` so the billing state renders correct
 * on the very first paint — no skeleton flash while the async fetch resolves.
 *
 * Without this companion, `<BillingDashboard>` relies on the hook's
 * `useEffect` fetch as its PRIMARY source → it renders the loading skeleton on
 * every server-rendered request, then swaps after hydration = visible flash.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies. Use the client-side
 * `useSubscriptionStatus()` hook instead.
 */

import './_internal/server-only.js'

import { resolvePayApiUrl } from './_internal/resolve-api-url.js'
import { deriveSubscriptionStatus } from '../core/derive-subscription-status.js'
import type { Payment } from '../core/types.js'
import type { Plan } from '../core/types.js'
import type { SubscriptionStatusSnapshot } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerSubscriptionStatusLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
}

/** Options for {@link getServerSubscriptionStatus}. */
export interface GetServerSubscriptionStatusOptions {
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
   * Raw `Cookie` header from the incoming request (cookie-auth path). Pass
   * this OR `bearerToken`. When neither is provided the helper short-circuits
   * to `null` without a network call (anonymous).
   */
  cookieHeader?: string | null
  /**
   * Access token for `Authorization: Bearer …` (header-auth path). Pass this
   * OR `cookieHeader`.
   */
  bearerToken?: string | null
  /**
   * The user id whose subscription to fetch. When omitted, the API resolves
   * the caller from the auth credential — but passing it explicitly scopes
   * the listing and matches the client hook's behaviour.
   */
  userId?: string
  /**
   * Ezauth Application id used to resolve plan features when the subscription
   * metadata snapshot is empty. Optional — feature resolution is best-effort.
   */
  applicationId?: string
  /**
   * Legacy app-slug. Forwarded to the plan lookup only when `applicationId`
   * is absent.
   *
   * @deprecated Use `applicationId` instead.
   */
  appName?: string
  /**
   * Skip the plans fetch used to resolve features when the subscription
   * metadata snapshot is empty. Defaults to `false` (features resolved when
   * possible). Set `true` to avoid the extra request when you don't render
   * the feature list server-side.
   */
  skipPlanFeatures?: boolean
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerSubscriptionStatusLogger
}

/**
 * Fetch the user's subscription status server-side and derive a serializable
 * snapshot.
 *
 * Returns:
 * - `null` when neither `cookieHeader` nor `bearerToken` is provided
 * - `null` when the subscriptions request fails (non-2xx, parse error, network)
 * - {@link SubscriptionStatusSnapshot} on success (an "empty"/free snapshot
 *   when the user has no active subscription)
 *
 * Network or parse errors are caught and logged via `options.logger?.warn` —
 * the helper never throws, so it is safe to call from a Server Component
 * without try/catch.
 *
 * @example
 * ```tsx
 * // app/[locale]/(dashboard)/billing/page.tsx (Server Component)
 * import { getServerSubscriptionStatus } from '@ezstart/pay-sdk/server'
 * import { BillingDashboard } from '@ezstart/pay-sdk/components'
 * import { headers } from 'next/headers'
 *
 * const cookieHeader = (await headers()).get('cookie')
 * const initialSubscription = await getServerSubscriptionStatus({
 *   apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL!,
 *   cookieHeader,
 *   applicationId: process.env.NEXT_PUBLIC_APPLICATION_ID,
 * })
 *
 * return <BillingDashboard initialSubscription={initialSubscription ?? undefined} />
 * ```
 */
export async function getServerSubscriptionStatus(
  options: GetServerSubscriptionStatusOptions
): Promise<SubscriptionStatusSnapshot | null> {
  const {
    apiUrl,
    cookieHeader,
    bearerToken,
    userId,
    applicationId,
    appName,
    skipPlanFeatures = false,
    fetchImpl,
    logger,
  } = options

  const hasCookie = !!cookieHeader && cookieHeader.length > 0
  const hasBearer = !!bearerToken && bearerToken.length > 0
  if (!hasCookie && !hasBearer) {
    logger?.debug?.('[getServerSubscriptionStatus] no auth credential → returning null')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const resolvedApiUrl = resolvePayApiUrl(apiUrl)
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')

  const authHeaders: Record<string, string> = { Accept: 'application/json' }
  if (hasCookie) authHeaders.Cookie = cookieHeader as string
  if (hasBearer) authHeaders.Authorization = `Bearer ${bearerToken}`

  // 1. Subscriptions list — first completed subscription wins.
  const subParams = new URLSearchParams()
  if (userId) subParams.set('userId', userId)
  subParams.set('limit', '1')
  const subUrl = `${baseUrl}/api/subscriptions?${subParams.toString()}`

  let payments: Payment[]
  try {
    logger?.debug?.('[getServerSubscriptionStatus] fetching /subscriptions', { url: subUrl })
    const response = await fetchFn(subUrl, {
      method: 'GET',
      headers: authHeaders,
      cache: 'no-store',
    })

    logger?.debug?.('[getServerSubscriptionStatus] /subscriptions response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerSubscriptionStatus] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    payments = extractPayments(body)
  } catch (err) {
    logger?.warn('[getServerSubscriptionStatus] failed to fetch /api/subscriptions', err)
    return null
  }

  // 2. Optional plans lookup for feature resolution — best-effort, never
  // fails the whole helper.
  let plans: Plan[] | undefined
  const activeSub = payments.find(p => p.status === 'completed' && p.type === 'subscription')
  const needsPlanFeatures =
    !skipPlanFeatures &&
    !!activeSub &&
    ((activeSub.metadata?.features as string[] | undefined) ?? []).length === 0

  if (needsPlanFeatures) {
    const planParams = new URLSearchParams()
    if (applicationId) planParams.set('applicationId', applicationId)
    else if (appName) planParams.set('appName', appName)
    planParams.set('active', 'true')
    const planUrl = `${baseUrl}/api/plans?${planParams.toString()}`

    try {
      logger?.debug?.('[getServerSubscriptionStatus] fetching /plans for features', {
        url: planUrl,
      })
      const planResponse = await fetchFn(planUrl, {
        method: 'GET',
        headers: authHeaders,
        cache: 'no-store',
      })
      if (planResponse.ok) {
        const planBody: unknown = await planResponse.json().catch(() => null)
        plans = extractPlans(planBody)
      }
    } catch (err) {
      // Plan lookup is best-effort — keep the snapshot, just without features.
      logger?.debug?.('[getServerSubscriptionStatus] plan feature lookup failed', err)
    }
  }

  return deriveSubscriptionStatus(payments, plans)
}

/**
 * Extract the payments array from the `{ success, data | payments, meta }`
 * list envelope, mapping `_id` → `id` to match the client `fetchList`.
 *
 * @internal
 */
function extractPayments(body: unknown): Payment[] {
  if (body == null) return []

  if (Array.isArray(body)) return mapIds(body)

  if (typeof body !== 'object') return []

  const record = body as Record<string, unknown>
  if (record.success === false) return []

  if (Array.isArray(record.data)) return mapIds(record.data)
  if (Array.isArray(record.payments)) return mapIds(record.payments)

  return []
}

/** Map `_id` → `id` on each payment record. @internal */
function mapIds(raw: unknown[]): Payment[] {
  return raw.map(p => {
    const record = p as Record<string, unknown> & { id?: string; _id?: string }
    return { ...record, id: record.id ?? record._id } as unknown as Payment
  })
}

/**
 * Extract the plans array from the `{ success, data | plans }` envelope.
 *
 * @internal
 */
function extractPlans(body: unknown): Plan[] {
  if (body == null) return []

  if (Array.isArray(body)) return body as Plan[]

  if (typeof body !== 'object') return []

  const record = body as Record<string, unknown>
  if (record.success === false) return []

  if (Array.isArray(record.data)) return record.data as Plan[]
  if (Array.isArray(record.plans)) return record.plans as Plan[]

  return []
}
