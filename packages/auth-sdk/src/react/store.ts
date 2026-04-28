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
  let cleanupChannel: (() => void) | null = null
  if (
    typeof window !== 'undefined' &&
    broadcastChannel !== false &&
    typeof BroadcastChannel !== 'undefined'
  ) {
    const authChannel = new BroadcastChannel(broadcastChannel)

    authChannel.onmessage = event => {
      const { type, user, accessToken, mode, refreshToken } = event.data
      if (type === 'LOGIN') {
        baseStore.getState().setAuth(user, accessToken, mode, refreshToken)
      } else if (type === 'LOGOUT') {
        baseStore.getState().logout()
      }
    }

    // Wrap setAuth/logout to broadcast to other tabs/apps. The postMessage
    // calls are guarded with try/catch because the channel can close out
    // from under us (HMR rebuild, React StrictMode double-mount cleanup,
    // browser navigation tearing down the previous tree). The local store
    // mutation has already happened; failing to broadcast is non-fatal.
    const originalSetAuth = baseStore.getState().setAuth
    const originalLogout = baseStore.getState().logout

    let channelOpen = true

    baseStore.setState({
      setAuth: (user, accessToken, mode, refreshToken) => {
        originalSetAuth(user, accessToken, mode, refreshToken)
        if (!channelOpen) return
        try {
          authChannel.postMessage({ type: 'LOGIN', user, accessToken, mode, refreshToken })
        } catch {
          channelOpen = false
        }
      },
      logout: () => {
        originalLogout()
        if (!channelOpen) return
        try {
          authChannel.postMessage({ type: 'LOGOUT' })
        } catch {
          channelOpen = false
        }
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
