'use client'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CoreAuthClient, resolveSDKConfig } from '../core/auth-client.js'
import type { AuthMode, AuthScope, AuthSDKConfig, PublishableKeyConfig } from '../core/types.js'
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
// Auth mode detection (agnostic, no @ezstart/config)
// ---------------------------------------------------------------------------

/**
 * Auto-detect the auth mode based on the current environment.
 * - localhost → localStorage (httpOnly cookies don't work cross-port)
 * - same root domain as API → httpOnly
 * - different domain → localStorage
 */
function detectAuthMode(apiUrl: string): AuthMode {
  if (typeof window === 'undefined') return 'httpOnly'

  const currentHost = window.location.hostname

  if (currentHost === 'localhost' || currentHost.startsWith('127.0.0.1')) {
    return 'localStorage'
  }

  try {
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
  } catch {
    // URL parsing failed, fallback to localStorage
  }

  return 'localStorage'
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  client: CoreAuthClient
  appName: string
  /** Web URL for login/register redirects. */
  webUrl: string
  /** Resolved key config (null until async fetch completes, or if no key). */
  keyConfig: PublishableKeyConfig | null
  /** Auth scope: 'test'/'live' (single app), 'admin' (all apps), 'first-party' (ezauth web). */
  scope: AuthScope
  /**
   * Raw publishable key string (e.g., `ez_pk_live_...` for production, `ez_pk_test_...` for sandbox).
   * Legacy `ezk_*` keys still accepted but deprecated (rotate by 2026-07-21).
   */
  publishableKey: string | undefined
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AuthProviderProps {
  children: ReactNode

  // ── Clerk-like API (preferred) ──────────────────────────────────────────

  /**
   * Publishable key (e.g., `ez_pk_live_...` for production, `ez_pk_test_...` for sandbox).
   * If not provided, reads from `process.env.NEXT_PUBLIC_EZAUTH_KEY`.
   * Legacy `ezk_*` keys still accepted but deprecated (rotate by 2026-07-21).
   */
  publishableKey?: string

  /**
   * Provider mode:
   * - `'standard'` (default) — uses publishableKey or dev defaults
   * - `'first-party'` — for ezauth web itself, no key needed
   */
  mode?: 'standard' | 'first-party'

  // ── Manual overrides ────────────────────────────────────────────────────

  /** Override app name (auto-resolved from key in standard mode). */
  appName?: string
  /** Override API URL. */
  apiUrl?: string
  /** Override web URL (for login/register redirects). */
  webUrl?: string
  /** Override auth mode. Auto-detected if not set. */
  authMode?: AuthMode
  /** JWT public key (required for jwt mode). */
  jwtPublicKey?: string

  // ── Optional ────────────────────────────────────────────────────────────

  /** Optional logger instance. */
  logger?: AuthLogger

  // ── Deprecated props (backward compat) ────────────────────────────────

  /** @deprecated Use `authMode` instead. */
  useHttpOnlyCookies?: boolean
}

export function AuthProvider({
  children,
  publishableKey,
  mode = 'standard',
  appName,
  apiUrl,
  webUrl,
  authMode,
  jwtPublicKey,
  logger = noopLogger,
  useHttpOnlyCookies,
}: AuthProviderProps) {
  const store = useAuthStore()
  const keyConfigRef = useRef<PublishableKeyConfig | null>(null)

  // Determine initial scope from mode prop
  const initialScope: AuthScope = mode === 'first-party' ? 'first-party' : 'live'
  const [resolvedScope, setResolvedScope] = useState<AuthScope>(initialScope)

  // Handle deprecated prop
  if (useHttpOnlyCookies !== undefined) {
    logger.warn(`[AuthSDK] useHttpOnlyCookies is deprecated`, {
      migration: 'Use authMode="httpOnly" instead',
    })
    authMode = useHttpOnlyCookies ? 'httpOnly' : 'localStorage'
  }

  // Resolve SDK config
  const sdkConfig: AuthSDKConfig = useMemo(() => {
    const key =
      publishableKey ??
      (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_EZAUTH_KEY : undefined)

    return {
      publishableKey: mode === 'first-party' ? undefined : (key ?? undefined),
      firstParty: mode === 'first-party',
      appName,
      apiUrl,
      webUrl,
    }
  }, [publishableKey, mode, appName, apiUrl, webUrl])

  const resolved = useMemo(() => resolveSDKConfig(sdkConfig), [sdkConfig])

  // Create the client (stable reference)
  const client = useMemo(
    () => new CoreAuthClient(resolved.clientConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved.clientConfig.apiUrl, resolved.clientConfig.appName]
  )

  const resolvedWebUrl = resolved.webUrl
  const resolvedAppName = resolved.clientConfig.appName

  // Resolve auth mode — localhost ALWAYS uses localStorage because
  // httpOnly cookies don't work cross-port (API :6110, Web :6111).
  const effectiveMode = useMemo(() => {
    const detected = detectAuthMode(resolved.clientConfig.apiUrl)
    // On localhost, always force localStorage regardless of authMode prop
    if (detected === 'localStorage') return 'localStorage'
    if (authMode) return authMode
    return detected
  }, [authMode, resolved.clientConfig.apiUrl])

  // Warn in production if no key and not first-party
  useEffect(() => {
    if (
      mode !== 'first-party' &&
      !sdkConfig.publishableKey &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        'EZAuth: No publishable key configured. Set NEXT_PUBLIC_EZAUTH_KEY in your environment.'
      )
    }
  }, [mode, sdkConfig.publishableKey])

  // Fetch key config async if publishable key provided
  useEffect(() => {
    if (!resolved.configPromise) return

    let cancelled = false
    resolved.configPromise
      .then(config => {
        if (cancelled) return
        keyConfigRef.current = config
        // Update client with resolved config
        if (config.appName && config.appName !== 'pending') {
          client.setAppName(config.appName)
        }
        if (config.apiUrl) {
          client.setApiUrl(`${config.apiUrl}/api/auth`)
        }
        // Update scope from key config
        if (config.scope) {
          setResolvedScope(config.scope)
        }
        logger.info('[AuthProvider] Key config resolved', {
          appName: config.appName,
          plan: config.plan,
          scope: config.scope,
        })
      })
      .catch(err => {
        if (cancelled) return
        logger.error('[AuthProvider] Failed to fetch key config', {
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return () => {
      cancelled = true
    }
  }, [resolved.configPromise, client, logger])

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

  const contextValue = useMemo(
    () => ({
      client,
      appName: resolvedAppName,
      webUrl: resolvedWebUrl,
      keyConfig: keyConfigRef.current,
      scope: resolvedScope,
      publishableKey: sdkConfig.publishableKey,
    }),
    [client, resolvedAppName, resolvedWebUrl, resolvedScope, sdkConfig.publishableKey]
  )

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
