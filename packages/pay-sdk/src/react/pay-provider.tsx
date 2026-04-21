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
import { usePayStore } from './store.js'

interface PayContextValue {
  client: PayClient
  /**
   * Application id resolved from either `applicationId` config/prop or via
   * `resolveApplicationByKey(publishableKey)` on mount. `null` until resolved.
   */
  applicationId: string | null
  /** Human-friendly application slug (e.g. "ezbill"). `null` until resolved. */
  appSlug: string | null
  /** True once the application context is resolved (or explicitly provided). */
  isReady: boolean
}

const PayContext = createContext<PayContextValue | null>(null)

interface PayProviderProps {
  children: ReactNode
  /**
   * Legacy app-slug identifier. Kept for backward compatibility with existing
   * consumers. Prefer `applicationId` or `publishableKey` for new code.
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

  // Resolved application context (seeded from props if available, else fetched).
  const initialApplicationId = applicationIdProp ?? config?.applicationId ?? null
  const initialIsReady = initialApplicationId !== null
  const [applicationId, setApplicationId] = useState<string | null>(initialApplicationId)
  const [appSlug, setAppSlug] = useState<string | null>(
    initialApplicationId ? (appName ?? null) : null
  )
  const [isReady, setIsReady] = useState<boolean>(initialIsReady || !publishableKey)

  const setApplicationContext = usePayStore(state => state.setApplicationContext)

  // Resolve applicationId from publishableKey if provided and not already set.
  useEffect(() => {
    // If explicit applicationId is provided, no need to fetch.
    if (applicationIdProp || config?.applicationId) {
      setApplicationId(applicationIdProp ?? config?.applicationId ?? null)
      setAppSlug(appName ?? null)
      setIsReady(true)
      setApplicationContext({
        applicationId: applicationIdProp ?? config?.applicationId ?? null,
        appSlug: appName ?? null,
        isReady: true,
      })
      return
    }

    // No publishableKey → nothing to resolve, mark ready with null context.
    if (!publishableKey) {
      setAppSlug(appName ?? null)
      setIsReady(true)
      setApplicationContext({ applicationId: null, appSlug: appName ?? null, isReady: true })
      return
    }

    // Fetch config from /keys/config exactly once.
    let cancelled = false
    client
      .resolveApplicationByKey(publishableKey)
      .then(cfg => {
        if (cancelled) return
        setApplicationId(cfg.applicationId)
        setAppSlug(cfg.appSlug)
        setIsReady(true)
        setApplicationContext({
          applicationId: cfg.applicationId,
          appSlug: cfg.appSlug,
          isReady: true,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // Graceful degradation: log and mark ready with null context.
        // eslint-disable-next-line no-console -- opt-in warning for misconfigured SDK usage
        console.warn(
          `[pay-sdk] Failed to resolve application from publishableKey: ${message}. ` +
            `Falling back to legacy appName resolution.`
        )
        setAppSlug(appName ?? null)
        setIsReady(true)
        setApplicationContext({ applicationId: null, appSlug: appName ?? null, isReady: true })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally resolve once per (client, publishableKey) pair
  }, [client, publishableKey, applicationIdProp, config?.applicationId])

  const contextValue = useMemo(
    () => ({ client, applicationId, appSlug, isReady }),
    [client, applicationId, appSlug, isReady]
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
 * Convenience hook exposing only the resolved application context (id + slug + ready).
 *
 * @example
 * ```tsx
 * const { applicationId, appSlug, isReady } = useApplicationContext()
 * if (!isReady) return <Spinner />
 * ```
 */
export function useApplicationContext(): {
  applicationId: string | null
  appSlug: string | null
  isReady: boolean
} {
  const { applicationId, appSlug, isReady } = usePayContext()
  return { applicationId, appSlug, isReady }
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
