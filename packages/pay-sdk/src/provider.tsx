'use client'

import React, { createContext, useContext, useEffect, type ReactNode } from 'react'
import { PayClient } from './client.js'
import { usePayStore } from './store.js'
import type { PayClientConfig } from './types.js'

interface PayContextValue {
  client: PayClient
}

const PayContext = createContext<PayContextValue | null>(null)

interface PayProviderProps {
  children: ReactNode
  client: PayClient
}

export function PayProvider({ children, client }: PayProviderProps) {
  return <PayContext.Provider value={{ client }}>{children}</PayContext.Provider>
}

export function usePayContext() {
  const context = useContext(PayContext)
  if (!context) {
    throw new Error('usePayContext must be used within a PayProvider')
  }
  return context
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
