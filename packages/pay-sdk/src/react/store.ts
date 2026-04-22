import { create } from 'zustand'
import type { Payment } from '../core/types.js'

/**
 * Application context resolution lifecycle:
 * - `idle`: provider mounted without publishableKey and without applicationId
 *   (legacy `appName`-only path — cross-app queries possible, discouraged).
 * - `pending`: publishableKey provided, resolution in flight.
 * - `ready`: applicationId available (explicit prop or successful resolve).
 * - `failed`: publishableKey was provided but resolution threw (network/auth/etc.).
 *   Consumers MUST treat `failed` as "no scope available" and refuse to make
 *   scoped queries (to avoid cross-app leaks via silent downgrade).
 */
export type ApplicationResolutionStatus = 'idle' | 'pending' | 'ready' | 'failed'

export interface PayState {
  payments: Payment[]
  isLoading: boolean
  error: string | null
  /** Application id resolved from the publishable key (null until resolved). */
  applicationId: string | null
  /** Human-friendly application slug (null until resolved). */
  appSlug: string | null
  /**
   * `true` ONLY when `applicationResolutionStatus === 'ready'` or `'idle'`.
   * `false` while pending AND on resolution failure (prevents fail-open).
   */
  isReady: boolean
  /** Explicit resolution lifecycle — safer than `isReady` alone for RBAC gating. */
  applicationResolutionStatus: ApplicationResolutionStatus
  setPayments: (payments: Payment[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addPayment: (payment: Payment) => void
  clearError: () => void
  setApplicationContext: (ctx: {
    applicationId: string | null
    appSlug: string | null
    isReady: boolean
    applicationResolutionStatus: ApplicationResolutionStatus
  }) => void
}

export const usePayStore = create<PayState>(set => ({
  payments: [],
  isLoading: false,
  error: null,
  applicationId: null,
  appSlug: null,
  isReady: false,
  applicationResolutionStatus: 'idle',
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
      applicationResolutionStatus: 'idle' as ApplicationResolutionStatus,
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
