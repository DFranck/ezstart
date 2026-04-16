'use client'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { CoreAuthClient } from '../core/auth-client.js'
import type { AuthMode } from '../core/types.js'
import { useAuthStore } from './store.js'

/**
 * Decode JWT expiry (exp claim) without dependencies.
 * Returns expiry timestamp in milliseconds, or null if decoding fails.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Logger interface (opt-in, avoids hard dep on @ezstart/logger)
// ---------------------------------------------------------------------------

export interface AuthLogger {
  debug: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
}

const noopLogger: AuthLogger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  client: CoreAuthClient
  appName: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AuthProviderProps {
  children: ReactNode
  /** Pre-configured auth client instance. */
  client: CoreAuthClient
  /** App name. */
  appName: string
  /** Auth mode (default: 'localStorage'). */
  authMode?: AuthMode
  /** Resolved auth mode (after environment checks). If not provided, `authMode` is used as-is. */
  resolvedAuthMode?: AuthMode
  /** Optional logger. */
  logger?: AuthLogger
}

export function AuthProvider({
  children,
  client,
  appName,
  authMode = 'localStorage',
  resolvedAuthMode,
  logger = noopLogger,
}: AuthProviderProps) {
  const store = useAuthStore()

  const effectiveMode = resolvedAuthMode ?? authMode

  // Auto-detect and set mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentMode = store.getMode()

    logger.debug('[AuthProvider] Mode resolved', {
      configured: authMode,
      resolved: effectiveMode,
      current: currentMode,
    })

    // Update mode if it changed
    if (currentMode !== effectiveMode) {
      if (store.isAuthenticated) {
        const user = store.user
        if (user) {
          store.setAuth(
            user,
            store.accessToken || undefined,
            effectiveMode,
            store.refreshToken || undefined
          )
        }
      }
    }
  }, [effectiveMode, authMode, store, logger])

  // Auto-verify token on mount and periodically (but NOT on callback pages)
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
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.accessToken, store.refreshToken, client, logger])

  // Proactive token refresh: schedule refresh 1 minute before JWT expiry
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current)
      proactiveTimerRef.current = null
    }

    const token = store.accessToken
    if (!token || !store.refreshToken) return

    const expiry = getTokenExpiry(token)
    if (!expiry) return

    const now = Date.now()
    const refreshAt = expiry - 60_000
    const delay = refreshAt - now

    if (delay <= 0) {
      logger.debug('[AuthProvider] Token already near expiry, skipping proactive schedule')
      return
    }

    logger.debug('[AuthProvider] Proactive refresh scheduled', {
      expiresIn: Math.round((expiry - now) / 1000) + 's',
      refreshIn: Math.round(delay / 1000) + 's',
    })

    proactiveTimerRef.current = setTimeout(async () => {
      const rt = store.refreshToken
      if (!rt) return
      try {
        const result = await client.refreshTokens(rt)
        store.setTokens(result.accessToken, result.refreshToken)
        store.updateUser(result.user)
        logger.debug('[AuthProvider] Proactive refresh succeeded')
      } catch (err) {
        logger.debug('[AuthProvider] Proactive refresh failed, fallback interval will retry', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }, delay)

    return () => {
      if (proactiveTimerRef.current) {
        clearTimeout(proactiveTimerRef.current)
        proactiveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.accessToken, store.refreshToken, client, logger])

  const contextValue = useMemo(() => ({ client, appName }), [client, appName])

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
