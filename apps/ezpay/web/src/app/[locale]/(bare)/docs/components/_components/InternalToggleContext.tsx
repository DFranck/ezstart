'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthStore } from '@ezstart/auth-sdk'

const STORAGE_KEY = 'ezpay-docs-show-internal'

interface InternalToggleContextValue {
  /** True when the superadmin has toggled the "Show internal" switch on. */
  showInternal: boolean
  /** True when the active user has the `superadmin` global role. */
  isSuperadmin: boolean
  /** Mutator — no-op when the user is not a superadmin. */
  setShowInternal: (next: boolean) => void
}

const Context = createContext<InternalToggleContextValue | null>(null)

/**
 * Provider that exposes the "Show internal components" toggle state to
 * every client component under `/docs/components`. The state is gated by
 * the `superadmin` global role and persisted in `localStorage` so the
 * preference survives reloads.
 *
 * Non-superadmin users always observe `showInternal: false` and any
 * mutation attempt is a no-op — the safety check is colocated with the
 * mutator so individual consumers cannot accidentally bypass it.
 */
export function DocsInternalToggleProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  const isSuperadmin = useMemo(() => Boolean(user?.globalRoles?.includes('superadmin')), [user])

  const [showInternal, setShowInternalState] = useState(false)

  // Hydrate from localStorage post-mount — keeps SSR output stable (always
  // `false`) while honoring the user's persisted preference once we know
  // they are a superadmin. Wrapped in try/catch because Safari private mode
  // and SSR-disabled storage layers throw on `getItem`.
  useEffect(() => {
    if (!isSuperadmin) {
      // Defensive: if the user just logged out / lost the role, force off.
      setShowInternalState(false)
      return
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setShowInternalState(true)
    } catch {
      // Storage unavailable — ignore, default to off.
    }
  }, [isSuperadmin])

  const setShowInternal = useCallback(
    (next: boolean) => {
      if (!isSuperadmin) return
      setShowInternalState(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // Storage unavailable — keep in-memory state, persistence is best-effort.
      }
    },
    [isSuperadmin]
  )

  const value = useMemo<InternalToggleContextValue>(
    () => ({ showInternal: isSuperadmin && showInternal, isSuperadmin, setShowInternal }),
    [isSuperadmin, showInternal, setShowInternal]
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

/**
 * Read the "Show internal" toggle state. When called outside the provider
 * (e.g. nested route that did not mount it), returns a safe default with
 * the toggle off — the docs UI degrades to the public surface.
 */
export function useInternalToggle(): InternalToggleContextValue {
  return (
    useContext(Context) ?? {
      showInternal: false,
      isSuperadmin: false,
      setShowInternal: () => {},
    }
  )
}
