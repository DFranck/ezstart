'use client'

import { bumpLogoutEpoch } from '@ezstart/api-sdk/core'
import { toast } from 'sonner'
import type { AuthLogger } from './auth-provider.js'
import { useAuthContext, useAuthStore, useAuthStoreApi } from './auth-provider.js'

const noopLogger: AuthLogger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
}

/**
 * Per-call overrides for {@link useAuth}'s `logout()` orchestrator.
 * Every field falls back to the {@link AuthProvider}'s `logoutDefaults`,
 * which themselves fall back to English defaults.
 */
export interface LogoutOptions {
  /**
   * Override the post-logout redirect target. `false` disables the hard
   * redirect entirely (the consumer drives navigation).
   */
  redirectAfterLogout?: string | false
  /**
   * Override the consumer cleanup callback (React Query cache wipe,
   * WebSocket close, IndexedDB purge, etc.). Awaited before the toast +
   * redirect so async cleanup completes first.
   */
  onLogout?: () => void | Promise<void>
  /**
   * Override the toast labels. Pass localized strings here for non-EN
   * consumers — typically `getAuthTexts(locale, 'userMenu')`.
   */
  texts?: {
    signOutSuccess?: string
    signOutError?: string
  }
  /**
   * Skip the success toast (step 6). Useful when the calling component
   * shows its own confirmation UI (e.g. account-deletion banner).
   */
  silent?: boolean
}

/**
 * Safe localStorage key removal — Safari private mode + SSR + agent harness
 * environments all fail differently when localStorage is unavailable. Wrap
 * the call so a missing storage layer never throws past the logout flow.
 *
 * @internal
 */
function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage disabled / quota exceeded / private mode — non-fatal, the store
    // reset above is the source of truth.
  }
}

/**
 * Main auth hook providing state + actions.
 *
 * Must be used within an `<AuthProvider>`.
 */
export function useAuth(logger?: AuthLogger) {
  const log = logger ?? noopLogger
  const { client, appName, webUrl, scope, publishableKey, logoutDefaults } = useAuthContext()
  const store = useAuthStore()
  const storeApi = useAuthStoreApi()

  const mode = store.getMode()

  /**
   * Redirect to the EZAuth login page.
   * Saves the current URL for post-login redirect.
   *
   * Uses `?key=` (publishable key) when available for Clerk-like identification.
   * Falls back to `?app=` for first-party mode (ezauth web itself).
   *
   * **Theme propagation** — pass `additionalParams.theme` (values:
   * `'light' | 'dark' | 'system'`) to forward the consumer's current
   * color scheme to the ezauth auth pages. Callers typically pass
   * `theme: resolvedTheme` from `next-themes/useTheme()` so the ezauth
   * UI paints in the same scheme without a flash. EZAuth's middleware
   * validates the value and silently drops anything outside the
   * whitelist.
   */
  const login = (additionalParams?: Record<string, string>): Promise<never> => {
    // Save current URL for post-login redirect
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search + window.location.hash
      localStorage.setItem('ezauth_redirect_after_login', currentUrl)
    }

    // Build redirect URI from current origin + locale
    const redirectUri = buildRedirectUri()

    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      ...(additionalParams ?? {}),
    })

    // Use ?key= when a publishable key is configured (Clerk-like identification).
    // Fall back to ?app= for first-party mode (no key).
    if (publishableKey) {
      params.set('key', publishableKey)
    } else {
      params.set('app', appName)
    }

    const authUrl = `${webUrl}/login?${params.toString()}`
    window.location.href = authUrl
    return new Promise(() => {})
  }

  /**
   * Redirect to the EZAuth register page.
   *
   * Uses `?key=` (publishable key) when available for Clerk-like identification.
   * Falls back to `?app=` for first-party mode. Accepts the same
   * `additionalParams.theme` propagation as {@link login}.
   */
  const register = (additionalParams?: Record<string, string>): Promise<never> => {
    const redirectUri = buildRedirectUri()

    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      ...(additionalParams ?? {}),
    })

    if (publishableKey) {
      params.set('key', publishableKey)
    } else {
      params.set('app', appName)
    }

    const authUrl = `${webUrl}/register?${params.toString()}`
    window.location.href = authUrl
    return new Promise(() => {})
  }

  const handleCallback = async (code: string) => {
    try {
      const authResult = await client.exchangeCode(code)

      if (mode === 'httpOnly') {
        storeApi
          .getState()
          .setAuth(authResult.user, undefined, 'httpOnly', authResult.refresh_token)
      } else {
        storeApi
          .getState()
          .setAuth(
            authResult.user,
            authResult.access_token,
            'localStorage',
            authResult.refresh_token
          )
      }

      return authResult.user
    } catch (error) {
      log.error('Auth callback error:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Full SDK-pro logout orchestration (cf. standard-sdk-dx.md §11ter).
   *
   * Runs the canonical 8-step flow in order:
   *
   *   1. POST /api/auth/logout — server revokes the refresh token, clears
   *      the httpOnly cookie, writes the audit log entry. Best-effort:
   *      a network/server failure NEVER blocks the local cleanup, so the
   *      user always lands in the unauthenticated state.
   *   2. Reset the per-Provider Zustand store (`user: null`,
   *      `isAuthenticated: false`, `isLoggingOut: false`). This wraps the
   *      cross-tab BroadcastChannel call too (see `store.ts`), which
   *      satisfies step 4 in the same swing.
   *   3. Explicit `localStorage.removeItem(storageKey)` — the persist
   *      middleware normally rewrites the key with the now-logged-out
   *      partial state, but a hard wipe is sturdier (removes any field
   *      `partialize` might have skipped, drops legacy v0 schemas).
   *   4. Cross-tab broadcast — handled inline by step 2's wrapped store
   *      action. No extra call needed; the wrapper guards `postMessage`
   *      with try/catch so an HMR-closed channel doesn't throw past us.
   *   5. Run the consumer's `onLogout` hook (provider default OR per-call
   *      override). Awaited so async cleanup (React Query cache, IndexedDB
   *      drop, WebSocket close) completes before the redirect. Throws are
   *      logged + swallowed: consumer code must never block the logout.
   *   6. Toast confirmation. Skipped when `options.silent` is true (e.g.
   *      account-deletion shows its own banner).
   *   7. Hard `window.location.assign()` redirect — drops every in-memory
   *      React state along with the now-revoked session. `router.push()`
   *      would keep React mounted and risk surfacing stale "logged-in" UI
   *      for one render cycle. Skipped when `redirectAfterLogout === false`.
   *   8. `isLoggingOut: true` is set BEFORE step 1 and reset by step 2's
   *      `store.logout()` action. Subscribers (UserMenu, dashboards, etc.)
   *      can read `useAuth().isLoggingOut` to render a loading state.
   *
   * @example
   * ```tsx
   * // Default flow — uses provider defaults
   * await logout()
   *
   * // One-shot override (e.g. localized redirect)
   * await logout({ redirectAfterLogout: '/fr/goodbye', texts: localizedTexts })
   * ```
   */
  const logout = async (options: LogoutOptions = {}) => {
    // CRIT-2 wiring (Wave C) — MUST run BEFORE any other logout side-effect.
    // Snapshots the module-level logout epoch in `@ezstart/api-sdk` so any
    // refresh in-flight (started before this call) will discard its
    // resulting tokens instead of silently re-hydrating the store
    // post-logout. Without this call, the race is:
    //   T+0   apiCall() -> 401 -> refresh() starts
    //   T+50  user clicks Logout -> store cleared
    //   T+100 refresh resolves with fresh tokens -> store re-hydrated
    //   T+101 user is "re-logged-in" without ever knowing.
    // Bumping the epoch here lets the refresh helper detect the change
    // at completion and drop the fresh tokens on the floor.
    bumpLogoutEpoch()

    // Resolve the effective config — per-call override > provider default > English default.
    const redirectTarget =
      options.redirectAfterLogout !== undefined
        ? options.redirectAfterLogout
        : logoutDefaults.redirectAfterLogout
    const consumerOnLogout = options.onLogout ?? logoutDefaults.onLogout
    const successText = options.texts?.signOutSuccess ?? logoutDefaults.texts.signOutSuccess
    const errorText = options.texts?.signOutError ?? logoutDefaults.texts.signOutError

    // Step 8 — set isLoggingOut so subscribed UI can render a spinner.
    storeApi.getState().setLoggingOut(true)

    let serverFailed = false

    // Step 1 — server revoke. Best-effort: keep going even on failure so
    // the local store / persist / broadcast cleanup still runs and the
    // user lands in the unauthenticated state.
    try {
      const rt = storeApi.getState().refreshToken
      await client.logout(rt || undefined)
    } catch (err) {
      serverFailed = true
      log.warn(
        '[auth-sdk] logout server call failed, continuing local cleanup',
        err instanceof Error ? err.message : String(err)
      )
    }

    // Steps 2 + 4 — local store reset (also broadcasts cross-tab via the
    // wrapped action installed by `createAuthStore`).
    storeApi.getState().logout()

    // Step 3 — explicit localStorage purge. Defensive: persist normally
    // overwrites with the logged-out blob, but a `removeItem` is sturdier.
    safeRemoveLocalStorage(logoutDefaults.storageKey)

    // Step 5 — consumer cleanup hook. Errors must NEVER block the redirect.
    if (consumerOnLogout) {
      try {
        await consumerOnLogout()
      } catch (err) {
        log.warn(
          '[auth-sdk] onLogout consumer hook threw',
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    // Step 6 — toast confirmation. Server failures still toast as success
    // because the LOCAL cleanup succeeded; only true local-side failures
    // (which we do not have here, the steps above never throw out) would
    // surface the error toast. Skipped when caller passes `silent: true`.
    if (!options.silent) {
      if (serverFailed) {
        // Surface the server failure as a soft warning (info), not a hard
        // error — the user IS signed out locally, the server just couldn't
        // be reached to revoke the refresh token. Most consumers prefer a
        // success toast here; switch to error if observability requires it.
        toast.success(successText)
      } else {
        toast.success(successText)
      }
    }

    // Step 7 — hard redirect. Skipped when `redirectAfterLogout === false`
    // (consumer drives navigation, e.g. via router.push to a localized URL).
    if (redirectTarget !== false && typeof window !== 'undefined') {
      window.location.assign(redirectTarget)
    }

    // Returned for callers that want to surface their own UI on failure.
    // Note: serverFailed=true does NOT mean "logout failed" — the user IS
    // logged out locally; the server simply couldn't be reached.
    return { serverFailed, errorText }
  }

  const verifyAndRefresh = async () => {
    const current = storeApi.getState()
    if (mode === 'localStorage' && current.accessToken) {
      try {
        const user = await client.getCurrentUser(current.accessToken)
        storeApi.getState().updateUser(user)
        return user
      } catch (error: unknown) {
        log.error('Failed to refresh user:', error instanceof Error ? error.message : String(error))
        if ((error as { status?: number })?.status === 401) {
          storeApi.getState().logout()
        }
        throw error
      }
    } else if (mode === 'httpOnly') {
      try {
        const user = await client.getCurrentUser()
        storeApi.getState().updateUser(user)
        return user
      } catch (error: unknown) {
        log.error('Failed to refresh user:', error instanceof Error ? error.message : String(error))
        if ((error as { status?: number })?.status === 401) {
          storeApi.getState().logout()
        }
        throw error
      }
    }
    return null
  }

  return {
    // State
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    isLoggingIn: store.isLoggingIn,
    isLoggingOut: store.isLoggingOut,
    isAuthReady: store.isAuthReady,
    mode,
    /**
     * Auth context scope (legacy shape, kept for backwards compat):
     * - 'test'/'live' = single-app context
     * - 'admin' = platform-wide context
     * - 'first-party' = ezauth's own pages
     * Prefer deriving single-app vs platform-wide from `appName === '*'` directly.
     */
    scope,
    /** Raw publishable key string, or undefined if none configured. */
    publishableKey,

    // Actions
    login,
    register,
    logout,
    handleCallback,
    verifyAndRefresh,
    setLoggingIn: store.setLoggingIn,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the OAuth redirect URI from the current browser URL.
 * Detects locale prefix and builds: `{origin}/{locale}/auth/callback`
 */
function buildRedirectUri(): string {
  if (typeof window === 'undefined') return '/auth/callback'
  const pathParts = window.location.pathname.split('/')
  const maybeLocale = pathParts[1]
  const hasLocalePrefix = maybeLocale !== undefined && /^[a-z]{2,3}$/.test(maybeLocale)
  const localePrefix = hasLocalePrefix ? `/${maybeLocale}` : ''
  return `${window.location.origin}${localePrefix}/auth/callback`
}
