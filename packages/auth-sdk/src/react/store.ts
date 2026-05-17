'use client'

import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthMode, AuthUser } from '../core/types.js'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  mode: AuthMode
  isLoggingIn: boolean
  isLoggingOut: boolean
  isAuthReady: boolean

  // Actions
  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode, refreshToken?: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  getMode: () => AuthMode
  setLoggingIn: (isLoggingIn: boolean) => void
  setLoggingOut: (isLoggingOut: boolean) => void
}

const DEFAULT_STORAGE_KEY = 'ezauth-storage'
const DEFAULT_BROADCAST_CHANNEL = 'ezauth-sync'

/** Minimum interval (ms) between two server re-fetches triggered by a broadcast. */
const REFETCH_DEBOUNCE_MS = 1000

/**
 * Cross-tab broadcast message envelope. **Signal-only** by design — no
 * user/token payload is ever trusted from the wire (threat-model
 * HAC-HIGH-1, audited 2026-05-17): a malicious extension, an XSS payload
 * on a sibling app sharing the same root origin, or any other process
 * that can call `postMessage` on the BroadcastChannel must NOT be able
 * to inject `{ type: 'LOGIN', user: { roles: ['superadmin'] } }` and
 * elevate the privileges of every open tab.
 *
 * The receive-side treats `LOGIN` / `TOKEN_REFRESH` / `USER_UPDATED` as
 * a "hey, something changed — go check with the server" hint, then
 * re-fetches the authoritative user via the provided `fetchMe` callback
 * (typically `() => client.getCurrentUser()` which hits `/api/auth/me`).
 * The server remains the single source of truth — an attacker who can
 * spoof a broadcast still can't make the server lie.
 */
export type BroadcastMessage =
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH' }
  | { type: 'USER_UPDATED' }

/**
 * Type guard — accept only the known signal envelopes. Anything else
 * (unknown `type`, non-object payload, `null`, strings, arrays…) is
 * dropped silently. Forward-compatibility: a newer SDK version emitting
 * a future message type will be ignored by an older receiver instead of
 * crashing.
 */
export function isBroadcastMessage(data: unknown): data is BroadcastMessage {
  if (!data || typeof data !== 'object') return false
  const type = (data as { type?: unknown }).type
  return (
    type === 'LOGIN' || type === 'LOGOUT' || type === 'TOKEN_REFRESH' || type === 'USER_UPDATED'
  )
}

export interface CreateAuthStoreOptions {
  /**
   * Initial user state — typically resolved server-side via
   * `getServerAuth()` from `@ezstart/auth-sdk/server`. When provided, the
   * store boots with `{ user, isAuthenticated: true, isAuthReady: true }`
   * so subscribers see the SSR-correct value on the very first render.
   */
  initialUser?: AuthUser | null
  /** localStorage key used by the persist middleware. Defaults to `'ezauth-storage'`. */
  storageKey?: string
  /**
   * BroadcastChannel name used to keep auth state in sync across tabs and
   * apps on the same root domain. Pass `false` to disable (used in tests
   * to avoid leaking state between isolated React trees). Defaults to
   * `'ezauth-sync'`.
   */
  broadcastChannel?: string | false
  /**
   * Server re-fetch callback used when a `LOGIN` / `TOKEN_REFRESH` /
   * `USER_UPDATED` broadcast arrives from another tab. The callback MUST
   * resolve the current user from the server (typically by hitting
   * `/api/auth/me` with the current httpOnly cookie or bearer token) —
   * never trust the broadcast payload itself (cf. {@link BroadcastMessage}).
   *
   * Resolves to:
   * - `AuthUser` → store calls `setAuth(user, ...)` with the authoritative user
   * - `null` → server says "no session" → store resets (treated as logout)
   *
   * Throws / rejections are swallowed: the local state is preserved so a
   * transient network blip doesn't log the user out. Omit (or pass
   * `undefined`) and the receive-side becomes a no-op for non-LOGOUT
   * signals — useful for tests or for SDK callers that don't expose a
   * `getCurrentUser()` equivalent yet.
   */
  fetchMe?: () => Promise<AuthUser | null>
  /**
   * Override the debounce window between two consecutive server
   * re-fetches triggered by a broadcast. Defaults to 1000 ms — high
   * enough to coalesce a `LOGIN` / `TOKEN_REFRESH` storm (an attacker
   * spamming messages cannot DoS the auth API), low enough that a real
   * cross-tab login is reflected within ~1 s. Mostly meant for tests.
   */
  refetchDebounceMs?: number
}

/**
 * Auth store bound hook returned by {@link createAuthStore}. In addition
 * to the standard zustand selector signature, it exposes `getState`,
 * `setState`, `subscribe` and an internal `__cleanup()` used by the
 * provider to tear down the cross-tab channel on unmount.
 */
export type AuthStoreApi = UseBoundStore<StoreApi<AuthState>> & {
  /** Tear down the BroadcastChannel listener (called by the provider on unmount). */
  __cleanup: () => void
}

/**
 * Factory that returns a fresh auth store. **Always** call this through
 * `<AuthProvider>` (which wraps the call in `useState(() => createAuthStore(...))`
 * to guarantee a single store per React tree). Direct module-level usage
 * is forbidden — it breaks Next.js SSR (the server and client end up
 * with different stores and React throws an hydration mismatch).
 *
 * @example
 * ```tsx
 * const [store] = useState(() => createAuthStore({ initialUser }))
 * ```
 */
export function createAuthStore(options: CreateAuthStoreOptions = {}): AuthStoreApi {
  const {
    initialUser = null,
    storageKey = DEFAULT_STORAGE_KEY,
    broadcastChannel = DEFAULT_BROADCAST_CHANNEL,
    fetchMe,
    refetchDebounceMs = REFETCH_DEBOUNCE_MS,
  } = options

  const baseStore = create<AuthState>()(
    persist(
      (set, get) => ({
        user: initialUser,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: !!initialUser,
        mode: 'localStorage', // Will be auto-detected on first use
        isLoggingIn: false,
        isLoggingOut: false,
        isAuthReady: !!initialUser,

        setAuth: (
          user: AuthUser,
          accessToken?: string,
          mode: AuthMode = 'localStorage',
          refreshToken?: string
        ) => {
          set({
            user,
            accessToken: mode === 'localStorage' ? (accessToken ?? null) : null,
            // In httpOnly mode the refresh token lives in a server-side cookie;
            // never hold it in JS memory or localStorage.
            refreshToken: mode === 'localStorage' ? (refreshToken ?? null) : null,
            isAuthenticated: true,
            mode,
            isLoggingIn: false,
          })
        },

        setTokens: (accessToken: string, refreshToken: string) => {
          set(state => ({
            ...state,
            accessToken: state.mode === 'localStorage' ? accessToken : null,
            refreshToken: state.mode === 'localStorage' ? refreshToken : null,
          }))
        },

        logout: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoggingOut: false,
            mode: 'localStorage', // Reset to default
          })
        },

        updateUser: (user: AuthUser) => {
          set(state => ({
            ...state,
            user,
          }))
        },

        getMode: () => get().mode,

        setLoggingIn: (isLoggingIn: boolean) => {
          set({ isLoggingIn })
        },

        setLoggingOut: (isLoggingOut: boolean) => {
          set({ isLoggingOut })
        },
      }),
      {
        name: storageKey,
        partialize: state => ({
          user: state.user,
          // Only persist accessToken in localStorage mode.
          accessToken: state.mode === 'localStorage' ? state.accessToken : null,
          // httpOnly mode stores the refresh token in a server-side cookie — NEVER
          // mirror it to localStorage (XSS would otherwise hand an attacker a
          // long-lived credential).
          refreshToken: state.mode === 'localStorage' ? state.refreshToken : null,
          isAuthenticated: state.isAuthenticated,
          mode: state.mode,
        }),
        onRehydrateStorage: () => rehydratedState => {
          // Mark auth as ready after zustand rehydrates from localStorage.
          // Also ensure isAuthenticated is true if the user was already authenticated
          // (covers edge cases where the callback fires late or not at all).
          //
          // Important: if `initialUser` was provided to the factory, the store
          // already booted with `isAuthReady: true` and a user. The persist
          // middleware will overwrite that with whatever is in localStorage —
          // which in httpOnly mode is empty and would clobber the SSR user.
          // Restore from initialUser when the rehydrated payload is empty.
          baseStore.setState(prev => ({
            ...prev,
            isAuthReady: true,
            ...(rehydratedState?.isAuthenticated && rehydratedState?.user
              ? { isAuthenticated: true }
              : initialUser && !rehydratedState?.user
                ? {
                    user: initialUser,
                    isAuthenticated: true,
                  }
                : {}),
          }))
        },
      }
    )
  )

  // ── Cross-tab/cross-app synchronization ───────────────────────────────
  //
  // The BroadcastChannel name is window-global, so multiple Provider
  // instances (ezauth web + ezpay web on the same origin tree) all join
  // the same bus and stay in sync — even though each Provider owns its
  // own store. Tests opt out via `{ broadcastChannel: false }` so
  // isolated React trees don't leak state.
  //
  // SECURITY (HAC-HIGH-1, 2026-05-17): the receive-side NEVER trusts the
  // broadcast payload. `LOGIN` / `TOKEN_REFRESH` / `USER_UPDATED` are
  // signals only — the store re-fetches the authoritative user via
  // `fetchMe()` (typically `/api/auth/me`). An attacker (malicious
  // extension, XSS on a sibling app sharing the root origin) cannot
  // forge `{ type: 'LOGIN', user: { roles: ['superadmin'] } }` and
  // elevate every open tab's privileges, because the server is the
  // single source of truth. See {@link BroadcastMessage}.
  let cleanupChannel: (() => void) | null = null
  if (
    typeof window !== 'undefined' &&
    broadcastChannel !== false &&
    typeof BroadcastChannel !== 'undefined'
  ) {
    const authChannel = new BroadcastChannel(broadcastChannel)

    // Capture the unwrapped actions BEFORE the wrappers replace them.
    // The broadcast handler MUST use these unwrapped versions when it
    // applies the server-fetched user — calling the wrapped `setAuth`
    // from the receive-side would re-emit a LOGIN broadcast and create
    // an infinite ping-pong between every connected tab.
    const originalSetAuth = baseStore.getState().setAuth
    const originalLogout = baseStore.getState().logout

    // Debounce re-fetches so an attacker spamming broadcast messages
    // cannot DoS the auth API. A single timer is enough — we only ever
    // need to know "the server state may have changed, sync again".
    let lastRefetchAt = 0
    let refetchInFlight = false

    const refetchAndApply = async () => {
      if (!fetchMe) return
      const now = Date.now()
      if (now - lastRefetchAt < refetchDebounceMs) return
      if (refetchInFlight) return
      lastRefetchAt = now
      refetchInFlight = true
      try {
        const user = await fetchMe()
        if (user) {
          // Re-use the store's current mode + tokens — the broadcast does
          // not (and must not) carry credentials. In httpOnly mode the
          // refresh flow happens server-side via the cookie; in
          // localStorage mode the access/refresh tokens already live in
          // this tab's state (a true cross-tab login requires the user
          // to re-login here too — broadcast is a hint, not a token
          // transport).
          //
          // Use the UNWRAPPED `originalSetAuth` — calling the wrapped
          // version would re-broadcast LOGIN to every peer tab and
          // trigger an infinite ping-pong.
          const current = baseStore.getState()
          originalSetAuth(
            user,
            current.accessToken ?? undefined,
            current.mode,
            current.refreshToken ?? undefined
          )
        } else {
          // Server says "no session" → reset state. Use the unwrapped
          // logout for the same reason — we don't want to bounce a
          // LOGOUT signal back to the peer that triggered the re-fetch.
          originalLogout()
        }
      } catch {
        // Best-effort: a transient network blip must never log the user
        // out. Keep the current local state; the next broadcast (or the
        // provider's periodic `verifyToken` tick) will retry.
      } finally {
        refetchInFlight = false
      }
    }

    authChannel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data
      if (!isBroadcastMessage(data)) {
        // Unknown / spoofed / malformed payloads are silently dropped.
        return
      }
      if (data.type === 'LOGOUT') {
        // LOGOUT is the only signal safe to act on without a server
        // round-trip: a malicious LOGOUT broadcast can only DENY service
        // (the worst it does is log the user out of the current tab),
        // never escalate privileges. The peer tab that emitted LOGOUT
        // has already called POST /api/auth/logout server-side, so any
        // subsequent fetch would 401 anyway.
        //
        // Use the UNWRAPPED `originalLogout` to avoid re-broadcasting
        // LOGOUT to peers (the originator already sent it).
        originalLogout()
        return
      }
      // LOGIN / TOKEN_REFRESH / USER_UPDATED → re-fetch authoritative state.
      void refetchAndApply()
    }

    // Wrap setAuth/logout to broadcast SIGNAL-ONLY envelopes to other
    // tabs/apps. The user/token payload is deliberately omitted from
    // the wire — peer tabs re-fetch from the server (see onmessage
    // above). The postMessage calls are guarded with try/catch because
    // the channel can close out from under us (HMR rebuild, React
    // StrictMode double-mount cleanup, browser navigation tearing down
    // the previous tree). The local store mutation has already happened;
    // failing to broadcast is non-fatal.
    let channelOpen = true

    const safePost = (message: BroadcastMessage) => {
      if (!channelOpen) return
      try {
        authChannel.postMessage(message)
      } catch {
        channelOpen = false
      }
    }

    baseStore.setState({
      setAuth: (user, accessToken, mode, refreshToken) => {
        originalSetAuth(user, accessToken, mode, refreshToken)
        safePost({ type: 'LOGIN' })
      },
      logout: () => {
        originalLogout()
        safePost({ type: 'LOGOUT' })
      },
    })

    cleanupChannel = () => {
      channelOpen = false
      authChannel.close()
    }
  }

  // Wrap the bound hook with the `__cleanup` augmentation. The persist
  // middleware extends the store type at the value level, but for the
  // public surface we expose only the base `UseBoundStore<StoreApi<AuthState>>`
  // shape — the persist-internal `persist.*` namespace is an SDK detail.
  // The double cast (`as unknown as`) is needed because TS can't see that
  // the persist-wrapped store is structurally a superset of the base store.
  const useStore = baseStore as unknown as AuthStoreApi
  useStore.__cleanup = () => {
    cleanupChannel?.()
  }

  return useStore
}

/**
 * Configure the localStorage key globally. Kept for backwards
 * compatibility — prefer passing `storageKey` to {@link createAuthStore}
 * (or to `<AuthProvider storageKey="...">`).
 *
 * @deprecated Pass `storageKey` to `<AuthProvider>` instead.
 */
let _legacyStorageKey: string | undefined
export function configureAuthStorage(key: string) {
  _legacyStorageKey = key
}

/** @internal Read by the provider when no explicit storageKey is passed. */
export function getLegacyStorageKey(): string | undefined {
  return _legacyStorageKey
}
