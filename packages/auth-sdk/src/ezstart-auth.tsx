/**
 * Monorepo wrapper — pre-wires core auth client with @ezstart/config URLs.
 *
 * This file is the ONLY place in auth-sdk that imports from @ezstart/* packages.
 * It re-exports a backward-compatible `AuthClient` class and `createAuthClient`
 * factory that auto-detect the API URL from the monorepo config.
 */

'use client'

import { getApiUrl, getWebUrl, getCurrentEnvironment, isEzstartDomain } from '@ezstart/config/urls'
import { apiCall, ApiError, parseApiError } from '@ezstart/api-sdk'
import { logger } from '@ezstart/logger'
import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
import { CoreAuthClient } from './core/auth-client.js'
import type { AuthMode, AuthUser, EmailOverrideRequest } from './core/types.js'
import { useAuthStore } from './react/store.js'

// ---------------------------------------------------------------------------
// Re-export the logger as the AuthLogger for the react provider
// ---------------------------------------------------------------------------

export { logger as ezstartLogger }

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function getEZAuthUrls() {
  const env = getCurrentEnvironment()
  return {
    apiBaseURL: `${getApiUrl('ezauth', env)}/api/auth`,
    webBaseURL: getWebUrl('ezauth', env),
  }
}

/**
 * Build an ezauth web URL for a given path and locale.
 */
export function getEzauthUrl(path: string, locale: string = 'en', app?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = `${getWebUrl('ezauth')}/${locale}${normalizedPath}`
  const url = new URL(base)
  if (app) url.searchParams.set('app', app)
  return url.toString()
}

// ---------------------------------------------------------------------------
// AuthMode detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect the appropriate auth mode based on environment and domain.
 */
export function detectAuthMode(): AuthMode {
  if (typeof window === 'undefined') return 'httpOnly'

  const currentHost = window.location.hostname
  const env = getCurrentEnvironment()

  if (env === 'local' || currentHost === 'localhost' || currentHost.startsWith('127.0.0.1')) {
    return 'localStorage'
  }

  const apiUrl = getApiUrl('ezauth', env)
  const apiHost = new URL(apiUrl).hostname

  const getRootDomain = (hostname: string) => {
    const parts = hostname.split('.')
    if (parts.length <= 2) return hostname
    return parts.slice(-2).join('.')
  }

  const currentRootDomain = getRootDomain(currentHost)
  const apiRootDomain = getRootDomain(apiHost)

  if (currentRootDomain === apiRootDomain) {
    return 'httpOnly'
  }

  return 'jwt'
}

/**
 * Resolve auth mode based on environment and configuration.
 */
export function resolveAuthMode(
  configuredMode: AuthMode,
  hostname: string,
  env: string,
  jwtPublicKey?: string
): AuthMode {
  if (env === 'local') {
    if (configuredMode !== 'localStorage') {
      logger.warn(`[AuthSDK] Forced localStorage mode in localhost`, {
        configured: configuredMode,
        reason: "httpOnly/jwt cookies don't work cross-port",
        domain: hostname,
      })
    }
    return 'localStorage'
  }

  if (configuredMode === 'httpOnly' && isEzstartDomain(hostname)) {
    return 'httpOnly'
  }

  if (configuredMode === 'httpOnly' && !isEzstartDomain(hostname)) {
    logger.warn(`[AuthSDK] httpOnly mode on non-ezstart domain!`, {
      domain: hostname,
      fallback: 'localStorage',
    })
    return 'localStorage'
  }

  if (configuredMode === 'jwt') {
    if (!jwtPublicKey) {
      logger.error(`[EZAuth SDK] JWT mode requires jwtPublicKey!`)
      return 'localStorage'
    }
    return 'jwt'
  }

  if (configuredMode === 'localStorage' && env === 'production') {
    logger.warn(`[AuthSDK] localStorage mode in production`, {
      domain: hostname,
      warning: 'Vulnerable to XSS attacks',
    })
  }

  return configuredMode
}

// ---------------------------------------------------------------------------
// Backward-compatible AuthClient (extends CoreAuthClient with monorepo extras)
// ---------------------------------------------------------------------------

export interface AuthClientConfig {
  baseURL?: string
  appName: string
  redirectUri: string
  /** Optional API key for server-to-server authentication. */
  apiKey?: string
}

export class AuthClient extends CoreAuthClient {
  private webBaseURL: string
  private _appName: string
  private _redirectUri: string

  constructor(config: AuthClientConfig) {
    const urls = getEZAuthUrls()
    const apiUrl = config.baseURL || urls.apiBaseURL

    const apiKey = config.apiKey ?? process.env.NEXT_PUBLIC_EZAUTH_API_KEY

    super({
      apiUrl,
      appName: config.appName,
      redirectUri: config.redirectUri,
      ...(apiKey ? { apiKey } : {}),
    })

    this.webBaseURL = urls.webBaseURL
    this._appName = config.appName
    this._redirectUri = config.redirectUri
  }

  /** Redirect to EZAuth login page. */
  redirectToLogin(additionalParams?: Record<string, string>) {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search + window.location.hash
      localStorage.setItem('ezauth_redirect_after_login', currentUrl)
    }

    const params = new URLSearchParams({
      app: this._appName,
      redirect_uri: this._redirectUri,
      ...additionalParams,
    })

    const authUrl = `${this.webBaseURL}/login?${params.toString()}`
    window.location.href = authUrl
  }

  /** Redirect to EZAuth register page. */
  redirectToRegister(additionalParams?: Record<string, string>) {
    const params = new URLSearchParams({
      app: this._appName,
      redirect_uri: this._redirectUri,
      ...additionalParams,
    })

    const authUrl = `${this.webBaseURL}/register?${params.toString()}`
    window.location.href = authUrl
  }

  /** Change password with parseApiError from @ezstart/api-sdk. */
  override async changePassword(
    data: { currentPassword?: string; newPassword: string },
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(`${this.getApiUrl()}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(parseApiError(result) || 'Failed to change password')
    }
  }

  /** Quick sign up with parseApiError. */
  override async quickSignUp(data: {
    username: string
    email: string
    app: string
    locale?: string
    promoCode?: string
    emailOverride?: EmailOverrideRequest
  }): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const response = await fetch(`${this.getApiUrl()}/quick-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(parseApiError(result) || 'Quick signup failed')
    }

    const payload = result.data ?? result
    return {
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }
  }

  /**
   * Create a cross-domain SSO handoff URL.
   */
  async createSsoHandoff({ targetUrl, app }: { targetUrl: string; app: string }): Promise<string> {
    if (typeof window !== 'undefined') {
      const sameOriginTarget = new URL(targetUrl)
      if (sameOriginTarget.origin === window.location.origin) {
        return targetUrl
      }
    }

    let data: { code: string; expiresIn: number }
    try {
      data = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
        appName: 'ezauth',
        method: 'POST',
        body: { app, redirectUri: targetUrl },
      })
    } catch (err) {
      if (ApiError.isApiError(err)) {
        throw new Error(err.message || 'Failed to initiate SSO handoff')
      }
      throw err
    }

    const target = new URL(targetUrl)
    const locale = target.pathname.split('/')[1] || 'en'
    const callbackPath = `/${locale}/auth/sso-callback`
    const next = target.pathname + target.search

    const callbackUrl = new URL(callbackPath, target.origin)
    callbackUrl.searchParams.set('code', data.code)
    callbackUrl.searchParams.set('next', next)
    return callbackUrl.toString()
  }
}

/** Helper function to create AuthClient with auto-configured URLs. */
export function createAuthClient(config: Omit<AuthClientConfig, 'baseURL'> & { baseURL?: string }) {
  return new AuthClient(config)
}

// ---------------------------------------------------------------------------
// Backward-compatible AuthProvider (wraps react/AuthProvider with monorepo config)
// ---------------------------------------------------------------------------

interface EzstartAuthContextValue {
  client: AuthClient
  appName: string
}

const EzstartAuthContext = createContext<EzstartAuthContextValue | null>(null)

interface EzstartAuthProviderProps {
  children: ReactNode
  appName: string
  authMode?: AuthMode
  jwtPublicKey?: string
  /** @deprecated Use authMode instead */
  useHttpOnlyCookies?: boolean
}

export function EzstartAuthProvider({
  children,
  appName,
  authMode = 'localStorage',
  jwtPublicKey,
  useHttpOnlyCookies,
}: EzstartAuthProviderProps) {
  const store = useAuthStore()

  // Handle deprecated prop
  if (useHttpOnlyCookies !== undefined) {
    logger.warn(`[AuthSDK] useHttpOnlyCookies is deprecated`, {
      migration: 'Use authMode="httpOnly" instead',
    })
    authMode = useHttpOnlyCookies ? 'httpOnly' : 'localStorage'
  }

  const client = useMemo(() => {
    const getRedirectUri = () => {
      if (typeof window === 'undefined') return '/auth/callback'
      const pathParts = window.location.pathname.split('/')
      const maybeLocale = pathParts[1]
      const hasLocalePrefix = maybeLocale && /^[a-z]{2,3}$/.test(maybeLocale)
      const localePrefix = hasLocalePrefix ? `/${maybeLocale}` : ''
      return `${window.location.origin}${localePrefix}/auth/callback`
    }
    const redirectUri = getRedirectUri()

    return createAuthClient({
      appName,
      redirectUri,
    })
  }, [appName])

  // Auto-detect and set mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hostname = window.location.hostname
    const env = getCurrentEnvironment()
    const resolvedMode = resolveAuthMode(authMode, hostname, env, jwtPublicKey)
    const currentMode = store.getMode()

    logger.debug('[AuthProvider] Mode resolved', {
      configured: authMode,
      resolved: resolvedMode,
      current: currentMode,
      env,
    })

    if (currentMode !== resolvedMode) {
      if (store.isAuthenticated) {
        const user = store.user
        if (user) {
          store.setAuth(
            user,
            store.accessToken || undefined,
            resolvedMode,
            store.refreshToken || undefined
          )
        }
      }
    }
  }, [authMode, appName, jwtPublicKey, store])

  // Auto-verify token on mount and periodically
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return
    }

    let intervalId: NodeJS.Timeout
    let refreshing = false

    const tryRefresh = async (): Promise<boolean> => {
      const rt = store.refreshToken
      if (!rt || refreshing) return false
      refreshing = true
      try {
        const result = await client.refreshTokens(rt)
        store.setTokens(result.accessToken, result.refreshToken)
        store.updateUser(result.user)
        logger.debug('[AuthProvider] Silently refreshed tokens')
        return true
      } catch (err) {
        logger.debug('[AuthProvider] Silent refresh failed, logging out', {
          error: err instanceof Error ? err.message : String(err),
        })
        store.logout()
        return false
      } finally {
        refreshing = false
      }
    }

    const verifyToken = async () => {
      const mode = store.getMode()

      if (mode === 'localStorage' && store.accessToken) {
        const isValid = await client.verifyToken(store.accessToken)
        if (!isValid) {
          const refreshed = await tryRefresh()
          if (!refreshed) {
            logger.debug('[AuthProvider] Token invalid and refresh failed, logging out')
          }
        }
      } else if (mode === 'localStorage' && !store.accessToken && store.refreshToken) {
        await tryRefresh()
      } else if (mode === 'httpOnly') {
        try {
          const user = await client.getCurrentUser()
          if (user) {
            store.updateUser(user)
          }
        } catch (error: unknown) {
          const err = error as { message?: string; status?: number }
          const isAuthFailure =
            err?.message?.includes('401') ||
            err?.status === 401 ||
            err?.message?.toLowerCase().includes('unauthorized')

          if (isAuthFailure) {
            const refreshed = await tryRefresh()
            if (!refreshed) {
              logger.debug(
                '[AuthProvider] httpOnly auth failure (401) and refresh failed, logging out'
              )
            }
          } else {
            logger.debug('[AuthProvider] httpOnly fetch error (not 401, keeping session)', {
              error: err?.message,
            })
          }
        }
      }
    }

    verifyToken()
    intervalId = setInterval(verifyToken, 5 * 60 * 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.accessToken, store.refreshToken, client])

  // Proactive token refresh
  const proactiveTimerRef = useMemo(() => ({ current: null as NodeJS.Timeout | null }), [])

  useEffect(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current)
      proactiveTimerRef.current = null
    }

    const token = store.accessToken
    if (!token || !store.refreshToken) return

    const getTokenExpiry = (t: string): number | null => {
      try {
        const parts = t.split('.')
        if (parts.length < 2 || !parts[1]) return null
        const payload = JSON.parse(atob(parts[1]))
        return payload.exp ? payload.exp * 1000 : null
      } catch {
        return null
      }
    }

    const expiry = getTokenExpiry(token)
    if (!expiry) return

    const now = Date.now()
    const delay = expiry - 60_000 - now

    if (delay <= 0) return

    proactiveTimerRef.current = setTimeout(async () => {
      const rt = store.refreshToken
      if (!rt) return
      try {
        const result = await client.refreshTokens(rt)
        store.setTokens(result.accessToken, result.refreshToken)
        store.updateUser(result.user)
      } catch {
        // Fallback interval will retry
      }
    }, delay)

    return () => {
      if (proactiveTimerRef.current) {
        clearTimeout(proactiveTimerRef.current)
        proactiveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.accessToken, store.refreshToken, client])

  return (
    <EzstartAuthContext.Provider value={{ client, appName }}>
      {children}
    </EzstartAuthContext.Provider>
  )
}

/** Hook to access the monorepo-specific auth context. */
export function useEzstartAuthContext() {
  const context = useContext(EzstartAuthContext)
  if (!context) {
    throw new Error('useEzstartAuthContext must be used within EzstartAuthProvider (AuthProvider)')
  }
  return context
}

/**
 * Backward-compatible useAuth that works with the monorepo AuthProvider.
 * Provides redirect-based login/register using the monorepo URL config.
 */
export function useEzstartAuth() {
  const { client } = useEzstartAuthContext()
  const store = useAuthStore()

  const mode = store.getMode()

  const login = (additionalParams?: Record<string, string>): Promise<never> => {
    client.redirectToLogin(additionalParams)
    return new Promise(() => {})
  }

  const register = (): Promise<never> => {
    client.redirectToRegister()
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
      logger.error('Auth callback error:', error instanceof Error ? error.message : String(error))
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
        logger.error(
          'Failed to refresh user:',
          error instanceof Error ? error.message : String(error)
        )
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
        logger.error(
          'Failed to refresh user:',
          error instanceof Error ? error.message : String(error)
        )
        if ((error as { status?: number })?.status === 401) {
          store.logout()
        }
        throw error
      }
    }
    return null
  }

  return {
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    isLoggingIn: store.isLoggingIn,
    isLoggingOut: store.isLoggingOut,
    isAuthReady: store.isAuthReady,
    mode,

    login,
    register,
    logout,
    handleCallback,
    verifyAndRefresh,
    setLoggingIn: store.setLoggingIn,
  }
}
