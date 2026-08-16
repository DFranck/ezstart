'use client'

import { useEffect } from 'react'
import { useAuth } from '@ezstart/auth-sdk'
import type { AuthUser } from '@ezstart/auth-sdk'

export interface UseAuthGateOptions {
  /**
   * Called when the auth store has hydrated AND the user is not authenticated.
   *
   * Typical implementation: `() => router.replace(`/${locale}/login`)`. The
   * caller owns the navigation primitive (next router, location.assign, etc.)
   * so this hook stays SDK-agnostic and easy to unit-test.
   */
  onRedirect: () => void
}

export interface UseAuthGateResult {
  /**
   * `true` once the Zustand persist hydration has completed (or the SSR
   * `initialUser` bootstrap synchronously marked the store ready). Use this
   * with `isAuthenticated` + `user` for the loading-state gate so the UI does
   * NOT show "you are signed out" content during the brief pre-hydration
   * window when `isAuthenticated` is still its default `false`.
   */
  isAuthReady: boolean
  isAuthenticated: boolean
  user: AuthUser | null
}

/**
 * Auth-redirect gate for protected client subtrees.
 *
 * Wraps the canonical pattern documented in
 * `.claude/rules/nextjs.md` §1.1 + `.claude/rules/standard-saas.md` §2.1:
 *
 * ```tsx
 * const { user, isAuthenticated, isAuthReady } = useAuth()
 * useEffect(() => {
 *   if (!isAuthReady) return            // ← wait for persist hydrate
 *   if (!isAuthenticated) router.replace('/login')
 * }, [isAuthReady, isAuthenticated, router])
 * ```
 *
 * Without the `isAuthReady` gate, cross-origin staging deployments hit a race
 * condition: SSR `getServerAuth()` returns `null` (cross-origin cookie is
 * impossible), the store boots with `isAuthenticated: false`, the redirect
 * effect fires immediately on first paint, the navigation completes BEFORE
 * Zustand persist's async `onRehydrateStorage` callback restores the user
 * from `localStorage`. Result: an authenticated user is bounced to `/login`
 * → re-authenticated → bounced to `/dashboard` → infinite loop.
 *
 * @example Use inside a protected client component:
 *
 * ```tsx
 * 'use client'
 * function DashboardClient() {
 *   const router = useRouter()
 *   const locale = useLocale()
 *   const { isAuthReady, isAuthenticated, user } = useAuthGate({
 *     onRedirect: () => router.replace(`/${locale}/login`),
 *   })
 *
 *   if (!isAuthReady || !isAuthenticated || !user) {
 *     return <Spinner variant="primary" size="lg" />
 *   }
 *
 *   // ...rest of dashboard
 * }
 * ```
 */
export function useAuthGate({ onRedirect }: UseAuthGateOptions): UseAuthGateResult {
  const { user, isAuthenticated, isAuthReady } = useAuth()

  useEffect(() => {
    if (!isAuthReady) return
    if (!isAuthenticated) {
      onRedirect()
    }
  }, [isAuthReady, isAuthenticated, onRedirect])

  return { isAuthReady, isAuthenticated, user }
}
