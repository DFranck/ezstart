'use client'

import type { AuthLogger } from './auth-provider.js'
import { useAuthContext, useAuthStore, useAuthStoreApi } from './auth-provider.js'

const noopLogger: AuthLogger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
}

/**
 * Main auth hook providing state + actions.
 *
 * Must be used within an `<AuthProvider>`.
 */
export function useAuth(logger?: AuthLogger) {
  const log = logger ?? noopLogger
  const { client, appName, webUrl, scope, publishableKey } = useAuthContext()
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

  const logout = async () => {
    storeApi.getState().setLoggingOut(true)
    const rt = storeApi.getState().refreshToken
    await client.logout(rt || undefined)
    storeApi.getState().logout()
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
