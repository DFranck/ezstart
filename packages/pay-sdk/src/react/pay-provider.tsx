'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Logger } from '@ezstart/logger'
import { createPayClient } from '../core/pay-client.js'
import { getEzpayDefaultUrls } from '../core/defaults.js'
import { PayStoreContext } from './__contexts.js'
import { consoleLogger, silentPayLogger } from './pay-provider/loggers.js'
import {
  resolvePayWebUrl,
  type PayContextValue,
  type PayProviderProps,
} from './pay-provider/types.js'
import { useKeyConfigResolution } from './pay-provider/use-key-config-resolution.js'
import { createPayStore, type ApplicationResolutionStatus } from './store.js'

// ---------------------------------------------------------------------------
// Public re-exports — the Context-bound store hooks live in
// `./pay-provider/public-hooks.ts`. Re-exporting them here keeps the public
// import path (`@ezstart/pay-sdk` → `./pay-provider.js`) byte-for-byte
// unchanged for any consumer that imported them from the provider module.
// ---------------------------------------------------------------------------
export {
  usePayStore,
  usePayStoreApi,
  usePayStoreGetSnapshot,
  usePayStoreSSR,
} from './pay-provider/public-hooks.js'

const PayContext = createContext<PayContextValue | null>(null)

export function PayProvider({
  children,
  appName,
  applicationId: applicationIdProp,
  publishableKey,
  config,
  getToken,
  onTokenRefresh,
  onAuthFailure,
  payWebUrl,
  locale,
  logger: loggerProp,
}: PayProviderProps) {
  // Resolve the diagnostic logger once — refs keep callbacks stable below.
  const log = loggerProp ?? consoleLogger
  const logRef = useRef(log)
  logRef.current = log
  // Use refs so the client always calls the latest callbacks without re-creating the client
  const getTokenRef = useRef(getToken ?? config?.getToken)
  getTokenRef.current = getToken ?? config?.getToken

  const onTokenRefreshRef = useRef(onTokenRefresh ?? config?.onTokenRefresh)
  onTokenRefreshRef.current = onTokenRefresh ?? config?.onTokenRefresh

  const onAuthFailureRef = useRef(onAuthFailure ?? config?.onAuthFailure)
  onAuthFailureRef.current = onAuthFailure ?? config?.onAuthFailure

  // Derive `apiKey` from `publishableKey` so every HTTP request the client
  // makes carries the `X-API-Key` header (required by the ezpay API to scope
  // writes/reads to the right Application without a logged-in session).
  //
  // Safety: ONLY accept publishable keys (`ez_pk_*` or legacy `epk_*`). Reject
  // secret keys (`ez_sk_*` / `esk_*`) defensively — those should never reach a
  // browser bundle, but if a consumer mis-configures the provider we refuse to
  // smuggle the secret over the wire. `config.apiKey` (explicit) still wins.
  const derivedApiKey =
    publishableKey && (publishableKey.startsWith('ez_pk_') || publishableKey.startsWith('epk_'))
      ? publishableKey
      : undefined

  // Env-aware apiUrl resolution (Phase A2 2026-05-10):
  //   1. explicit `config.apiUrl` (trimmed)            (caller knows best)
  //   2. NEXT_PUBLIC_EZPAY_API_URL (trimmed)           (dev / staging / self-hosted override)
  //   3. getEzpayDefaultUrls().api                     (env-aware: staging → staging URL, prod → prod)
  //
  // `.trim()` prevents a trailing `\n` in any env source from producing an
  // invalid URL (e.g. Vercel env var manually set with a newline appended).
  // Empty-string after trim is treated as "not set" so the env-aware default
  // kicks in — consumers pointing at the canonical EZPay cloud need zero env
  // wiring in any environment when DEPLOY_ENV is correctly configured.
  const resolvedConfigApiUrl =
    (config?.apiUrl?.trim() ?? process.env.NEXT_PUBLIC_EZPAY_API_URL?.trim() ?? '') ||
    getEzpayDefaultUrls().api

  const client = useMemo(() => {
    return createPayClient({
      appName,
      applicationId: applicationIdProp ?? config?.applicationId,
      apiKey: derivedApiKey,
      ...config,
      // `apiUrl` is set AFTER the spread so an undefined `config.apiUrl`
      // doesn't fall back to the empty-string default and clobber the
      // Stripe-style resolution above (Phase A1 ENV-DIET 2026-05-05).
      apiUrl: resolvedConfigApiUrl,
      getToken: () => getTokenRef.current?.() ?? null,
      onTokenRefresh: () => onTokenRefreshRef.current?.() ?? Promise.resolve(null),
      onAuthFailure: () => onAuthFailureRef.current?.(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are handled via refs
  }, [appName, applicationIdProp, config, derivedApiKey, resolvedConfigApiUrl])

  // Determine initial state based on which props are provided.
  const explicitApplicationId = applicationIdProp ?? config?.applicationId ?? null
  const initialStatus: ApplicationResolutionStatus = explicitApplicationId
    ? 'ready'
    : publishableKey
      ? 'pending'
      : 'idle'
  // `isReady` tracks "safe to render downstream queries" — true only for `ready` / `idle`.
  // Pending AND failed both keep `isReady=false` to prevent fail-open cross-app queries.
  const initialIsReady = initialStatus === 'ready' || initialStatus === 'idle'
  // Match the legacy initial `appSlug` exactly: only known synchronously when
  // an explicit applicationId is provided. The legacy `appName`-only (idle)
  // path leaves it null until the resolution effect patches it (parity with
  // the pre-refactor behaviour — no first-render slug drift).
  const initialAppSlug = explicitApplicationId ? (appName ?? null) : null

  // ── Per-Provider Zustand store (Clerk-style SSR setup) ──────────────────
  //
  // Creating the store inside `useState` guarantees one store per Provider
  // instance AND that the resolved application context (computed synchronously
  // from the props above) is available on the very first render. Subscribers
  // therefore never observe a transient `{ isReady: false, status: 'idle' }`
  // flash between mount and the post-mount resolution effect. This is the
  // canonical Next.js + Zustand setup (standard.md §0bis). The factory is
  // referenced once on first render — the `useState` initializer is not
  // re-invoked on subsequent renders, so changing props mutate the live store
  // through the resolution effect below, never re-create it.
  const [store] = useState(() =>
    createPayStore({
      initial: {
        applicationId: explicitApplicationId,
        appSlug: initialAppSlug,
        isReady: initialIsReady,
        applicationResolutionStatus: initialStatus,
      },
    })
  )

  // Read the action off the per-Provider store instance directly — the
  // component cannot consume `PayStoreContext` via `usePayStore()` because it
  // provides that very context in its own return. `getState()` is stable for
  // the store's lifetime, so this needs no memoization.
  const setApplicationContext = store.getState().setApplicationContext

  // VULN-3: dev-time warning for legacy `appName`-only path.
  useEffect(() => {
    if (
      !publishableKey &&
      !applicationIdProp &&
      !config?.applicationId &&
      appName &&
      typeof window !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      logRef.current.error(
        '[pay-sdk] PayProvider was mounted with only `appName` (legacy). ' +
          'BillingDashboard and other scoped queries require `publishableKey` or ' +
          '`applicationId` to prevent cross-app data leaks. The legacy `appName` ' +
          'fallback is deprecated and will be removed in a future release.'
      )
    }
  }, [publishableKey, applicationIdProp, config?.applicationId, appName])

  // Resolve the application context (applicationId / appSlug / status + ezpay
  // webUrl) from the publishable key via `GET /api/keys/config`. The full
  // lifecycle — REG-1 dedup guard, StrictMode-safe mount tracking, VULN-1
  // no-fail-open — lives in the co-located hook. Pure orchestration here.
  const { applicationId, appSlug, resolutionStatus, resolvedWebUrlFromKey } =
    useKeyConfigResolution({
      client,
      appName,
      publishableKey,
      applicationIdProp,
      configApplicationId: config?.applicationId,
      explicitApplicationId,
      initialStatus,
      initialAppSlug,
      setApplicationContext,
      logRef,
    })

  const isReady = resolutionStatus === 'ready' || resolutionStatus === 'idle'

  // Precedence for the EZPay web URL (highest → lowest):
  //   1. Explicit `payWebUrl` prop           — caller knows best
  //   2. `webUrl` from `/keys/config` resolve — Stripe-style auto-config
  //   3. localhost dev auto-detect           — keeps zero-config DX in dev
  //   4. `null`                              — production without explicit
  //                                            wiring or key resolve fails
  const resolvedPayWebUrl = useMemo(
    () => resolvePayWebUrl(payWebUrl ?? resolvedWebUrlFromKey ?? undefined, resolvedConfigApiUrl),
    [payWebUrl, resolvedWebUrlFromKey, resolvedConfigApiUrl]
  )

  const resolvedLocale = locale && locale.length > 0 ? locale : 'en'

  const contextValue = useMemo(
    () => ({
      client,
      applicationId,
      appSlug,
      isReady,
      applicationResolutionStatus: resolutionStatus,
      payWebUrl: resolvedPayWebUrl,
      locale: resolvedLocale,
      logger: log,
    }),
    [
      client,
      applicationId,
      appSlug,
      isReady,
      resolutionStatus,
      resolvedPayWebUrl,
      resolvedLocale,
      log,
    ]
  )

  return (
    <PayStoreContext.Provider value={store}>
      <PayContext.Provider value={contextValue}>{children}</PayContext.Provider>
    </PayStoreContext.Provider>
  )
}

export function usePayContext() {
  const context = useContext(PayContext)
  if (!context) {
    throw new Error('usePayContext must be used within a PayProvider')
  }
  return context
}

/**
 * Convenience hook exposing only the resolved application context (id + slug + ready + status).
 *
 * Consumers that gate RBAC-sensitive queries should check `applicationResolutionStatus`
 * and refuse to fetch when it is `'failed'` (prevents cross-app leaks on transient errors).
 *
 * @example
 * ```tsx
 * const { applicationId, isReady, applicationResolutionStatus } = useApplicationContext()
 * if (applicationResolutionStatus === 'failed') return <ErrorState />
 * if (!isReady) return <Spinner />
 * ```
 */
/**
 * Safe locale accessor that returns the locale from the surrounding
 * `<PayProvider>` when one is mounted, or falls back to `'en'` when used
 * outside a provider (e.g. in isolated unit tests). Prefer this over
 * `useApplicationContext().locale` when a component may be rendered both
 * inside and outside a provider tree.
 */
export function usePayLocale(): string {
  const context = useContext(PayContext)
  return context?.locale ?? 'en'
}

/**
 * Returns the {@link Logger} provided to `<PayProvider logger={...}>`. When
 * called outside any provider (e.g. in isolated unit tests), returns a
 * silent no-op logger so components never throw on missing context.
 *
 * SDK components use this to surface deprecation / misconfiguration
 * messages through the consumer-controlled sink instead of writing to
 * `console.*` directly.
 */
export function usePayLogger(): Logger {
  const context = useContext(PayContext)
  return context?.logger ?? silentPayLogger
}

export function useApplicationContext(): {
  applicationId: string | null
  appSlug: string | null
  isReady: boolean
  applicationResolutionStatus: ApplicationResolutionStatus
  /**
   * Ezpay web URL (e.g. `https://ezpay.ezstart.xyz`) — where the developer
   * portal lives. Used to build "Get your key" CTAs in graceful fallback
   * cards. `null` when the provider couldn't auto-detect (non-localhost and
   * no `payWebUrl` prop provided).
   */
  payWebUrl: string | null
  /**
   * BCP-47 locale inherited from `<PayProvider locale={…}>`. Defaults to
   * `'en'` when the consumer did not provide one. Components may still
   * override per-render via their own `locale` prop.
   */
  locale: string
} {
  const { applicationId, appSlug, isReady, applicationResolutionStatus, payWebUrl, locale } =
    usePayContext()
  return { applicationId, appSlug, isReady, applicationResolutionStatus, payWebUrl, locale }
}

/**
 * Re-export of the canonical {@link Logger} interface from
 * `@ezstart/logger`. SDK consumers can import this from `@ezstart/pay-sdk`
 * directly — no extra peer dependency needed.
 */
export type { Logger } from '@ezstart/logger'

// `usePay()` lives in `./pay-provider/use-pay.ts` (it depends on
// `usePayContext` defined above). Re-exported here so the public import path
// `@ezstart/pay-sdk` → `./react/pay-provider.js` → `usePay` stays unchanged.
export { usePay } from './pay-provider/use-pay.js'
