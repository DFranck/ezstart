'use client'

import type { StoreApi, UseBoundStore } from 'zustand'
import { createBasePayStore, type PayState, type PayStoreInitialState } from './store/state.js'

// Re-export the state shape + lifecycle type so existing import paths keep
// working unchanged (consumers + tests rely on these exact paths).
export type { PayState, PayStoreInitialState } from './store/state.js'
export type { ApplicationResolutionStatus } from './store/state.js'

// Re-export the bound store hooks. They live in `pay-provider/public-hooks.ts`
// (Context-bound) but are surfaced from here so the public barrels
// (`src/index.ts`, `react/index.ts`) can keep importing `usePayStore` /
// `usePayStoreSSR` from `./store.js` — the public import path is unchanged.
export {
  usePayStore,
  usePayStoreApi,
  usePayStoreGetSnapshot,
  usePayStoreSSR,
} from './pay-provider/public-hooks.js'

/**
 * Pay store bound hook returned by {@link createPayStore}. Standard zustand
 * vanilla store API (`getState`, `setState`, `subscribe`) plus the bound-hook
 * call signature.
 */
export type PayStoreApi = UseBoundStore<StoreApi<PayState>>

/**
 * Options accepted by {@link createPayStore}. Currently just the SSR-bootstrap
 * initial application context (resolved synchronously by `<PayProvider>` from
 * its props). Kept as an object so future per-store config (storage key,
 * etc.) can be added without a breaking signature change.
 */
export interface CreatePayStoreOptions {
  /**
   * Initial application context — resolved synchronously by `<PayProvider>`
   * from its `applicationId` / `publishableKey` / legacy `appName` props so
   * subscribers see the SSR-correct value on the first render.
   */
  initial?: PayStoreInitialState
}

/**
 * Factory that returns a fresh pay store. **Always** call this through
 * `<PayProvider>` (which wraps the call in `useState(() => createPayStore(...))`
 * to guarantee a single store per React tree). Direct module-level usage is
 * forbidden — it breaks Next.js SSR (the server and client end up with
 * different stores and React throws an hydration mismatch).
 *
 * @example
 * ```tsx
 * const [store] = useState(() => createPayStore({ initial: { applicationId } }))
 * ```
 */
export function createPayStore(options: CreatePayStoreOptions = {}): PayStoreApi {
  return createBasePayStore(options.initial)
}
