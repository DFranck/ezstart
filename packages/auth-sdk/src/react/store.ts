'use client'

import type { StoreApi, UseBoundStore } from 'zustand'
import type { AuthUser } from '../core/types.js'
import { attachCrossTabSync, REFETCH_DEBOUNCE_MS } from './store/broadcast.js'
import { createBaseAuthStore, type AuthState } from './store/state.js'

// Re-export the state shape so `import { AuthState } from './store.js'` keeps
// working unchanged (consumers + tests rely on this exact path).
export type { AuthState }

// Re-export the broadcast signal envelope + type guard. Tests import
// `isBroadcastMessage` / `BroadcastMessage` directly from `./store.js`.
export { isBroadcastMessage } from './store/broadcast.js'
export type { BroadcastMessage } from './store/broadcast.js'

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

  const baseStore = createBaseAuthStore({ initialUser, storageKey })

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
  const cleanupChannel = attachCrossTabSync(baseStore, {
    broadcastChannel,
    fetchMe,
    refetchDebounceMs,
  })

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
