'use client'

import { apiCall, ApiError } from '@ezstart/api-sdk'
import { useEffect, useRef } from 'react'
import { logger } from '../../internal-logger.js'

/**
 * Outcome of the pre-handoff session revalidation.
 *
 * - `'live'`    — a fresh `GET /me` proved a live credential → proceed to the
 *   SSO handoff (Scenario 2).
 * - `'expired'` — a DEFINITIVE 401 (or a persisted flag with no credential) →
 *   drop the stale flag, render the form signed-out. Never a maybe.
 * - `'error'`   — a TRANSIENT failure (network blip, 5xx, offline) on a
 *   possibly-still-valid session → leave local state untouched (do NOT clear
 *   or broadcast logout), just abandon this attempt.
 *
 * @internal
 */
export type SessionLiveness = 'live' | 'expired' | 'error'

/** @internal */
export interface UseAuthedRedirectOptions {
  isAuthReady: boolean
  isAuthenticated: boolean
  resolvedRedirectUri: string | undefined
  appName: string
  /**
   * Confirm the ezauth session is actually LIVE — not just a persisted
   * `isAuthenticated` flag that outlived the httpOnly access cookie — via a
   * fresh `GET /me`. Returns a tri-state {@link SessionLiveness}: only a
   * DEFINITIVE `'expired'` (401) clears local state; a transient `'error'`
   * must NOT, so a `/me` blip never logs the user out of every tab.
   *
   * Called ONLY on the cross-origin path, BEFORE `POST /auth/sso/authorize`
   * (which itself requires a live cookie/Bearer via `verifyTokenMiddleware`).
   * The same-origin path skips it — the consumer's own `/dashboard`
   * `RequireAuth` re-checks on mount.
   */
  revalidateSession: () => Promise<SessionLiveness>
  /**
   * Clear the stale persisted `isAuthenticated` flag when
   * {@link UseAuthedRedirectOptions.revalidateSession} reports `'expired'`.
   * Flipping the flag to `false` re-renders the form into its signed-out state
   * (no "Verifying…" limbo) and, thanks to the effect guard, stops any further
   * handoff attempt. NEVER invoked on a transient `'error'`.
   */
  onStaleSession: () => void
}

/** Parse `resolvedRedirectUri` into an absolute URL, or `null` if malformed. */
function parseTarget(uri: string): URL | null {
  try {
    return new URL(uri, window.location.origin)
  } catch {
    return null
  }
}

/** Inputs for the one-shot cross-origin SSO handoff. */
interface SsoHandoffArgs {
  targetUrl: URL
  appName: string
  revalidate: () => Promise<SessionLiveness>
  onStale: () => void
  retryAfterRef: { current: number }
  isCancelled: () => boolean
  /** Latch this attempt as terminal so a teardown won't release the guard. */
  markCompleted: () => void
}

/**
 * Perform the cross-origin SSO handoff at most once per target.
 *
 * The leading `await Promise.resolve()` yields ONE microtask so a synchronous
 * React teardown (StrictMode mount→cleanup→mount, or a dep flicker) can flip
 * `cancelled` on a superseded attempt BEFORE it spends a `/me` round-trip.
 * That bounds the revalidation storm: among a burst of re-renders only the
 * surviving (last) attempt reaches the network.
 */
async function runSsoHandoff(args: SsoHandoffArgs): Promise<void> {
  const { targetUrl, appName, revalidate, onStale, retryAfterRef, isCancelled, markCompleted } =
    args

  await Promise.resolve()
  if (isCancelled()) return

  const liveness = await revalidate()
  if (isCancelled()) return

  if (liveness === 'error') {
    // Transient failure on a possibly-still-valid session — never clear local
    // state or broadcast logout on a maybe. Abandon this attempt; the user can
    // retry (reload) without being signed out of their other tabs.
    markCompleted()
    logger.warn('SSO handoff revalidation failed transiently; session left untouched')
    return
  }

  if (liveness === 'expired') {
    // Definitive 401 / no credential — the persisted flag outlived the session.
    // Drop it so the form renders signed-out; no `sso/authorize` is attempted
    // (it would only 401 and, unguarded, storm into a 429).
    markCompleted()
    onStale()
    return
  }

  // liveness === 'live' — genuine Scenario 2 handoff.
  markCompleted()
  try {
    const result = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
      appName: 'ezauth',
      method: 'POST',
      body: { app: appName, redirectUri: targetUrl.toString() },
    })
    if (isCancelled()) return
    const target = new URL(targetUrl.toString())
    target.searchParams.set('code', result.code)
    window.location.replace(target.toString())
  } catch (err) {
    // NEVER auto-retry (the one-shot guard blocks re-fires). On a 429, record
    // the Retry-After so a later target change cannot re-hit before it.
    if (ApiError.isApiError(err) && err.status === 429 && typeof err.retryAfter === 'number') {
      retryAfterRef.current = Date.now() + err.retryAfter * 1000
    }
    logger.warn(
      'SSO auto-handoff failed, falling back to manual sign-in:',
      err instanceof Error ? err.message : String(err)
    )
  }
}

/**
 * Auto-redirect a user who is already authenticated away from the sign-in
 * form.
 *
 * P1 UX bug (LOGIN-PAGE-NO-REDIRECT-IF-AUTHED): in cross-origin scenarios the
 * user can land on `/login` while their httpOnly cookie was not visible to SSR
 * (`getServerAuth()` returned null) but their localStorage carries a valid
 * user state from a previous session on the same domain. The store rehydrates
 * client-side with `isAuthenticated: true` and we redirect them onward.
 *
 * T02 fix: that persisted flag can outlive the 15-minute httpOnly access
 * cookie. `POST /auth/sso/authorize` requires a LIVE credential, so gating the
 * handoff purely on the flag fired a guaranteed 401 that — with no guard —
 * re-fired on every re-render into a 401 → 429 storm, leaving the consumer
 * callback code-less ("No authorization code found"). Defenses:
 *
 * 1. **Revalidate before handoff** (`revalidateSession`): a live `GET /me`
 *    proves the session. `'expired'` → clear the flag + render the form;
 *    `'error'` (transient) → leave state untouched; only `'live'` proceeds.
 * 2. **One-shot guard** (`attemptedRef`): the handoff fires at most once per
 *    resolved `${appName}|${target}`, immune to StrictMode double-invoke,
 *    store-subscription churn, the token-verification interval, and cross-tab
 *    rehydration. The latch is RELEASED in cleanup when the attempt was torn
 *    down before completing — otherwise a StrictMode mount→cleanup→mount (the
 *    Next.js dev default) would cancel the only committed handoff yet leave the
 *    latch set, stranding a LIVE user on `/login`.
 * 3. **Microtask yield** in `runSsoHandoff` bounds the `/me` storm: superseded
 *    attempts are cancelled before they hit the network.
 *
 * No auto-retry on failure; `Retry-After` honored on 429. Uses
 * `window.location.replace()` (not `router.push`) so the SDK stays free of a
 * `next/router` peer dep, `/login` leaves no history entry, and the
 * destination boots a fresh React tree.
 *
 * @internal
 */
export function useAuthedRedirect({
  isAuthReady,
  isAuthenticated,
  resolvedRedirectUri,
  appName,
  revalidateSession,
  onStaleSession,
}: UseAuthedRedirectOptions): void {
  // Latest-ref pattern: hold the (possibly unmemoized) callbacks without
  // widening the effect dep array — the effect must re-run on the real
  // triggers only, or a new closure identity each render would defeat the
  // one-shot guard below.
  const revalidateRef = useRef(revalidateSession)
  const onStaleRef = useRef(onStaleSession)
  useEffect(() => {
    revalidateRef.current = revalidateSession
    onStaleRef.current = onStaleSession
  })

  // One-shot guard keyed on `${appName}|${target}` — the handoff (and its
  // revalidation precheck) fires at most once per resolved target.
  const attemptedRef = useRef<string | null>(null)
  // Epoch (ms) before which a fresh handoff is refused after a 429.
  const retryAfterRef = useRef<number>(0)

  useEffect(() => {
    if (!isAuthReady) return
    if (!isAuthenticated) return
    if (typeof window === 'undefined') return
    if (!resolvedRedirectUri) return

    const targetUrl = parseTarget(resolvedRedirectUri)
    if (!targetUrl) return

    // Same-origin → direct redirect (consumer's own /dashboard route, store
    // already populated via persist). A stale flag simply bounces back to
    // /login via that route's RequireAuth — no authenticated API call here.
    if (targetUrl.origin === window.location.origin) {
      window.location.replace(resolvedRedirectUri)
      return
    }

    // Cross-origin SSO handoff — guarded so it never storms.
    const attemptKey = `${appName}|${targetUrl.toString()}`
    if (attemptedRef.current === attemptKey) return
    if (Date.now() < retryAfterRef.current) return
    attemptedRef.current = attemptKey

    let cancelled = false
    let completed = false
    void runSsoHandoff({
      targetUrl,
      appName,
      revalidate: () => revalidateRef.current(),
      onStale: () => onStaleRef.current(),
      retryAfterRef,
      isCancelled: () => cancelled,
      markCompleted: () => {
        completed = true
      },
    })
    return () => {
      cancelled = true
      // If this attempt was torn down before completing (StrictMode
      // mount→cleanup→mount, or a dep flicker), release the one-shot latch so
      // the immediate remount can retry — otherwise a LIVE user is stranded on
      // /login. A completed attempt keeps the latch (no storm, no re-fire).
      if (!completed && attemptedRef.current === attemptKey) {
        attemptedRef.current = null
      }
    }
  }, [isAuthReady, isAuthenticated, resolvedRedirectUri, appName])
}
