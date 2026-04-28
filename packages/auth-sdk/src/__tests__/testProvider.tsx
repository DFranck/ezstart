/**
 * Test-only provider that wires a `createAuthStore` instance into the
 * Context plumbing without hitting the real `AuthProvider`'s side
 * effects (key fetching, token verify polling, mode auto-detect, etc.).
 *
 * Use this in unit tests so:
 * - Each test gets an isolated store (no module-level singleton pollution)
 * - You can mutate state via `store.getState().setAuth(...)` and read via
 *   `store.getState()` exactly like the legacy module-level API
 * - Components inside the provider observe the same store you control from
 *   the test body
 */

import React, { type ReactNode } from 'react'
import { type CoreAuthClient } from '../core/auth-client.js'
import type { AuthScope, PublishableKeyConfig } from '../core/types.js'
import { AuthContext, AuthStoreContext } from '../react/__contexts.js'
import { createAuthStore, type AuthStoreApi, type CreateAuthStoreOptions } from '../react/store.js'

export interface TestAuthProviderProps {
  children: ReactNode
  storeOptions?: CreateAuthStoreOptions
  /** Pre-created store (overrides storeOptions). */
  store?: AuthStoreApi
  /** Optional client mock (defaults to a no-op mock). */
  client?: Partial<CoreAuthClient>
  appName?: string
  webUrl?: string
  scope?: AuthScope
  publishableKey?: string
  keyConfig?: PublishableKeyConfig | null
}

const noopClient = {
  getApiUrl: () => 'http://localhost:6110/api/auth',
  getAppName: () => 'testapp',
  setApiUrl: () => {},
  setAppName: () => {},
  exchangeCode: async () => ({}),
  getCurrentUser: async () => null,
  logout: async () => undefined,
  verifyToken: async () => true,
  refreshTokens: async () => ({}),
  updateProfile: async () => ({}),
  deleteAccount: async () => ({}),
} as unknown as CoreAuthClient

export function TestAuthProvider({
  children,
  store: providedStore,
  storeOptions,
  client = noopClient,
  appName = 'testapp',
  webUrl = 'http://localhost:6111',
  scope = 'live',
  publishableKey,
  keyConfig = null,
}: TestAuthProviderProps) {
  const [store] = React.useState(
    () => providedStore ?? createAuthStore({ broadcastChannel: false, ...storeOptions })
  )

  return (
    <AuthStoreContext.Provider value={store}>
      <AuthContext.Provider
        value={{
          client: client as CoreAuthClient,
          appName,
          webUrl,
          scope,
          publishableKey,
          keyConfig,
        }}
      >
        {children}
      </AuthContext.Provider>
    </AuthStoreContext.Provider>
  )
}

/** Helper for tests that need a standalone store reference. */
export function createTestStore(options: CreateAuthStoreOptions = {}): AuthStoreApi {
  // Each test store gets a unique storageKey by default so persist
  // rehydration from a previous test in the same file doesn't pollute
  // the new store. Tests that explicitly assert against the localStorage
  // key (e.g. "tokens never persisted in httpOnly mode") can pin a key.
  return createAuthStore({
    broadcastChannel: false,
    storageKey: `ezauth-test-${Math.random().toString(36).slice(2)}`,
    ...options,
  })
}
