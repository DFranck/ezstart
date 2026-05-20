'use client'

import { apiCall } from '@ezstart/api-sdk'
import { useEffect } from 'react'
import { logger } from '../../internal-logger.js'

/** @internal */
export interface UseAuthedRedirectOptions {
  isAuthReady: boolean
  isAuthenticated: boolean
  resolvedRedirectUri: string | undefined
  appName: string
}

/**
 * Auto-redirect a user who is already authenticated away from the sign-in
 * form.
 *
 * P1 UX bug (LOGIN-PAGE-NO-REDIRECT-IF-AUTHED): in cross-origin scenarios
 * (e.g. `ezauth-git-staging-ezstart.vercel.app`) the user can land on
 * `/login` while their httpOnly cookie was not visible to SSR
 * (`getServerAuth()` returned null) but their localStorage carries a valid
 * user state from a previous session on the same domain. The store
 * rehydrates client-side with `isAuthenticated: true`, but without this
 * guard the form sat there waiting for the user to type credentials they
 * already have. Redirect them straight to the dashboard.
 *
 * - Wait for `isAuthReady` so we don't race the persist rehydration on
 *   the very first render (would briefly think the user is signed out).
 * - `window.location.replace()` (not `router.push`) so:
 *     · the SDK stays free of a `next/router` peer dep
 *     · `/login` does not stay in browser history (back-button safe)
 *     · the destination boots with a fresh React tree (no stale state)
 *
 * @internal
 */
export function useAuthedRedirect({
  isAuthReady,
  isAuthenticated,
  resolvedRedirectUri,
  appName,
}: UseAuthedRedirectOptions): void {
  useEffect(() => {
    if (!isAuthReady) return
    if (!isAuthenticated) return
    if (typeof window === 'undefined') return
    if (!resolvedRedirectUri) return

    // Same-origin → direct redirect (consumer's own /dashboard route, store
    // already populated via persist). Cross-origin → MUST do an SSO handoff
    // first : POST /auth/sso/authorize to generate a one-shot auth code, then
    // redirect with `?code=...` so the consumer's `/auth/callback` can exchange
    // it. Without this step the consumer lands on its callback empty-handed and
    // shows "No authorization code found" (cf. FIX-EZSTART-SSO-LOGIN-FLOW).
    let cancelled = false
    const targetUrl = (() => {
      try {
        return new URL(resolvedRedirectUri, window.location.origin)
      } catch {
        return null
      }
    })()
    if (!targetUrl) return

    const isSameOrigin = targetUrl.origin === window.location.origin
    if (isSameOrigin) {
      window.location.replace(resolvedRedirectUri)
      return
    }

    void (async () => {
      try {
        const result = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
          appName: 'ezauth',
          method: 'POST',
          body: { app: appName, redirectUri: targetUrl.toString() },
        })
        if (cancelled) return
        const target = new URL(targetUrl.toString())
        target.searchParams.set('code', result.code)
        window.location.replace(target.toString())
      } catch (err) {
        // Fall through to render the form so the user has a recovery path.
        logger.warn(
          'SSO auto-handoff failed, falling back to manual sign-in:',
          err instanceof Error ? err.message : String(err)
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthReady, isAuthenticated, resolvedRedirectUri, appName])
}
