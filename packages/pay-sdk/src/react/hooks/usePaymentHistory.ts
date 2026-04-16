'use client'

import { useCallback, useEffect, useState } from 'react'
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
  limit?: number
  offset?: number
  filters?: PaymentFilters
  autoLoad?: boolean
}

export function usePaymentHistory(params: UsePaymentHistoryParams = {}) {
  const { client } = usePayContext()
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { userId, limit = 20, offset = 0, filters, autoLoad = true } = params

  const loadPayments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getPayments({
        userId,
        limit,
        offset,
        type: filters?.type,
        status: filters?.status,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
      })
      setPayments(result.payments)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history')
    } finally {
      setIsLoading(false)
    }
  }, [
    client,
    userId,
    limit,
    offset,
    filters?.type,
    filters?.status,
    filters?.dateFrom,
    filters?.dateTo,
  ])

  useEffect(() => {
    if (autoLoad) {
      loadPayments()
    }
  }, [autoLoad, loadPayments])

  return {
    payments,
    total,
    isLoading,
    error,
    reload: loadPayments,
  }
}
