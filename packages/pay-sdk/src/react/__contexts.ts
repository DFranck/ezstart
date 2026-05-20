/**
 * @internal
 *
 * React Context holding the per-`<PayProvider>` Zustand store instance.
 *
 * Split out of `pay-provider.tsx` so the bound store hooks (`usePayStore`,
 * `usePayStoreApi`, `usePayStoreSSR`) live in `pay-provider/public-hooks.ts`
 * and can be re-exported from `store.ts` without creating a runtime import
 * cycle with the provider implementation (the provider only imports the
 * `createPayStore` factory + this context, never the hooks).
 *
 * Not exported from the package — production consumers go through
 * {@link usePayStore} / {@link usePayStoreApi}.
 */
'use client'

import { createContext } from 'react'
import type { PayStoreApi } from './store.js'

export const PayStoreContext = createContext<PayStoreApi | null>(null)
