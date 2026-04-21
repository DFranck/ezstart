import { create } from 'zustand'
import type { Payment } from '../core/types.js'

export interface PayState {
  payments: Payment[]
  isLoading: boolean
  error: string | null
  /** Application id resolved from the publishable key (null until resolved). */
  applicationId: string | null
  /** Human-friendly application slug (null until resolved). */
  appSlug: string | null
  /** True once the app context has been resolved (or resolution failed). */
  isReady: boolean
  setPayments: (payments: Payment[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addPayment: (payment: Payment) => void
  clearError: () => void
  setApplicationContext: (ctx: {
    applicationId: string | null
    appSlug: string | null
    isReady: boolean
  }) => void
}

export const usePayStore = create<PayState>(set => ({
  payments: [],
  isLoading: false,
  error: null,
  applicationId: null,
  appSlug: null,
  isReady: false,
  setPayments: payments => set({ payments }),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),
  addPayment: payment => set(state => ({ payments: [payment, ...state.payments] })),
  clearError: () => set({ error: null }),
  setApplicationContext: ctx => set(ctx),
}))

// SSR-safe store hook
export function usePayStoreSSR() {
  if (typeof window === 'undefined') {
    return {
      payments: [],
      isLoading: false,
      error: null,
      applicationId: null,
      appSlug: null,
      isReady: false,
      setPayments: () => {},
      setLoading: () => {},
      setError: () => {},
      addPayment: () => {},
      clearError: () => {},
      setApplicationContext: () => {},
    }
  }
  return usePayStore()
}
