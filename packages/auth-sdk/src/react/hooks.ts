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
  const { client } = useAuthContext()
  const store = useAuthStore()

  const mode = store.getMode()

  const login = (additionalParams?: Record<string, string>): Promise<never> => {
    // Save current URL for post-login redirect
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search + window.location.hash
      localStorage.setItem('ezauth_redirect_after_login', currentUrl)
    }

    const apiUrl = client.getApiUrl()
    // Derive web URL from API URL by removing /api/auth suffix
    // e.g. https://api.example.com/api/auth → https://web.example.com
    // For the redirect we need the web URL, but we only have the API URL in core.
    // Use the redirectToLogin pattern with the web URL.
    // Note: In the monorepo wrapper, this is overridden with proper URL resolution.
    const params = new URLSearchParams({
      app: client.getAppName(),
      ...(additionalParams ?? {}),
    })

    // The core client doesn't know the web URL, so this is a placeholder.
    // The monorepo wrapper overrides this via the ezstart-specific AuthProvider.
    log.warn(
      '[useAuth] login() redirect not available in core-only mode. Use the monorepo wrapper.'
    )
    return new Promise(() => {})
  }

  const register = (): Promise<never> => {
    log.warn(
      '[useAuth] register() redirect not available in core-only mode. Use the monorepo wrapper.'
    )
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
    isAuthReady: store.isAuthReady,
    mode,

    // Actions
    login,
    register,
    logout,
    handleCallback,
    verifyAndRefresh,
    setLoggingIn: store.setLoggingIn,
  }
}
