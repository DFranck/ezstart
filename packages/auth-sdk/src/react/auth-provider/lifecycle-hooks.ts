/**
 * `<AuthProvider>` lifecycle effect hooks.
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4) — one custom hook per
 * `useEffect` block, called by the Provider in the SAME order they appeared
 * inline so React's effect-ordering semantics are preserved exactly. Each
 * hook body, dependency array, and cleanup is verbatim from the original.
 *
 * **Internal only** — not exported from any barrel. Consumed solely by
 * `auth-provider.tsx`.
 *
 * @internal
 * @module @ezstart/auth-sdk/react/auth-provider/lifecycle-hooks
 */
'use client'

import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import type { CoreAuthClient, PendingKeyFetch } from '../../core/auth-client.js'
import { fetchKeyConfig } from '../../core/auth-client.js'
import type { AuthMode, AuthScope, AuthSDKConfig, PublishableKeyConfig } from '../../core/types.js'
import type { AuthStoreApi } from '../store.js'
import { getTokenExpiry } from './token-expiry.js'
import type { AuthLogger } from './logger.js'

/** Subset of `resolveSDKConfig` output the key-config fetch effect depends on. */
interface ResolvedKeyFetch {
  keyFetch: PendingKeyFetch | null
}

/**
 * Fetch the publishable-key config once per mounted Provider + key pair
 * (REG-1 guard) and propagate it onto the client + scope + context state.
 * Mirrors the inline effect verbatim, including the deliberately narrow
 * dependency array (`sdkConfig.appName` excluded — read once for the
 * cross-tenant guard).
 */
export function useKeyConfigFetch(deps: {
  resolved: ResolvedKeyFetch
  sdkConfig: AuthSDKConfig
  client: CoreAuthClient
  logger: AuthLogger
  keyConfigRef: { current: PublishableKeyConfig | null }
  setKeyConfigState: Dispatch<SetStateAction<PublishableKeyConfig | null>>
  setResolvedScope: Dispatch<SetStateAction<AuthScope>>
}): void {
  const { resolved, sdkConfig, client, logger, keyConfigRef, setKeyConfigState, setResolvedScope } =
    deps

  /**
   * REG-1 guard — tracks which `publishableKey` has already been resolved (or
   * attempted) by this provider instance. Ensures a single `/keys/config` call
   * per mounted provider + key pair, even when the effect fires multiple times
   * (StrictMode dev double-invoke, ancestor re-renders producing new closures,
   * zustand store subscription triggering render loops, etc.). Without this
   * ref a transient 429 or any re-render cascade would hammer the auth API
   * at > 30 req/min and lock the user out via rate limit.
   */
  const resolvedKeyRef = useRef<string | null>(null)

  // Fetch key config async if publishable key provided.
  //
  // CRITICAL: the fetch lives in the effect (NOT in `resolveSDKConfig`) so
  // that a render-phase memo re-computation can never fire it. The REG-1 guard
  // above prevents duplicate fetches across re-runs of this effect.
  useEffect(() => {
    const keyFetch = resolved.keyFetch
    if (!keyFetch) return
    if (resolvedKeyRef.current === keyFetch.publishableKey) return
    resolvedKeyRef.current = keyFetch.publishableKey

    let cancelled = false
    const consumerAppName = sdkConfig.appName

    fetchKeyConfig(keyFetch.publishableKey, keyFetch.apiBaseUrl)
      .then(config => {
        if (cancelled) return
        keyConfigRef.current = config
        // Surface the resolved config on a state slot so the context picks up
        // the auto-resolved `webUrl` (and any other fields consumers might
        // start to depend on) without forcing the caller to wire it via env.
        setKeyConfigState(config)
        // Update client app name ONLY if the consumer did NOT provide one OR
        // the provided name is the placeholder `'pending'`. When the consumer
        // passes an explicit `appName` (e.g. `<AuthProvider appName="ezpay">`),
        // that value is authoritative — it declares which app the SDK serves.
        // Platform-scoped keys (`scope: 'admin'`) return the key owner's app
        // (often `ezauth`), which would misroute `/auth/login` & `/auth/token`
        // calls to the wrong tenant and break the callback exchange.
        if (
          config.appName &&
          config.appName !== 'pending' &&
          (!consumerAppName || consumerAppName === 'pending')
        ) {
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
          consumerAppName,
          webUrl: config.webUrl,
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
    // sdkConfig.appName is intentionally excluded — it's read once on mount to
    // preserve the consumer's explicit appName (cross-tenant guard). Including
    // it would re-run the effect when the parent re-renders with a new
    // `sdkConfig` memo identity, defeating the REG-1 guard.
  }, [resolved.keyFetch, client, logger])
}

/**
 * Auto-detect + apply the effective auth mode on mount. When the resolved
 * mode differs from the persisted one and the user is authenticated, re-stamp
 * the session under the new mode. Verbatim from the inline effect.
 */
export function useAuthModeSync(deps: {
  effectiveMode: AuthMode
  authMode: AuthMode | undefined
  store: AuthStoreApi
  logger: AuthLogger
}): void {
  const { effectiveMode, authMode, store, logger } = deps

  // Auto-detect and set mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const current = store.getState()
    const currentMode = current.getMode()

    logger.debug('[AuthProvider] Mode resolved', {
      configured: authMode,
      resolved: effectiveMode,
      current: currentMode,
    })

    // Update mode if it changed
    if (currentMode !== effectiveMode) {
      if (current.isAuthenticated) {
        const user = current.user
        if (user) {
          current.setAuth(
            user,
            current.accessToken || undefined,
            effectiveMode,
            current.refreshToken || undefined
          )
        }
      }
    }
  }, [effectiveMode, authMode, store, logger])
}

/**
 * Auto-verify the token on mount + every 5 minutes (skipped on callback
 * pages), with silent refresh fallback for both `localStorage` and `httpOnly`
 * modes. Verbatim from the inline effect, including the dependency array
 * keyed on `accessToken` / `refreshToken`.
 */
export function useTokenVerification(deps: {
  accessToken: string | null
  refreshToken: string | null
  client: CoreAuthClient
  logger: AuthLogger
  store: AuthStoreApi
}): void {
  const { accessToken, refreshToken, client, logger, store } = deps

  // Auto-verify token on mount and periodically (but NOT on callback pages)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return
    }

    let refreshing = false

    const tryRefresh = async (): Promise<boolean> => {
      const current = store.getState()
      const rt = current.refreshToken
      if (!rt || refreshing) return false
      refreshing = true
      try {
        const result = await client.refreshTokens(rt)
        store.getState().setTokens(result.accessToken, result.refreshToken)
        store.getState().updateUser(result.user)
        logger.debug('[AuthProvider] Silently refreshed tokens')
        return true
      } catch (err) {
        logger.debug('[AuthProvider] Silent refresh failed, logging out', {
          error: err instanceof Error ? err.message : String(err),
        })
        store.getState().logout()
        return false
      } finally {
        refreshing = false
      }
    }

    const verifyToken = async () => {
      const current = store.getState()
      const verifyMode = current.getMode()

      if (verifyMode === 'localStorage' && current.accessToken) {
        const isValid = await client.verifyToken(current.accessToken)
        if (!isValid) {
          const refreshed = await tryRefresh()
          if (!refreshed) {
            logger.debug('[AuthProvider] Token invalid and refresh failed, logging out')
          }
        }
      } else if (verifyMode === 'localStorage' && !current.accessToken && current.refreshToken) {
        await tryRefresh()
      } else if (verifyMode === 'httpOnly') {
        try {
          const user = await client.getCurrentUser()
          if (user) {
            store.getState().updateUser(user)
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
    const intervalId = setInterval(verifyToken, 5 * 60 * 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [accessToken, refreshToken, client, logger, store])
}

/**
 * Proactive token refresh: schedule a refresh 1 minute before the JWT `exp`.
 * Verbatim from the inline effect, including the local timer ref (previously
 * declared in the component; only this effect ever touched it).
 */
export function useProactiveRefresh(deps: {
  accessToken: string | null
  refreshToken: string | null
  client: CoreAuthClient
  logger: AuthLogger
  store: AuthStoreApi
}): void {
  const { accessToken, refreshToken, client, logger, store } = deps

  // Proactive token refresh: schedule refresh 1 minute before JWT expiry
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current)
      proactiveTimerRef.current = null
    }

    const token = accessToken
    if (!token || !refreshToken) return

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
      const rt = store.getState().refreshToken
      if (!rt) return
      try {
        const result = await client.refreshTokens(rt)
        store.getState().setTokens(result.accessToken, result.refreshToken)
        store.getState().updateUser(result.user)
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
  }, [accessToken, refreshToken, client, logger, store])
}
