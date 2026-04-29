'use client'
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'
import { CoreAuthClient, fetchKeyConfig, resolveSDKConfig } from '../core/auth-client.js'
import type {
  AuthMode,
  AuthScope,
  AuthSDKConfig,
  AuthUser,
  PublishableKeyConfig,
} from '../core/types.js'
import { AuthContext, AuthStoreContext } from './__contexts.js'
import { type AuthState, type AuthStoreApi, createAuthStore, getLegacyStorageKey } from './store.js'

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

  /**
   * Optional initial user state — typically resolved server-side via
   * `getServerAuth()` from `@ezstart/auth-sdk/server`.
   *
   * When provided, the per-Provider Zustand store boots with
   * `{ user: initialUser, isAuthenticated: true, isAuthReady: true }`
   * **synchronously**, before any subscriber renders. This eliminates
   * the `<LoginButton>` flash that would otherwise occur in `httpOnly`
   * mode while the async `/me` request resolves.
   *
   * Pass `null` (or omit) to fall back to the legacy client-side bootstrap.
   */
  initialUser?: AuthUser | null

  /** Override the localStorage key used by the persist middleware. */
  storageKey?: string

  // ── Logout flow defaults (cf. standard-sdk-dx.md §11ter) ───────────────
  //
  // These default values feed every `useAuth().logout()` call and any SDK
  // component that drives the logout (UserMenu, UserMenuV2, DeleteAccountSection).
  // Per-call overrides remain possible — pass an options bag to `logout()`
  // or to the component's own `onLogout` / `redirectAfterLogout` props.

  /**
   * Where to navigate after a successful logout. Defaults to `'/'`.
   * Pass `false` to disable the hard-redirect entirely (the consumer takes
   * over navigation, e.g. router.push to a localized landing).
   *
   * The redirect uses `window.location.assign()` (a hard navigation) so
   * every in-memory React state is dropped along with the now-revoked
   * session — `router.push()` would keep React state mounted and risk
   * surfacing stale "logged-in" UI for one render cycle.
   */
  redirectAfterLogout?: string | false

  /**
   * Consumer hook fired between the local store reset (step 4) and the
   * toast / redirect (steps 6-7). Use it to drop React Query cache, close
   * WebSockets, IndexedDB cleanup, etc.
   *
   * The promise is awaited so async cleanup completes before the redirect.
   * Throws are swallowed — consumer cleanup must never block the logout
   * orchestration.
   *
   * @example
   * ```tsx
   * <AuthProvider onLogout={() => queryClient.clear()}>
   * ```
   */
  onLogout?: () => void | Promise<void>

  /**
   * Default texts for the success / error toasts emitted at step 6 of the
   * logout flow. The hook's `logout({ texts })` option overrides per-call.
   * Defaults to English. For locale-aware defaults pass
   * `getAuthTexts(locale, 'userMenu')`.
   */
  logoutTexts?: Partial<{
    /** Toast shown after a successful logout. */
    signOutSuccess: string
    /** Toast shown when local cleanup fails. Server errors are silent. */
    signOutError: string
  }>

  // ── Deprecated props (backward compat) ────────────────────────────────

  /** @deprecated Use `authMode` instead. */
  useHttpOnlyCookies?: boolean
}

const DEFAULT_LOGOUT_TEXTS = {
  signOutSuccess: 'You have been signed out',
  signOutError: 'Failed to sign out — please try again',
} as const

export function AuthProvider({
  children,
  publishableKey,
  mode = 'standard',
  appName,
  apiUrl,
  webUrl,
  authMode,
  // jwtPublicKey is reserved for future client-side JWT signature verification
  jwtPublicKey: _jwtPublicKey,
  logger = noopLogger,
  useHttpOnlyCookies,
  initialUser,
  storageKey,
  redirectAfterLogout = '/',
  onLogout,
  logoutTexts,
}: AuthProviderProps) {
  // ── Per-Provider Zustand store (Clerk-style SSR setup) ──────────────────
  //
  // Creating the store inside `useState` guarantees one store per Provider
  // instance and that `initialUser` is available synchronously on the first
  // render. The factory hands React a store whose initial state already
  // reflects the SSR user, so subscribers never observe a transient
  // `{ user: null, isAuthenticated: false }` between mount and the legacy
  // post-mount hydration. This is the canonical Next.js + Zustand setup.
  // Resolve the storage key once so both the store factory and the
  // `logoutDefaults.storageKey` context value see the same value. The
  // logout flow's step 3 (`localStorage.removeItem(storageKey)`) MUST
  // target the exact key the persist middleware writes to — drift here
  // would silently leak the previous session's `user` blob across reloads.
  const resolvedStorageKey = storageKey ?? getLegacyStorageKey() ?? 'ezauth-storage'

  const [store] = useState(() =>
    createAuthStore({
      initialUser,
      storageKey: resolvedStorageKey,
    })
  )

  // Tear down the cross-tab BroadcastChannel when the provider unmounts
  // (HMR, route-level provider remount, tests, etc.).
  useEffect(() => {
    return () => {
      store.__cleanup()
    }
  }, [store])

  const storeState = useStore(store)
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
    // Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time.
    // No runtime guard — `typeof process` short-circuits before the replacement
    // and `process.env?` optional chaining disables the substitution.
    const key = publishableKey ?? process.env.NEXT_PUBLIC_EZAUTH_KEY

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

  // Warn in production if no key and not first-party.
  // Routed through the injected logger (defaults to silent no-op per the
  // SDK agnostic packaging rule — consumers opt-in by passing `logger`).
  useEffect(() => {
    // Next.js statically replaces `process.env.NODE_ENV` at build time.
    // No runtime guard — same reason as `NEXT_PUBLIC_*` above.
    if (
      mode !== 'first-party' &&
      !sdkConfig.publishableKey &&
      process.env.NODE_ENV === 'production'
    ) {
      logger.warn(
        'EZAuth: No publishable key configured. Set NEXT_PUBLIC_EZAUTH_KEY in your environment.'
      )
    }
  }, [mode, sdkConfig.publishableKey, logger])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.keyFetch, client, logger])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState.accessToken, storeState.refreshToken, client, logger, store])

  // Proactive token refresh: schedule refresh 1 minute before JWT expiry
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current)
      proactiveTimerRef.current = null
    }

    const token = storeState.accessToken
    if (!token || !storeState.refreshToken) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState.accessToken, storeState.refreshToken, client, logger, store])

  // Resolve the logout texts ONCE per provider — the hook merges any
  // per-call override on top, so the context value can be a stable
  // reference (no per-render allocation cascade).
  const resolvedLogoutTexts = useMemo(
    () => ({
      signOutSuccess: logoutTexts?.signOutSuccess ?? DEFAULT_LOGOUT_TEXTS.signOutSuccess,
      signOutError: logoutTexts?.signOutError ?? DEFAULT_LOGOUT_TEXTS.signOutError,
    }),
    [logoutTexts?.signOutSuccess, logoutTexts?.signOutError]
  )

  const logoutDefaults = useMemo(
    () => ({
      redirectAfterLogout,
      onLogout,
      storageKey: resolvedStorageKey,
      texts: resolvedLogoutTexts,
    }),
    [redirectAfterLogout, onLogout, resolvedStorageKey, resolvedLogoutTexts]
  )

  const contextValue = useMemo(
    () => ({
      client,
      appName: resolvedAppName,
      webUrl: resolvedWebUrl,
      keyConfig: keyConfigRef.current,
      scope: resolvedScope,
      publishableKey: sdkConfig.publishableKey,
      logoutDefaults,
    }),
    [
      client,
      resolvedAppName,
      resolvedWebUrl,
      resolvedScope,
      sdkConfig.publishableKey,
      logoutDefaults,
    ]
  )

  return (
    <AuthStoreContext.Provider value={store}>
      <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
    </AuthStoreContext.Provider>
  )
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

/**
 * Read the per-Provider Zustand store via React Context. Throws when
 * called outside of `<AuthProvider>` to surface SSR setup mistakes.
 *
 * @example
 * ```tsx
 * const user = useAuthStoreSelector(s => s.user)
 * ```
 */
export function useAuthStoreSelector<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreSelector must be used within <AuthProvider>')
  }
  return useStore(store, selector)
}

/**
 * Bound hook reading the per-Provider Zustand store via React Context.
 * Throws when called outside `<AuthProvider>` to surface SSR-incompatible
 * setups (the legacy module-level `useAuthStore.getState()` pattern is
 * removed — for imperative access use {@link useAuthStoreApi} or
 * {@link useAuthStoreGetSnapshot}).
 *
 * - `useAuthStore()` → returns the full state (subscribes to all changes)
 * - `useAuthStore(selector)` → subscribes to a slice
 */
export function useAuthStore(): AuthState
export function useAuthStore<T>(selector: (state: AuthState) => T): T
export function useAuthStore<T>(selector?: (state: AuthState) => T): T | AuthState {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStore must be used within <AuthProvider>')
  }
  return useStore(store, (selector ?? ((s: AuthState) => s)) as (state: AuthState) => T)
}

/**
 * Internal accessor — read the store instance from the current Provider.
 * Used by SDK components that need imperative `getState()`/`setState()`
 * access (e.g. closures passed to non-React code).
 */
export function useAuthStoreApi(): AuthStoreApi {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreApi must be used within <AuthProvider>')
  }
  return store
}

/**
 * SSR-safe variant — returns the full state. Kept for backwards
 * compatibility; prefer {@link useAuthStore} which is now SSR-correct
 * by construction (the store is created with `initialUser` at mount time).
 *
 * @deprecated Use `useAuthStore()` directly.
 */
export function useAuthStoreSSR(): AuthState {
  return useAuthStore()
}

/**
 * Read the active store snapshot **inside a React event handler or
 * effect** without subscribing. Useful for closures passed outside the
 * React render path (e.g. `getToken={() => useAuthStoreGetState().accessToken}`
 * is wrong; instead use `const get = useAuthStoreGetSnapshot()` once and
 * pass `getToken={() => get().accessToken}`).
 */
export function useAuthStoreGetSnapshot(): () => AuthState {
  const store = useAuthStoreApi()
  return useCallback(() => store.getState(), [store])
}
