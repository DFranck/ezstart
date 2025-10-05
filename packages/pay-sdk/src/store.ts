import { create } from 'zustand'
import type { Payment } from './types.js'

export interface PayState {
  payments: Payment[]
  isLoading: boolean
  error: string | null
  setPayments: (payments: Payment[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addPayment: (payment: Payment) => void
  clearError: () => void
}

export const usePayStore = create<PayState>(set => ({
  payments: [],
  isLoading: false,
  error: null,
  setPayments: payments => set({ payments }),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),
  addPayment: payment => set(state => ({ payments: [payment, ...state.payments] })),
  clearError: () => set({ error: null }),
}))

// SSR-safe store hook
export function usePayStoreSSR() {
  if (typeof window === 'undefined') {
    return {
      payments: [],
      isLoading: false,
      error: null,
      setPayments: () => {},
      setLoading: () => {},
      setError: () => {},
      addPayment: () => {},
      clearError: () => {},
    }
  }
  return usePayStore()
}
