'use client'

import type { AuthLogger } from './auth-provider.js'
import { useAuthContext } from './auth-provider.js'
import { useAuthStore } from './store.js'

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

  const mode = store.getMode()

  /**
   * Redirect to the EZAuth login page.
   * Saves the current URL for post-login redirect.
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
      app: appName,
      redirect_uri: redirectUri,
      ...(additionalParams ?? {}),
    })

    const authUrl = `${webUrl}/login?${params.toString()}`
    window.location.href = authUrl
    return new Promise(() => {})
  }

  /**
   * Redirect to the EZAuth register page.
   */
  const register = (additionalParams?: Record<string, string>): Promise<never> => {
    const redirectUri = buildRedirectUri()

    const params = new URLSearchParams({
      app: appName,
      redirect_uri: redirectUri,
      ...(additionalParams ?? {}),
    })

    const authUrl = `${webUrl}/register?${params.toString()}`
    window.location.href = authUrl
    return new Promise(() => {})
  }

  const handleCallback = async (code: string) => {
    try {
      const authResult = await client.exchangeCode(code)

      if (mode === 'httpOnly') {
        store.setAuth(authResult.user, undefined, 'httpOnly', authResult.refresh_token)
      } else {
        store.setAuth(
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
    store.setLoggingOut(true)
    const rt = store.refreshToken
    await client.logout(rt || undefined)
    store.logout()
  }

  const verifyAndRefresh = async () => {
    if (mode === 'localStorage' && store.accessToken) {
      try {
        const user = await client.getCurrentUser(store.accessToken)
        store.updateUser(user)
        return user
      } catch (error: unknown) {
        log.error('Failed to refresh user:', error instanceof Error ? error.message : String(error))
        if ((error as { status?: number })?.status === 401) {
          store.logout()
        }
        throw error
      }
    } else if (mode === 'httpOnly') {
      try {
        const user = await client.getCurrentUser()
        store.updateUser(user)
        return user
      } catch (error: unknown) {
        log.error('Failed to refresh user:', error instanceof Error ? error.message : String(error))
        if ((error as { status?: number })?.status === 401) {
          store.logout()
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
    /** Auth scope: 'test'/'live' (single app), 'admin' (all apps), 'first-party' (ezauth web). */
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
