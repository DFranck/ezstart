'use client'

import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { Payment } from '../../core/types.js'

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

/**
 * SSR-bootstrap-able slice of {@link PayState}. The `<PayProvider>` resolves
 * these values synchronously from its props (explicit `applicationId` /
 * `publishableKey` / legacy `appName`) and hands them to the factory so the
 * store boots with the SSR-correct application context on the **very first
 * render** — no transient `{ isReady: false, applicationResolutionStatus: 'idle' }`
 * flash between mount and the post-mount resolution effect.
 */
export interface PayStoreInitialState {
  applicationId?: string | null
  appSlug?: string | null
  isReady?: boolean
  applicationResolutionStatus?: ApplicationResolutionStatus
}

/**
 * Create the base zustand store (state + actions) for the pay store. Unlike
 * the auth store there is no persist middleware nor cross-tab broadcast — the
 * pay store is a pure in-memory cache scoped to the `<PayProvider>` instance.
 *
 * @internal — composed by `createPayStore`, not exported from the package.
 */
export function createBasePayStore(
  initial: PayStoreInitialState = {}
): UseBoundStore<StoreApi<PayState>> {
  const {
    applicationId = null,
    appSlug = null,
    isReady = false,
    applicationResolutionStatus = 'idle',
  } = initial

  return create<PayState>(set => ({
    payments: [],
    isLoading: false,
    error: null,
    applicationId,
    appSlug,
    isReady,
    applicationResolutionStatus,
    setPayments: payments => set({ payments }),
    setLoading: isLoading => set({ isLoading }),
    setError: error => set({ error }),
    addPayment: payment => set(state => ({ payments: [payment, ...state.payments] })),
    clearError: () => set({ error: null }),
    setApplicationContext: ctx => set(ctx),
  }))
}
