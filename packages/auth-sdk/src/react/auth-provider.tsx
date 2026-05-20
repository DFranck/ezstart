'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { CoreAuthClient, resolveSDKConfig } from '../core/auth-client.js'
import { resolveEffectiveAuthMode } from '../core/cross-origin.js'
import { getEzauthDefaultUrls } from '../core/defaults.js'
import type { AuthMode, AuthScope, AuthSDKConfig, PublishableKeyConfig } from '../core/types.js'
import { AuthContext, AuthStoreContext } from './__contexts.js'
import { IdleTimeoutManager } from './idle-timeout-manager.js'
import { defaultIdleWarningTexts, type IdleWarningTexts } from './idle-warning-toast.js'
import { createAuthStore, getLegacyStorageKey } from './store.js'
import { isLocalhostBrowser } from './auth-provider/localhost.js'
import { noopLogger } from './auth-provider/logger.js'
import { type AuthProviderProps, DEFAULT_LOGOUT_TEXTS } from './auth-provider/props.js'
import {
  useAuthModeSync,
  useKeyConfigFetch,
  useProactiveRefresh,
  useTokenVerification,
} from './auth-provider/lifecycle-hooks.js'

// ---------------------------------------------------------------------------
// Public re-exports — the helpers, prop types, logger interface and hooks were
// extracted to `./auth-provider/` (Wave D Lot 4). Re-exporting them from here
// keeps the public barrel import path (`@ezstart/auth-sdk` → `./auth-provider.js`)
// byte-for-byte unchanged.
// ---------------------------------------------------------------------------

export type { AuthLogger } from './auth-provider/logger.js'
export type { AuthProviderProps } from './auth-provider/props.js'
export {
  useAuthApiUrl,
  useAuthContext,
  useAuthStore,
  useAuthStoreApi,
  useAuthStoreGetSnapshot,
  useAuthStoreSelector,
  useAuthStoreSSR,
} from './auth-provider/public-hooks.js'

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

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

  // Live reference to the active CoreAuthClient — wired by the
  // `useMemo(() => new CoreAuthClient(...))` below. Hoisted here so the
  // store factory closure can call `clientRef.current?.getCurrentUser()`
  // when a cross-tab broadcast arrives (cf. HAC-HIGH-1 hardening in
  // `store.ts`: the store NEVER trusts the broadcast payload — it
  // re-fetches the authoritative user from the server). The closure is
  // captured ONCE on first render and stays stable for the store's
  // lifetime; the ref pointer is what we mutate when the client is
  // re-created after a publishableKey / apiUrl change.
  const clientRef = useRef<CoreAuthClient | null>(null)

  const [store] = useState(() =>
    createAuthStore({
      initialUser,
      storageKey: resolvedStorageKey,
      fetchMe: async () => {
        const c = clientRef.current
        if (!c) return null
        try {
          return await c.getCurrentUser()
        } catch {
          // Surface as "no server confirmation" → store keeps current
          // local state (debounce already guarded the call frequency).
          return null
        }
      },
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

    // Stripe-style apiUrl resolution (Phase A1 ENV-DIET 2026-05-05):
    //   1. explicit `apiUrl` prop          (caller knows best)
    //   2. NEXT_PUBLIC_EZAUTH_API_URL      (dev / staging / self-hosted override)
    //   3. getEzauthDefaultUrls().api      (env-aware: staging hostname → staging
    //                                       API, localhost → local, else prod)
    //
    // getEzauthDefaultUrls() is called at render time inside useMemo so it can
    // read window.location.hostname — unlike the module-level DEFAULT_AUTH_API_URL
    // constant which always resolved to production at import time.
    const resolvedApiUrl =
      apiUrl ?? process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? getEzauthDefaultUrls().api

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
      (resolvedApiUrl?.match(/^https?:\/\/localhost:6110(\/|$)/)
        ? resolvedApiUrl.replace(/:6110(\/|$)/, ':6111$1')
        : undefined)

    return {
      publishableKey: mode === 'first-party' ? undefined : (key ?? undefined),
      firstParty: mode === 'first-party',
      appName,
      apiUrl: resolvedApiUrl,
      webUrl: resolvedWebUrl,
    }
  }, [publishableKey, mode, appName, apiUrl, webUrl])

  // Forward the injected logger so the localhost-trap guard inside
  // `resolveSDKConfig` (cf. `assertWebUrlNotLocalhostOffLocal`) routes its
  // warning through the consumer's logger instead of a direct console.warn.
  // Defaults to the silent no-op when the consumer wires no logger.
  const resolved = useMemo(
    () =>
      resolveSDKConfig(sdkConfig, {
        warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
      }),
    [sdkConfig, logger]
  )

  // Create the client (stable reference)
  const client = useMemo(
    () => new CoreAuthClient(resolved.clientConfig),
    [resolved.clientConfig.apiUrl, resolved.clientConfig.appName]
  )

  // Publish the live client to the ref so the store's `fetchMe` closure
  // (created once at mount) always resolves against the current client
  // instance — handles publishableKey / apiUrl rotations transparently.
  clientRef.current = client

  const resolvedWebUrl = resolved.webUrl
  const resolvedAppName = resolved.clientConfig.appName

  // Resolve auth mode — see `core/cross-origin.ts` for the full decision tree.
  // Summary:
  //   - localhost (any browser host)   → forced 'localStorage' (cross-port)
  //   - SSR (no window)                → respects the configured authMode
  //   - same eTLD+1 (api ↔ web)        → respects the configured authMode
  //                                      (defaults to 'httpOnly' when unset)
  //   - cross-origin + 'httpOnly' set  → falls back to 'localStorage' with
  //                                      a one-time warn via the injected
  //                                      logger (see helper)
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

  // Fetch the publishable-key config (REG-1-guarded), then auto-detect the
  // auth mode, then verify/refresh the token, then schedule proactive refresh.
  // These were four inline `useEffect` blocks extracted to
  // `./auth-provider/lifecycle-hooks.ts` (Wave D Lot 4). They MUST be called
  // in this exact order — React fires effects in declaration order and the
  // original sequence (keyConfig → modeSync → tokenVerify → proactiveRefresh)
  // is load-bearing.
  useKeyConfigFetch({
    resolved,
    sdkConfig,
    client,
    logger,
    keyConfigRef,
    setKeyConfigState,
    setResolvedScope,
  })

  useAuthModeSync({ effectiveMode, authMode, store, logger })

  useTokenVerification({
    accessToken: storeState.accessToken,
    refreshToken: storeState.refreshToken,
    client,
    logger,
    store,
  })

  useProactiveRefresh({
    accessToken: storeState.accessToken,
    refreshToken: storeState.refreshToken,
    client,
    logger,
    store,
  })

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

  // `clientConfig.apiUrl` includes the `/api/auth` suffix that CoreAuthClient
  // needs internally. Strip it so `useAuthApiUrl()` returns the bare base URL
  // that downstream consumers (useMaintenanceStatus, etc.) can concatenate
  // their own paths against without getting `/api/auth/api/<path>` doubles.
  const apiBaseUrl = resolved.clientConfig.apiUrl.endsWith('/api/auth')
    ? resolved.clientConfig.apiUrl.slice(0, -'/api/auth'.length)
    : resolved.clientConfig.apiUrl

  const contextValue = useMemo(
    () => ({
      client,
      appName: resolvedAppName,
      apiUrl: apiBaseUrl,
      webUrl: effectiveWebUrl,
      keyConfig: keyConfigState,
      scope: resolvedScope,
      publishableKey: sdkConfig.publishableKey,
      logoutDefaults,
    }),
    [
      client,
      resolvedAppName,
      apiBaseUrl,
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
