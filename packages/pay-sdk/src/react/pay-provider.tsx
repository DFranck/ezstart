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
import { PayClient } from '../core/pay-client.js'
import type { PayClientConfig } from '../core/types.js'
import { usePayStore, type ApplicationResolutionStatus } from './store.js'

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
}: PayProviderProps) {
  // Use refs so the client always calls the latest callbacks without re-creating the client
  const getTokenRef = useRef(getToken ?? config?.getToken)
  getTokenRef.current = getToken ?? config?.getToken

  const onTokenRefreshRef = useRef(onTokenRefresh ?? config?.onTokenRefresh)
  onTokenRefreshRef.current = onTokenRefresh ?? config?.onTokenRefresh

  const onAuthFailureRef = useRef(onAuthFailure ?? config?.onAuthFailure)
  onAuthFailureRef.current = onAuthFailure ?? config?.onAuthFailure

  const client = useMemo(() => {
    return new PayClient({
      appName,
      applicationId: applicationIdProp ?? config?.applicationId,
      apiUrl: config?.apiUrl ?? '',
      ...config,
      getToken: () => getTokenRef.current?.() ?? null,
      onTokenRefresh: () => onTokenRefreshRef.current?.() ?? Promise.resolve(null),
      onAuthFailure: () => onAuthFailureRef.current?.(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are handled via refs
  }, [appName, applicationIdProp, config])

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
      // eslint-disable-next-line no-console -- dev-only deprecation error for SDK consumers
      console.error(
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
        // eslint-disable-next-line no-console -- visible misconfig / transient error signal
        console.error(
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

  const contextValue = useMemo(
    () => ({
      client,
      applicationId,
      appSlug,
      isReady,
      applicationResolutionStatus: resolutionStatus,
    }),
    [client, applicationId, appSlug, isReady, resolutionStatus]
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
export function useApplicationContext(): {
  applicationId: string | null
  appSlug: string | null
  isReady: boolean
  applicationResolutionStatus: ApplicationResolutionStatus
} {
  const { applicationId, appSlug, isReady, applicationResolutionStatus } = usePayContext()
  return { applicationId, appSlug, isReady, applicationResolutionStatus }
}

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
