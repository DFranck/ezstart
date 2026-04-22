'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { Payment, PaymentType, PaymentStatus } from '../../core/types.js'

interface PaymentFilters {
  type?: PaymentType
  status?: PaymentStatus
  dateFrom?: string
  dateTo?: string
}

interface UsePaymentHistoryParams {
  userId?: string
  /**
   * Ezauth Application id to scope the listing to. When omitted, the hook
   * falls back to the `applicationId` resolved by the enclosing `<PayProvider>`
   * (via `publishableKey` or explicit prop). Pass an empty string to opt
   * out of scoping entirely (e.g. a superadmin cross-app view).
   */
  applicationId?: string
  limit?: number
  offset?: number
  filters?: PaymentFilters
  autoLoad?: boolean
}

/**
 * Load a scoped page of payments for the current user / application.
 *
 * The request is scoped by `applicationId` (prop > PayProvider context). This
 * is what prevents payments from leaking across apps in `<BillingDashboard>`.
 *
 * Safety:
 * - When the PayProvider's `applicationResolutionStatus === 'failed'` (e.g.
 *   transient error resolving a publishable key) the hook REFUSES to fetch
 *   and surfaces an explicit error state. This prevents a silent downgrade
 *   to a cross-app `scope=mine` query (VULN-1).
 * - Each fetch is guarded by an `AbortController` AND a monotonic request id.
 *   When the effective applicationId changes (app switch) or the component
 *   unmounts, the in-flight request is aborted and any late response from a
 *   previous scope is discarded (VULN-2).
 *
 * The scoping value (resolved applicationId) is part of the effect's
 * dependency array — when the caller switches to a different application,
 * the list is refetched and state is reset.
 *
 * @example
 * // Scoped implicitly by the enclosing <PayProvider publishableKey="...">
 * const { payments } = usePaymentHistory({ userId: user._id })
 *
 * @example
 * // Explicit override (e.g. superadmin impersonation)
 * const { payments } = usePaymentHistory({ userId, applicationId: 'app_123' })
 */
export function usePaymentHistory(params: UsePaymentHistoryParams = {}) {
  const { client, applicationId: ctxApplicationId, applicationResolutionStatus } = usePayContext()
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { userId, applicationId, limit = 20, offset = 0, filters, autoLoad = true } = params

  // Resolve effective applicationId:
  // - Explicit prop wins (including empty string opt-out)
  // - Otherwise fall back to the PayProvider context (may be null on bootstrap)
  const effectiveApplicationId =
    applicationId !== undefined ? applicationId : (ctxApplicationId ?? undefined)

  // Monotonic request id — every call bumps it. We only apply the response if
  // the id we captured at call-start is still the latest at resolution time.
  // This handles the case where the client does not support AbortSignal (or an
  // abort race leaks a "completed" promise).
  const requestIdRef = useRef(0)
  // AbortController for the in-flight request — reset on each new call.
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadPayments = useCallback(async () => {
    // VULN-1: refuse to fetch when the publishableKey resolve failed.
    if (applicationResolutionStatus === 'failed' && applicationId === undefined) {
      setPayments([])
      setTotal(0)
      setIsLoading(false)
      setError(
        'Billing context unavailable: the application could not be resolved. ' +
          'Refresh the page or verify the publishable key.'
      )
      return
    }

    // Abort any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const myRequestId = ++requestIdRef.current
    const myApplicationId = effectiveApplicationId

    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getPayments({
        userId,
        applicationId: myApplicationId,
        limit,
        offset,
        type: filters?.type,
        status: filters?.status,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        signal: controller.signal,
      })
      // VULN-2: ignore stale responses (slow app A returning after app B switch).
      if (
        controller.signal.aborted ||
        myRequestId !== requestIdRef.current ||
        myApplicationId !== effectiveApplicationId
      ) {
        return
      }
      setPayments(result.payments)
      setTotal(result.total)
    } catch (err) {
      if (controller.signal.aborted || myRequestId !== requestIdRef.current) {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load payment history')
    } finally {
      if (myRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [
    client,
    userId,
    effectiveApplicationId,
    applicationResolutionStatus,
    applicationId,
    limit,
    offset,
    filters?.type,
    filters?.status,
    filters?.dateFrom,
    filters?.dateTo,
  ])

  useEffect(() => {
    if (!autoLoad) return

    // Defer fetch while the provider is still resolving the publishable key.
    if (applicationResolutionStatus === 'pending') {
      return
    }

    loadPayments()

    return () => {
      // Cancel the in-flight request when deps change or the component unmounts.
      abortControllerRef.current?.abort()
    }
  }, [autoLoad, loadPayments, applicationResolutionStatus])

  return {
    payments,
    total,
    isLoading,
    error,
    reload: loadPayments,
  }
}
