'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Logger } from '@ezstart/logger'
import { createPayClient, type PayClient } from '../core/pay-client.js'
import type { PayClientConfig } from '../core/types.js'
import { usePayStore, type ApplicationResolutionStatus } from './store.js'

/**
 * Default logger that mirrors the previous hard-coded `console.error`
 * behaviour. Consumers can opt out by passing `logger={silentLogger}` (or
 * any custom {@link Logger} implementation) to `<PayProvider>`.
 *
 * pay-sdk is publishable npm-standalone — components MUST stay agnostic
 * of `@ezstart/logger` at runtime. The default logger therefore wraps
 * `console.*` directly. Consumers wanting Pino integration pass it via
 * the `logger` prop.
 *
 * @internal
 */
/* eslint-disable @ezstart/ezstart/no-console-log -- this IS the console fallback for the default Pay logger; consumers opt-in to a real sink via the `logger` prop */
const consoleLogger: Logger = {
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.debug(msgOrObj, dataOrMsg ?? '')
      : console.debug(String(dataOrMsg ?? ''), msgOrObj),
  info: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.info(msgOrObj, dataOrMsg ?? '')
      : console.info(String(dataOrMsg ?? ''), msgOrObj),
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.warn(msgOrObj, dataOrMsg ?? '')
      : console.warn(String(dataOrMsg ?? ''), msgOrObj),
  error: (msgOrObj: string | object, dataOrMsg?: unknown) =>
    typeof msgOrObj === 'string'
      ? console.error(msgOrObj, dataOrMsg ?? '')
      : console.error(String(dataOrMsg ?? ''), msgOrObj),
}
/* eslint-enable @ezstart/ezstart/no-console-log */

interface PayContextValue {
  client: PayClient
  /**
   * Application id resolved from either `applicationId` config/prop or via
   * `resolveApplicationByKey(publishableKey)` on mount. `null` until resolved.
   */
  applicationId: string | null
  /** Human-friendly application slug (e.g. "ezbill"). `null` until resolved. */
  appSlug: string | null
  /**
   * `true` once the application context is resolved (explicit applicationId or
   * successful publishableKey resolve) OR when the legacy `appName`-only path
   * is used (no resolution possible). NEVER `true` on a transient resolve
   * failure — that case surfaces as `applicationResolutionStatus === 'failed'`.
   */
  isReady: boolean
  /**
   * Explicit resolution lifecycle:
   * - `idle` — no publishableKey provided (legacy `appName`-only, cross-app possible)
   * - `pending` — publishableKey provided, resolve in flight
   * - `ready` — applicationId is known (explicit or successfully resolved)
   * - `failed` — publishableKey was given but the resolve call threw. Consumers
   *   MUST NOT fall back to cross-app queries when status is `failed`.
   */
  applicationResolutionStatus: ApplicationResolutionStatus
  /**
   * Public ezpay web URL — where the developer portal (API keys CRUD) lives.
   * Used by pay-sdk components to build "Get your key" CTAs in graceful
   * fallback cards when the SDK is unconfigured or its queries fail.
   *
   * Different from `ApplicationConfigResponse.webUrl` (which is the ezauth
   * web URL returned by `/keys/config`). `null` when the consumer did not
   * provide a value and auto-detection failed (non-localhost production).
   */
  payWebUrl: string | null
  /**
   * BCP-47 locale inherited by every downstream pay-sdk component (used to
   * build locale-prefixed URLs such as the "Get your key" CTA). Set once on
   * `<PayProvider locale={…}>`; components may still override per-render via
   * their own `locale` prop. Defaults to `'en'` when the consumer did not
   * provide one.
   */
  locale: string
  /**
   * Diagnostic logger injected via `<PayProvider logger={...}>` (defaults to
   * a thin `console.*` adapter). Exposed so SDK components can surface
   * deprecation / misconfiguration signals through the consumer-controlled
   * sink instead of writing directly to `console`.
   */
  logger: Logger
}

const PayContext = createContext<PayContextValue | null>(null)

interface PayProviderProps {
  children: ReactNode
  /**
   * Legacy app-slug identifier. Kept for backward compatibility with existing
   * consumers. Prefer `applicationId` or `publishableKey` for new code.
   *
   * Using `appName` alone (without `applicationId` or `publishableKey`) puts
   * the provider in the `idle` resolution state — downstream queries that
   * depend on `applicationId` will fall back to cross-app scope. This path
   * emits a `console.error` in dev to encourage migration.
   *
   * @deprecated Use `applicationId` or `publishableKey` instead.
   */
  appName?: string
  /**
   * Ezauth Application id the provider is scoped to. Takes precedence over
   * `appName`. When omitted and `publishableKey` is provided, the value is
   * resolved automatically via `GET /api/keys/config`.
   */
  applicationId?: string
  /**
   * EZPay publishable key (`ez_pk_*`). When set, the provider calls
   * `GET /api/keys/config?key=<publishableKey>` on mount to resolve the
   * `applicationId` + `appSlug` and caches them in the React context.
   */
  publishableKey?: string
  config?: Partial<Omit<PayClientConfig, 'appName'>>
  /** Optional callback to retrieve the current auth token dynamically.
   *  Shorthand for config.getToken — if both are provided, this prop takes precedence. */
  getToken?: () => string | null | undefined
  /** Optional callback to refresh the auth token on 401. Should return the new token or null. */
  onTokenRefresh?: () => Promise<string | null>
  /** Optional callback invoked when token refresh fails (e.g. to trigger logout/redirect). */
  onAuthFailure?: () => void
  /**
   * Public ezpay web URL — where the developer portal (API keys CRUD) lives.
   * Used by pay-sdk components to build "Get your key" CTAs in graceful
   * fallback cards. Example: `https://ezpay.ezstart.xyz`.
   *
   * When omitted, auto-detected from `config.apiUrl` for localhost dev
   * (`http://localhost:6130` → `http://localhost:6131`). In production the
   * consumer MUST pass this explicitly — otherwise fallback cards render
   * without the CTA button.
   */
  payWebUrl?: string
  /**
   * BCP-47 locale propagated to every downstream pay-sdk component (used to
   * build locale-prefixed URLs such as the "Get your key" CTA). Consumers
   * using Next.js App Router typically pass `locale` from `params.locale` or
   * `useLocale()` (next-intl). When omitted, falls back to `'en'`.
   *
   * Components still accept a per-instance `locale` override via their own
   * prop, but the common case is to set it once here.
   */
  locale?: string
  /**
   * Optional {@link Logger} instance used to surface SDK diagnostics
   * (deprecation warnings, publishable-key resolve failures, ...). Defaults
   * to a thin `console.*` adapter so existing consumers keep seeing the
   * same messages.
   *
   * Pass a silent or scoped logger (`@ezstart/logger`, Pino child, custom
   * sink, etc.) to redirect or suppress these signals.
   *
   * @example
   * ```tsx
   * import { logger } from '@ezstart/logger'
   * <PayProvider logger={logger} ... />
   * ```
   */
  logger?: Logger
}

/**
 * Auto-detect the ezpay web URL for localhost dev when the consumer did not
 * provide `payWebUrl` explicitly. Falls back to `null` for any non-localhost
 * origin so we never silently link users to a wrong host in production.
 *
 * @internal
 */
function resolvePayWebUrl(explicit: string | undefined, apiUrl: string | undefined): string | null {
  if (explicit && explicit.length > 0) return explicit
  if (!apiUrl) return null
  // Only auto-wire localhost — production MUST be explicit.
  if (/^http:\/\/localhost:\d+/i.test(apiUrl)) {
    return 'http://localhost:6131'
  }
  return null
}

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

  const client = useMemo(() => {
    return createPayClient({
      appName,
      applicationId: applicationIdProp ?? config?.applicationId,
      apiUrl: config?.apiUrl ?? '',
      apiKey: derivedApiKey,
      ...config,
      getToken: () => getTokenRef.current?.() ?? null,
      onTokenRefresh: () => onTokenRefreshRef.current?.() ?? Promise.resolve(null),
      onAuthFailure: () => onAuthFailureRef.current?.(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are handled via refs
  }, [appName, applicationIdProp, config, derivedApiKey])

  // Determine initial state based on which props are provided.
  const explicitApplicationId = applicationIdProp ?? config?.applicationId ?? null
  const initialStatus: ApplicationResolutionStatus = explicitApplicationId
    ? 'ready'
    : publishableKey
      ? 'pending'
      : 'idle'

  const [applicationId, setApplicationId] = useState<string | null>(explicitApplicationId)
  const [appSlug, setAppSlug] = useState<string | null>(
    explicitApplicationId ? (appName ?? null) : null
  )
  // `isReady` tracks "safe to render downstream queries" — true only for `ready` / `idle`.
  // Pending AND failed both keep `isReady=false` to prevent fail-open cross-app queries.
  const [resolutionStatus, setResolutionStatus] =
    useState<ApplicationResolutionStatus>(initialStatus)

  const setApplicationContext = usePayStore(state => state.setApplicationContext)

  /**
   * REG-1 guard — tracks which `publishableKey` has already been resolved (or
   * attempted) by this provider instance. Ensures a single `/keys/config` call
   * per mounted provider + key pair, even if a stale effect fires because
   * React / dev tools / Strict Mode re-run it, or an ancestor re-renders with
   * a new closure. Without this ref, a transient 429 (or any fetch error)
   * combined with a re-render loop could hammer the auth API at > 30 req/min
   * and lock the user out via rate limit.
   */
  const resolvedKeyRef = useRef<string | null>(null)

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

  // Resolve applicationId from publishableKey if provided and not already set.
  useEffect(() => {
    // If explicit applicationId is provided, no need to fetch.
    if (applicationIdProp || config?.applicationId) {
      const id = applicationIdProp ?? config?.applicationId ?? null
      setApplicationId(id)
      setAppSlug(appName ?? null)
      setResolutionStatus('ready')
      setApplicationContext({
        applicationId: id,
        appSlug: appName ?? null,
        isReady: true,
        applicationResolutionStatus: 'ready',
      })
      return
    }

    // No publishableKey → legacy `appName`-only (idle). Cross-app possible.
    if (!publishableKey) {
      setAppSlug(appName ?? null)
      setResolutionStatus('idle')
      setApplicationContext({
        applicationId: null,
        appSlug: appName ?? null,
        isReady: true,
        applicationResolutionStatus: 'idle',
      })
      return
    }

    // REG-1: if we've already attempted to resolve this publishableKey, do NOT
    // re-fetch. Even when the previous attempt failed (e.g. 429 rate limit), a
    // loop of re-attempts would make the situation worse. The consumer must
    // remount the provider (or reload the page) to retry — this is the same
    // contract already documented in the `.catch` log message below.
    if (resolvedKeyRef.current === publishableKey) {
      return
    }
    resolvedKeyRef.current = publishableKey

    // publishableKey provided → mark pending and fetch.
    setResolutionStatus('pending')
    setApplicationContext({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'pending',
    })

    let cancelled = false
    client
      .resolveApplicationByKey(publishableKey)
      .then(cfg => {
        if (cancelled) return
        setApplicationId(cfg.applicationId)
        setAppSlug(cfg.appSlug)
        setResolutionStatus('ready')
        setApplicationContext({
          applicationId: cfg.applicationId,
          appSlug: cfg.appSlug,
          isReady: true,
          applicationResolutionStatus: 'ready',
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // VULN-1: NO fail-open. Keep applicationId=null AND isReady=false so
        // downstream hooks (usePaymentHistory, etc.) can detect the failure
        // and refuse to run a cross-app query.
        logRef.current.error(
          `[pay-sdk] Failed to resolve application from publishableKey: ${message}. ` +
            `Scoped queries will be blocked (applicationResolutionStatus='failed'). ` +
            `Retry by refreshing the page or re-mounting the PayProvider.`
        )
        setApplicationId(null)
        setAppSlug(null)
        setResolutionStatus('failed')
        setApplicationContext({
          applicationId: null,
          appSlug: null,
          isReady: false,
          applicationResolutionStatus: 'failed',
        })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally resolve once per (client, publishableKey) pair
  }, [client, publishableKey, applicationIdProp, config?.applicationId])

  const isReady = resolutionStatus === 'ready' || resolutionStatus === 'idle'

  const resolvedPayWebUrl = useMemo(
    () => resolvePayWebUrl(payWebUrl, config?.apiUrl),
    [payWebUrl, config?.apiUrl]
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

  return <PayContext.Provider value={contextValue}>{children}</PayContext.Provider>
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
 * Silent fallback logger used when {@link usePayLogger} is called outside
 * a `<PayProvider>` (typical in isolated unit tests). Keeps components
 * usable without a provider while staying entirely silent — production
 * components MUST always render under a provider, so missing one is a
 * test-only concern, not a runtime concern.
 *
 * @internal
 */
const silentPayLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
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

export function usePay() {
  const { client } = usePayContext()
  const { payments, isLoading, error, setPayments, setLoading, setError, addPayment } =
    usePayStore()

  return {
    client,
    payments,
    isLoading,
    error,
    setPayments,
    setLoading,
    setError,
    addPayment,

    // Helper methods
    async createDonation(data: Parameters<typeof client.createDonation>[0]) {
      setLoading(true)
      setError(null)
      try {
        const result = await client.createDonation(data)
        addPayment(result.payment)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setLoading(false)
      }
    },

    async createPurchase(data: Parameters<typeof client.createPurchase>[0]) {
      setLoading(true)
      setError(null)
      try {
        const result = await client.createPurchase(data)
        addPayment(result.payment)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setLoading(false)
      }
    },

    async createSubscription(data: Parameters<typeof client.createSubscription>[0]) {
      setLoading(true)
      setError(null)
      try {
        const result = await client.createSubscription(data)
        addPayment(result.payment)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setLoading(false)
      }
    },

    async loadDonations(params?: Parameters<typeof client.getDonations>[0]) {
      setLoading(true)
      setError(null)
      try {
        const result = await client.getDonations(params)
        setPayments(result.payments)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setLoading(false)
      }
    },
  }
}
