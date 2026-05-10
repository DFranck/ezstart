/**
 * @internal
 *
 * Context primitives shared between the public `AuthProvider`/hooks and the
 * test-only `<TestAuthProvider>`. Splitting them out keeps the
 * `auth-provider.tsx` file focused on the provider implementation while
 * letting the test helper inject mocked client + state without going
 * through all the side effects (key fetch, token verify, mode detection).
 *
 * Not exported from the package — production consumers should always go
 * through {@link AuthProvider}, {@link useAuthContext}, {@link useAuthStore}.
 */
'use client'

import { createContext } from 'react'
import type { CoreAuthClient } from '../core/auth-client.js'
import type { AuthScope, PublishableKeyConfig } from '../core/types.js'
import type { AuthStoreApi } from './store.js'

/**
 * Texts surfaced by the SDK during the logout orchestration. The hook
 * default-falls back to English when the consumer doesn't pass a value.
 *
 * Match the locale-aware keys exposed by the embedded `userMenu` dictionary
 * so consumers can wire `getAuthTexts(locale, 'userMenu')` straight through.
 */
export interface AuthLogoutTexts {
  /** Toast shown after a successful logout (step 6 of the 8-step flow). */
  signOutSuccess: string
  /** Toast shown when the local cleanup fails. Server failures are silent (best-effort). */
  signOutError: string
}

export interface AuthContextValue {
  client: CoreAuthClient
  appName: string
  /** Resolved API URL (env-aware: staging/prod/local). */
  apiUrl: string
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
  /**
   * Provider-level defaults forwarded to {@link useAuth}'s logout flow. The
   * hook's `logout()` argument can override any of these per-call (e.g. when
   * `<UserMenu>` wants its own `redirectAfterLogout`). See
   * {@link AuthProviderProps}.
   */
  logoutDefaults: {
    /**
     * Where the hard-redirect lands at step 7. `false` disables the redirect
     * entirely (the consumer takes over navigation).
     */
    redirectAfterLogout: string | false
    /**
     * Consumer hook fired between steps 4 (broadcast) and 6 (toast). Use it
     * to drop React Query cache, close WebSockets, etc.
     */
    onLogout?: () => void | Promise<void>
    /** localStorage key used by the per-Provider Zustand store (step 3). */
    storageKey: string
    /** English fallback texts for the success/error toasts. */
    texts: AuthLogoutTexts
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null)
export const AuthStoreContext = createContext<AuthStoreApi | null>(null)
