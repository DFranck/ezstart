'use client'
import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react'
import { AuthClient, createAuthClient } from './client.js'
import { useAuthStore, type AuthMode } from './store.js'
import { getCurrentEnvironment, isEzstartDomain } from '@ezstart/config'
import { logger } from '@ezstart/logger'

interface AuthContextValue {
  client: AuthClient
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  appName: string
  authMode?: AuthMode // 🆕 Replaces useHttpOnlyCookies (default: 'localStorage')
  jwtPublicKey?: string // 🆕 Required if authMode='jwt'

  // @deprecated Use authMode instead
  useHttpOnlyCookies?: boolean
}

/**
 * Determine the actual auth mode to use based on environment and configuration
 *
 * Auto-detection rules:
 * 1. localhost → Always localStorage (httpOnly doesn't work cross-port)
 * 2. production + ezstart domain + httpOnly → httpOnly
 * 3. production + external domain + httpOnly → Warning + fallback localStorage
 * 4. production + jwt → jwt
 */
function resolveAuthMode(
  configuredMode: AuthMode,
  hostname: string,
  env: string,
  jwtPublicKey?: string
): AuthMode {
  // Rule 1: Force localStorage in localhost
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

  // Rule 2: httpOnly on ezstart domain (OK)
  if (configuredMode === 'httpOnly' && isEzstartDomain(hostname)) {
    return 'httpOnly'
  }

  // Rule 3: httpOnly on external domain (Warning + fallback)
  if (configuredMode === 'httpOnly' && !isEzstartDomain(hostname)) {
    logger.warn(`[AuthSDK] httpOnly mode on non-ezstart domain!`, {
      domain: hostname,
      note: 'httpOnly only works on *.ezstart.xyz',
      fallback: 'localStorage',
      suggestion: 'Consider using authMode="jwt" for external domains',
    })
    return 'localStorage'
  }

  // Rule 4: JWT mode (validate publicKey - REQUIRED)
  if (configuredMode === 'jwt') {
    if (!jwtPublicKey) {
      logger.error(`[EZAuth SDK] JWT mode requires jwtPublicKey!`, {
        fix: 'Add: jwtPublicKey={process.env.NEXT_PUBLIC_EZAUTH_JWT_PUBLIC_KEY}',
        docs: 'Get your key from: https://dashboard.ezauth.app (or your EZAuth instance)',
        fallback: 'localStorage (INSECURE)',
      })
      return 'localStorage'
    }
    return 'jwt'
  }

  // Rule 5: localStorage (warning in production)
  if (configuredMode === 'localStorage' && env === 'production') {
    logger.warn(`[AuthSDK] localStorage mode in production`, {
      domain: hostname,
      warning: 'Vulnerable to XSS attacks',
      suggestion: 'Consider authMode="httpOnly" or "jwt"',
    })
  }

  return configuredMode
}

export function AuthProvider({
  children,
  appName,
  authMode = 'localStorage',
  jwtPublicKey,
  useHttpOnlyCookies, // deprecated
}: AuthProviderProps) {
  const store = useAuthStore()

  // Handle deprecated prop
  if (useHttpOnlyCookies !== undefined) {
    logger.warn(`[AuthSDK] useHttpOnlyCookies is deprecated`, {
      migration: 'Use authMode="httpOnly" instead',
      old: 'useHttpOnlyCookies={true}',
      new: 'authMode="httpOnly"',
    })
    authMode = useHttpOnlyCookies ? 'httpOnly' : 'localStorage'
  }

  // Create client lazily to avoid SSR issues (memoized to prevent infinite loops)
  const client = useMemo(() => {
    const redirectUri =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'

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

    // Resolve actual mode based on environment
    const resolvedMode = resolveAuthMode(authMode, hostname, env, jwtPublicKey)
    const currentMode = store.getMode()

    logger.debug('[AuthProvider] Mode resolved', {
      configured: authMode,
      resolved: resolvedMode,
      current: currentMode,
      env,
    })

    // Update mode if it changed
    if (currentMode !== resolvedMode) {
      if (store.isAuthenticated) {
        // Re-authenticate user with new mode
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

  // Auto-verify token on mount and periodically (but NOT on callback pages)
  // Includes silent refresh: when access token is expired but refresh token exists,
  // automatically obtain new tokens without user interaction.
  useEffect(() => {
    // Skip token verification on callback pages to avoid race conditions
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return
    }

    let intervalId: NodeJS.Timeout
    // Track whether a refresh is already in progress to avoid concurrent calls
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
          // Try silent refresh before logging out
          const refreshed = await tryRefresh()
          if (!refreshed) {
            logger.debug('[AuthProvider] Token invalid and refresh failed, logging out')
          }
        }
      } else if (mode === 'localStorage' && !store.accessToken && store.refreshToken) {
        // No access token but we have a refresh token — try to get new tokens
        await tryRefresh()
      } else if (mode === 'httpOnly') {
        // httpOnly mode: try to fetch user from cookie
        try {
          const user = await client.getCurrentUser()
          if (user) {
            store.updateUser(user)
          }
        } catch (error: unknown) {
          // Only logout on 401 (unauthorized) - not on network/server errors
          const err = error as { message?: string; status?: number }
          const isAuthFailure =
            err?.message?.includes('401') ||
            err?.status === 401 ||
            err?.message?.toLowerCase().includes('unauthorized')

          if (isAuthFailure) {
            // Try silent refresh before logging out
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

    // Verify immediately
    verifyToken()

    // Verify every 5 minutes
    intervalId = setInterval(verifyToken, 5 * 60 * 1000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
    // Only re-run if accessToken, refreshToken, or mode changes (not on every store update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.accessToken, store.refreshToken, client])

  return <AuthContext.Provider value={{ client }}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

// Main auth hook
export function useAuth() {
  const { client } = useAuthContext()
  const store = useAuthStore()

  const mode = store.getMode()

  const login = (additionalParams?: Record<string, string>): Promise<never> => {
    // Both modes use redirect for now (OAuth flow)
    client.redirectToLogin(additionalParams)
    // Return a promise that never resolves since we're redirecting
    return new Promise(() => {})
  }

  const register = (): Promise<never> => {
    client.redirectToRegister()
    // Return a promise that never resolves since we're redirecting
    return new Promise(() => {})
  }

  const handleCallback = async (code: string) => {
    try {
      const authResult = await client.exchangeCode(code)

      if (mode === 'httpOnly') {
        // httpOnly mode: token is in cookie, only store user + refresh token
        store.setAuth(authResult.user, undefined, 'httpOnly', authResult.refresh_token)
      } else {
        // localStorage mode: store user + token + refresh token
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
    const rt = store.refreshToken
    // Call logout endpoint to clear cookie and revoke refresh token
    await client.logout(rt || undefined)
    // Clear local state for all modes
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
        // Only logout on 401 - keep session on transient errors
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
        // Only logout on 401 - keep session on transient errors
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
    mode, // ✅ Expose mode

    // Actions
    login,
    register,
    logout, // ✅ Now async and mode-aware
    handleCallback,
    verifyAndRefresh,
    setLoggingIn: store.setLoggingIn,
  }
}
