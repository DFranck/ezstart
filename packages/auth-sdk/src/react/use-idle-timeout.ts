'use client'

/**
 * Auto-logout after a configurable period of user inactivity.
 *
 * Pattern:
 * - Watch a small set of DOM events (mouse, keyboard, touch, scroll, focus)
 *   to detect activity. Each activity event reschedules both timers.
 * - A `setTimeout` is scheduled `idleMs - warningMs` after the last activity
 *   to surface the warning toast (default 60s before auto-logout).
 * - A second `setTimeout` is scheduled `idleMs` after the last activity to
 *   fire the canonical logout flow.
 *
 * The hook is a no-op when:
 * - `enabled === false` (consumer opt-out)
 * - The user is not authenticated (`isAuthenticated === false`)
 * - `idleMs` is missing or non-positive (treat as disabled)
 *
 * Defensive against:
 * - SSR (every browser API is guarded by `typeof window !== 'undefined'`)
 * - HMR / StrictMode unmount (event listeners + timers cleaned up in the
 *   effect return; no global state)
 * - Consumer callback failures (every `try/catch` keeps the timer chain alive)
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from './auth-provider.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Default DOM events watched for activity. */
export const DEFAULT_IDLE_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'focus',
] as const

export interface UseIdleTimeoutOptions {
  /**
   * Master switch. When `false`, the hook is a no-op (no listeners, no
   * timers). Defaults to `true` — the caller is expected to gate the hook
   * via `idleMs` instead (passing 0 / null / undefined disables it too).
   */
  enabled?: boolean
  /**
   * Total inactivity window in milliseconds before the auto-logout fires.
   * Pass `null` / `undefined` / `0` to disable.
   *
   * Recommended values:
   * - `15 * 60 * 1000` (15 minutes — security-focused dashboards)
   * - `30 * 60 * 1000` (30 minutes — lax / consumer apps)
   */
  idleMs?: number | null
  /**
   * How long before the auto-logout the warning toast surfaces, in
   * milliseconds. Defaults to `60_000` (60 seconds).
   *
   * If `warningMs >= idleMs`, the warning fires immediately on mount and
   * the auto-logout follows shortly after.
   */
  warningMs?: number
  /**
   * Override the watched DOM events. Defaults to {@link DEFAULT_IDLE_EVENTS}.
   * The first matching event in a burst resets both timers.
   */
  events?: readonly string[]
  /**
   * Called when the warning timer fires. Receives the milliseconds
   * remaining until the auto-logout.
   *
   * Wired by the Provider to `showIdleWarning(...)` from
   * `idle-warning-toast.tsx`. Consumers can pass a custom callback to
   * surface their own UI.
   */
  onWarning?: (remainingMs: number) => void
  /**
   * Called when the activity reset clears the warning before the
   * auto-logout fires. Wired by the Provider to `dismissIdleWarning()`.
   */
  onWarningClear?: () => void
  /**
   * Called when the idle period elapses. Wired by the Provider to a
   * `useAuth().logout()` call followed by `showIdleSignedOutToast()`.
   *
   * The Provider's wiring is async (the logout flow awaits the server
   * revoke + consumer cleanup) but the hook does NOT await — it fires
   * the callback and lets it run in the background. Failing to await
   * here is intentional: the timer fired, the user IS logged out from
   * a UX standpoint regardless of how long the cleanup takes.
   */
  onTimeout?: () => void | Promise<void>
}

/**
 * Return value — a stable callable used by the warning toast's
 * "Stay signed in" CTA to reschedule the idle window.
 */
export type UseIdleTimeoutReturn = {
  /** Reschedule both timers as if a fresh activity event had fired. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Wire the auto-logout-on-inactivity behaviour. MUST be used inside an
 * `<AuthProvider>` (reads `isAuthenticated` from the store).
 *
 * Returns a `{ reset }` object — the consumer hands `reset` to the warning
 * toast's "Stay signed in" CTA so the user can extend their session
 * without faking a mouse event.
 *
 * @example
 * ```tsx
 * const { reset } = useIdleTimeout({
 *   idleMs: 15 * 60 * 1000,
 *   onWarning: remainingMs =>
 *     showIdleWarning({ remainingMs, onStay: reset, texts }),
 *   onTimeout: () => {
 *     void logout()
 *     showIdleSignedOutToast(texts)
 *   },
 * })
 * ```
 */
export function useIdleTimeout(options: UseIdleTimeoutOptions = {}): UseIdleTimeoutReturn {
  const {
    enabled = true,
    idleMs,
    warningMs = 60_000,
    events = DEFAULT_IDLE_EVENTS,
    onWarning,
    onWarningClear,
    onTimeout,
  } = options

  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // Refs ensure the rescheduling logic never closes over stale callback
  // values from the render that registered the listener.
  const onWarningRef = useRef(onWarning)
  const onWarningClearRef = useRef(onWarningClear)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onWarningRef.current = onWarning
  }, [onWarning])
  useEffect(() => {
    onWarningClearRef.current = onWarningClear
  }, [onWarningClear])
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  // Live "reset all timers" handle. Updated each time the effect reruns
  // so the stable public `reset` callback always invokes the latest
  // scheduler. Null when the hook is in a no-op state (disabled / SSR /
  // unauthenticated).
  const activityRef = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
    activityRef.current?.()
  }, [])

  useEffect(() => {
    // Bail-out conditions — every one of these makes the hook a strict no-op.
    if (!enabled) return
    if (typeof window === 'undefined') return
    if (!isAuthenticated) return
    if (!idleMs || idleMs <= 0) return

    let warningTimer: ReturnType<typeof setTimeout> | null = null
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null
    let warningFired = false

    const clearTimers = () => {
      if (warningTimer !== null) {
        clearTimeout(warningTimer)
        warningTimer = null
      }
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer)
        timeoutTimer = null
      }
    }

    const scheduleTimers = () => {
      clearTimers()
      warningFired = false

      // Edge: warningMs >= idleMs → fire warning immediately, then logout
      // after the (possibly tiny) remaining window. Keeps the contract
      // that the warning ALWAYS fires before the timeout (even compressed).
      const warningDelay = Math.max(0, idleMs - warningMs)

      warningTimer = setTimeout(() => {
        warningTimer = null
        warningFired = true
        try {
          onWarningRef.current?.(Math.min(warningMs, idleMs))
        } catch {
          // Consumer callback errors must NEVER break the timeout chain.
        }
      }, warningDelay)

      timeoutTimer = setTimeout(() => {
        timeoutTimer = null
        try {
          // Fire-and-forget — the hook does NOT await the logout flow.
          // The timer fired, the user IS logged out from a UX standpoint;
          // the async cleanup (server revoke, BroadcastChannel, etc.)
          // runs in the background.
          void onTimeoutRef.current?.()
        } catch {
          // Same defensive posture as above.
        }
      }, idleMs)
    }

    const onActivity = () => {
      // If the warning had fired, dismiss it before rescheduling so the
      // toast doesn't outlive the next idle window.
      if (warningFired) {
        try {
          onWarningClearRef.current?.()
        } catch {
          // Non-fatal.
        }
      }
      scheduleTimers()
    }

    activityRef.current = onActivity
    scheduleTimers()

    // Register listeners. `passive: true` keeps scroll smooth on mobile;
    // `capture: true` catches focus events that don't bubble.
    for (const event of events) {
      try {
        window.addEventListener(event, onActivity, { passive: true, capture: true })
      } catch {
        // Browser refused the listener (extremely rare, e.g. CSP-locked
        // sandbox iframe) — skip silently.
      }
    }

    return () => {
      clearTimers()
      for (const event of events) {
        try {
          window.removeEventListener(event, onActivity, { capture: true })
        } catch {
          // Defensive — listener may have never been added.
        }
      }
      activityRef.current = null
    }
  }, [enabled, isAuthenticated, idleMs, warningMs, events])

  return { reset }
}
