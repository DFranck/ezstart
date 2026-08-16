/**
 * Public hooks reading the per-`<PayProvider>` Zustand store via React
 * Context. Extracted so `store.ts` can re-export them (keeping the public
 * import path `@ezstart/pay-sdk` → `./react/store.js` unchanged) without an
 * import cycle with `pay-provider.tsx`.
 *
 * Behaviour + signatures are preserved verbatim from the previous
 * module-level `usePayStore` / `usePayStoreSSR` so consumers and SDK
 * components (`usePay()`, `useApplicationContext()`) keep working unchanged.
 *
 * @module @ezstart/pay-sdk/react/pay-provider/public-hooks
 */
'use client'

import { useCallback, useContext } from 'react'
import { useStore } from 'zustand'
import { PayStoreContext } from '../__contexts.js'
import type { PayState, PayStoreApi } from '../store.js'

/**
 * Read the per-Provider Zustand store via React Context.
 *
 * - `usePayStore()` → returns the full state (subscribes to all changes)
 * - `usePayStore(selector)` → subscribes to the selected slice only
 *
 * Throws when called outside `<PayProvider>` to surface SSR-incompatible
 * setups (the legacy module-level `usePayStore.getState()` pattern is
 * removed — for imperative access use {@link usePayStoreApi}).
 */
export function usePayStore(): PayState
export function usePayStore<T>(selector: (state: PayState) => T): T
export function usePayStore<T>(selector?: (state: PayState) => T): T | PayState {
  const store = useContext(PayStoreContext)
  if (!store) {
    throw new Error('usePayStore must be used within a <PayProvider>')
  }
  return useStore(store, (selector ?? ((s: PayState) => s)) as (state: PayState) => T)
}

/**
 * Internal accessor — read the store instance from the current Provider for
 * imperative `getState()` / `setState()` access (e.g. closures handed to
 * non-React code, or tests asserting the synced application context).
 */
export function usePayStoreApi(): PayStoreApi {
  const store = useContext(PayStoreContext)
  if (!store) {
    throw new Error('usePayStoreApi must be used within a <PayProvider>')
  }
  return store
}

/**
 * SSR-safe variant — returns the full state. Kept for backwards
 * compatibility; prefer {@link usePayStore} which is now SSR-correct by
 * construction (the store is created with the resolved application context
 * at mount time, so subscribers never observe a transient `idle` flash).
 *
 * @deprecated Use `usePayStore()` directly.
 */
export function usePayStoreSSR(): PayState {
  return usePayStore()
}

/**
 * Read the active store snapshot inside a React event handler or effect
 * without subscribing. Useful for closures passed outside the React render
 * path. Returns a stable `() => PayState` getter bound to the current store.
 */
export function usePayStoreGetSnapshot(): () => PayState {
  const store = usePayStoreApi()
  return useCallback(() => store.getState(), [store])
}
