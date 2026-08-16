/**
 * Public hooks that read the `<AuthProvider>` React Context.
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4). All hooks here are
 * re-exported from `auth-provider.tsx` so the public barrel import path
 * (`@ezstart/auth-sdk` → `./auth-provider.js`) is unchanged. Behaviour and
 * signatures (including the `useAuthStore` overloads) are preserved verbatim.
 *
 * @module @ezstart/auth-sdk/react/auth-provider/public-hooks
 */
'use client'

import { useCallback, useContext } from 'react'
import { useStore } from 'zustand'
import { AuthContext, AuthStoreContext } from '../__contexts.js'
import type { AuthState, AuthStoreApi } from '../store.js'

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

/**
 * Returns the env-aware API URL resolved by the nearest `<AuthProvider>`.
 * Use this inside components that already live below `<AuthProvider>` to
 * avoid duplicating URL resolution logic.
 *
 * @example
 * ```tsx
 * const apiUrl = useAuthApiUrl()
 * const { data } = useMaintenanceStatus({ apiUrl })
 * ```
 */
export function useAuthApiUrl(): string {
  return useAuthContext().apiUrl
}

/**
 * Read the per-Provider Zustand store via React Context. Throws when
 * called outside of `<AuthProvider>` to surface SSR setup mistakes.
 *
 * @example
 * ```tsx
 * const user = useAuthStoreSelector(s => s.user)
 * ```
 */
export function useAuthStoreSelector<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreSelector must be used within <AuthProvider>')
  }
  return useStore(store, selector)
}

/**
 * Bound hook reading the per-Provider Zustand store via React Context.
 * Throws when called outside `<AuthProvider>` to surface SSR-incompatible
 * setups (the legacy module-level `useAuthStore.getState()` pattern is
 * removed — for imperative access use {@link useAuthStoreApi} or
 * {@link useAuthStoreGetSnapshot}).
 *
 * - `useAuthStore()` → returns the full state (subscribes to all changes)
 * - `useAuthStore(selector)` → subscribes to a slice
 */
export function useAuthStore(): AuthState
export function useAuthStore<T>(selector: (state: AuthState) => T): T
export function useAuthStore<T>(selector?: (state: AuthState) => T): T | AuthState {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStore must be used within <AuthProvider>')
  }
  return useStore(store, (selector ?? ((s: AuthState) => s)) as (state: AuthState) => T)
}

/**
 * Internal accessor — read the store instance from the current Provider.
 * Used by SDK components that need imperative `getState()`/`setState()`
 * access (e.g. closures passed to non-React code).
 */
export function useAuthStoreApi(): AuthStoreApi {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreApi must be used within <AuthProvider>')
  }
  return store
}

/**
 * SSR-safe variant — returns the full state. Kept for backwards
 * compatibility; prefer {@link useAuthStore} which is now SSR-correct
 * by construction (the store is created with `initialUser` at mount time).
 *
 * @deprecated Use `useAuthStore()` directly.
 */
export function useAuthStoreSSR(): AuthState {
  return useAuthStore()
}

/**
 * Read the active store snapshot **inside a React event handler or
 * effect** without subscribing. Useful for closures passed outside the
 * React render path (e.g. `getToken={() => useAuthStoreGetState().accessToken}`
 * is wrong; instead use `const get = useAuthStoreGetSnapshot()` once and
 * pass `getToken={() => get().accessToken}`).
 */
export function useAuthStoreGetSnapshot(): () => AuthState {
  const store = useAuthStoreApi()
  return useCallback(() => store.getState(), [store])
}
