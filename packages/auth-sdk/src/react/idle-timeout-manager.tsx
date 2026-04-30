'use client'

/**
 * Internal Provider child that bridges {@link useIdleTimeout} with the
 * canonical logout flow exposed by {@link useAuth}.
 *
 * Lives in its own file (instead of inline in `auth-provider.tsx`) to keep
 * the import graph clean: `auth-provider.tsx` already exports the hooks
 * `hooks.ts` reads from, so `auth-provider.tsx` cannot itself import
 * `useAuth` without a circular module-load dance. This child component
 * sits one level below — it imports `useAuth` freely.
 *
 * Renders nothing.
 */

import { useCallback, useMemo, useRef } from 'react'
import { useAuth } from './hooks.js'
import {
  defaultIdleWarningTexts,
  dismissIdleWarning,
  type IdleWarningTexts,
  showIdleSignedOutToast,
  showIdleWarning,
} from './idle-warning-toast.js'
import { useIdleTimeout } from './use-idle-timeout.js'

export interface IdleTimeoutManagerProps {
  /** Idle window in milliseconds. Falsy → no-op. */
  idleMs?: number | null
  /** Time before logout when the warning shows. Defaults to 60s. */
  warningMs?: number
  /** Watched DOM events (defaults to mouse/keyboard/touch/scroll/focus). */
  events?: readonly string[]
  /** Localized labels (English defaults applied upstream). */
  texts?: IdleWarningTexts
}

/**
 * Mount the idle-timeout side effect inside the AuthProvider tree.
 *
 * Behavior:
 * - When `idleMs` is falsy → fully no-op (no listeners, no timers).
 * - When the user is unauthenticated → fully no-op (the hook gates on
 *   `isAuthenticated`).
 * - When the warning fires → surface a sonner toast with a "Stay signed
 *   in" CTA wired to `reset`.
 * - When the timeout fires → call `useAuth().logout()` (8-step flow) AND
 *   surface the post-logout "Signed out due to inactivity" toast.
 */
export function IdleTimeoutManager(props: IdleTimeoutManagerProps): null {
  const { idleMs, warningMs, events, texts } = props
  const { logout } = useAuth()

  // Stable text bundle — the upstream Provider already merges English
  // defaults, but we accept `undefined` here to keep the manager usable
  // standalone (tests, future consumers).
  const resolvedTexts = useMemo<IdleWarningTexts>(() => texts ?? defaultIdleWarningTexts, [texts])

  // Hold the latest `reset` so the warning callback can extend the
  // session without reading a stale closure.
  const resetRef = useRef<(() => void) | null>(null)

  const handleWarning = useCallback(
    (remainingMs: number) => {
      showIdleWarning({
        remainingMs,
        onStay: () => {
          resetRef.current?.()
        },
        texts: resolvedTexts,
      })
    },
    [resolvedTexts]
  )

  const handleWarningClear = useCallback(() => {
    dismissIdleWarning()
  }, [])

  const handleTimeout = useCallback(async () => {
    // Dismiss the warning toast (if still up) BEFORE the logout flow
    // surfaces its own success toast, so the two don't overlap.
    dismissIdleWarning()
    try {
      await logout()
    } finally {
      // Always surface the inactivity hint, even if the local logout
      // threw past us. The hook's own try/catch already swallows errors
      // — this is just defense in depth.
      showIdleSignedOutToast(resolvedTexts)
    }
  }, [logout, resolvedTexts])

  const { reset } = useIdleTimeout({
    idleMs,
    warningMs,
    events,
    onWarning: handleWarning,
    onWarningClear: handleWarningClear,
    onTimeout: handleTimeout,
  })

  // Keep the ref pointed at the latest reset callback identity. Stable in
  // practice (the hook returns a memoized callback) but defensive against
  // future churn.
  resetRef.current = reset

  return null
}
