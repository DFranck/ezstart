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
import { resolveEffectiveAuthMode } from '../core/cross-origin.js'
import type {
  AuthMode,
  AuthScope,
  AuthSDKConfig,
  AuthUser,
  PublishableKeyConfig,
} from '../core/types.js'
import { AuthContext, AuthStoreContext } from './__contexts.js'
import { IdleTimeoutManager } from './idle-timeout-manager.js'
import { defaultIdleWarningTexts, type IdleWarningTexts } from './idle-warning-toast.js'
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
 * `true` when the current browser is running on a localhost-equivalent host
 * (`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, `*.localhost`). The dev
 * stack always uses localStorage because the API and the web app run on
 * different ports of the same host, and host-only cookies can't span ports.
 */
function isLocalhostBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1'
  )
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

  // ── Idle timeout (auto-logout on inactivity) ───────────────────────────
  //
  // Opt-in. When `idleTimeoutMs` is a positive number, the provider mounts
  // an `<IdleTimeoutManager>` child that watches DOM activity events and
  // auto-fires `useAuth().logout()` after the configured period. A warning
  // toast surfaces `idleWarningMs` before the auto-logout (default 60s)
  // with a "Stay signed in" CTA that resets the timer.
  //
  // Set to `null` / `undefined` (default) to disable.
  //
  // Recommended consumer values:
  // - `15 * 60 * 1000` (15 minutes — security-focused dashboards)
  // - `30 * 60 * 1000` (30 minutes — lax / consumer apps)

  /**
   * Auto-logout window in milliseconds. Pass `null` to disable (default).
   * Only fires while the user is authenticated.
   */
  idleTimeoutMs?: number | null
  /**
   * How long before the auto-logout the warning toast surfaces.
   * Defaults to `60_000` (60 seconds).
   */
  idleWarningMs?: number
  /**
   * Override the watched DOM activity events. Defaults to mouse, keyboard,
   * touch, scroll and focus.
   */
  idleEvents?: readonly string[]
  /**
   * Localized labels for the idle warning + signed-out toast. Falls back
   * to {@link defaultIdleWarningTexts} (English).
   */
  idleWarningTexts?: IdleWarningTexts

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
  idleTimeoutMs,
  idleWarningMs,
  idleEvents,
  idleWarningTexts,
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

  // Defense-in-depth: ensure `isAuthReady` is true after the provider mounts.
  //
  // The store factory normally relies on zustand persist's `onRehydrateStorage`
  // postRehydration callback to flip `isAuthReady` from `false` (initial when
  // SSR returns no user) to `true`. Empirically observed (chrome-devtools MCP
  // 2026-05-03) that under Next 15 dev + React 19 + zustand 4.5.7, persist
  // partially hydrates state (user, accessToken, isAuthenticated correctly
  // restored from localStorage) but never marks `_hasHydrated2 = true`,
  // meaning the postRehydration callback never fires and `isAuthReady` stays
  // permanently `false`. Consumers gating on `isAuthReady && isAuthenticated`
  // (e.g. `<EZPayDashboardPage>`) are then stuck in a loading state forever.
  //
  // This effect is the safety net: regardless of persist's behavior, once the
  // provider has mounted client-side, auth resolution is over — either the
  // user is rehydrated (isAuthenticated=true) or anonymous (isAuthenticated=false).
  // Either way, the consumer can stop waiting.
  useEffect(() => {
    const current = store.getState()
    if (!current.isAuthReady) {
      store.setState({ isAuthReady: true })
    }
  }, [store])

  const storeState = useStore(store)
  const keyConfigRef = useRef<PublishableKeyConfig | null>(null)
  // Mirror the latest key config on a state slot so context consumers can read
  // it (Provider, useAuthContext) rather than only reading the (snapshot-stale)
  // ref. Necessary for the auto-resolved `webUrl` exposure documented in
  // `standard-sdk-dx.md` §0bis (consumer drops `NEXT_PUBLIC_EZAUTH_WEB_URL`).
  const [keyConfigState, setKeyConfigState] = useState<PublishableKeyConfig | null>(null)

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

    // Defensive fallback (dev-only): if webUrl wasn't provided AND apiUrl
    // looks like the canonical localhost dev pattern (port 6110), derive the
    // web URL by swapping to port 6111. This unblocks consumer apps that forgot
    // to wire NEXT_PUBLIC_EZAUTH_WEB_URL — SSO would otherwise build
    // `${undefined}/login` and dead-end on the consumer's own /auth/callback
    // with "no authorization code". In production (custom domains), the
    // consumer MUST provide webUrl explicitly — there's no universal
    // `api.<host>` → `app.<host>` mapping we can safely guess.
    const resolvedWebUrl =
      webUrl ??
      (apiUrl?.match(/^https?:\/\/localhost:6110(\/|$)/)
        ? apiUrl.replace(/:6110(\/|$)/, ':6111$1')
        : undefined)

    return {
      publishableKey: mode === 'first-party' ? undefined : (key ?? undefined),
      firstParty: mode === 'first-party',
      appName,
      apiUrl,
      webUrl: resolvedWebUrl,
    }
  }, [publishableKey, mode, appName, apiUrl, webUrl])

  const resolved = useMemo(() => resolveSDKConfig(sdkConfig), [sdkConfig])

  // Create the client (stable reference)
  const client = useMemo(
    () => new CoreAuthClient(resolved.clientConfig),
    [resolved.clientConfig.apiUrl, resolved.clientConfig.appName]
  )

  const resolvedWebUrl = resolved.webUrl
  const resolvedAppName = resolved.clientConfig.appName

  // Resolve auth mode — see `core/cross-origin.ts` for the full decision tree.
  // Summary:
  //   - localhost (any browser host)   → forced 'localStorage' (cross-port)
  //   - SSR (no window)                → respects the configured authMode
  //   - same eTLD+1 (api ↔ web)        → respects the configured authMode
  //                                      (defaults to 'httpOnly' when unset)
  //   - cross-origin + 'httpOnly' set  → falls back to 'localStorage' with
  //                                      a one-time console.warn (see helper)
  const effectiveMode = useMemo<AuthMode>(() => {
    if (isLocalhostBrowser()) return 'localStorage'
    const configured: AuthMode = authMode ?? 'httpOnly'
    return resolveEffectiveAuthMode(configured, resolved.clientConfig.apiUrl, undefined, {
      warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
    })
  }, [authMode, resolved.clientConfig.apiUrl, logger])

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

  // Auto-resolve `webUrl` from the publishable key config when the consumer
  // didn't pass an explicit `webUrl` prop. The `/keys/config` endpoint returns
  // the canonical EZAuth web URL for the resolved environment (dev/staging/
  // prod), which means consumers can drop `NEXT_PUBLIC_EZAUTH_WEB_URL` from
  // their env and rely entirely on the publishable key as the source of truth.
  // The explicit `webUrl` prop still wins when provided — same precedence as
  // every other Provider prop in the SDK.
  const effectiveWebUrl = webUrl ?? keyConfigState?.webUrl ?? resolvedWebUrl

  const contextValue = useMemo(
    () => ({
      client,
      appName: resolvedAppName,
      webUrl: effectiveWebUrl,
      keyConfig: keyConfigState,
      scope: resolvedScope,
      publishableKey: sdkConfig.publishableKey,
      logoutDefaults,
    }),
    [
      client,
      resolvedAppName,
      effectiveWebUrl,
      keyConfigState,
      resolvedScope,
      sdkConfig.publishableKey,
      logoutDefaults,
    ]
  )

  // Resolve idle-warning labels once — the manager merges English defaults
  // when the consumer doesn't pass a localized bundle.
  const resolvedIdleTexts = useMemo<IdleWarningTexts>(
    () => ({
      title: idleWarningTexts?.title ?? defaultIdleWarningTexts.title,
      description: idleWarningTexts?.description ?? defaultIdleWarningTexts.description,
      stayButton: idleWarningTexts?.stayButton ?? defaultIdleWarningTexts.stayButton,
      signedOutMessage:
        idleWarningTexts?.signedOutMessage ?? defaultIdleWarningTexts.signedOutMessage,
    }),
    [
      idleWarningTexts?.title,
      idleWarningTexts?.description,
      idleWarningTexts?.stayButton,
      idleWarningTexts?.signedOutMessage,
    ]
  )

  // The manager is rendered as a child of `<AuthContext.Provider>` so it
  // can call `useAuth().logout()` inside the same Context tree. Mounted
  // unconditionally — the hook itself is a no-op when `idleTimeoutMs` is
  // falsy or the user is unauthenticated, so no extra gate is needed here.
  return (
    <AuthStoreContext.Provider value={store}>
      <AuthContext.Provider value={contextValue}>
        <IdleTimeoutManager
          idleMs={idleTimeoutMs}
          warningMs={idleWarningMs}
          events={idleEvents}
          texts={resolvedIdleTexts}
        />
        {children}
      </AuthContext.Provider>
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
