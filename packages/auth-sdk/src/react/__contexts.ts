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

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null)
export const AuthStoreContext = createContext<AuthStoreApi | null>(null)
