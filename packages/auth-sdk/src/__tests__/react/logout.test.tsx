/**
 * Coverage for the canonical 8-step logout orchestrator exposed by
 * `useAuth().logout()` (cf. standard-sdk-dx.md §11ter).
 *
 * The flow is:
 *   1. POST /api/auth/logout (server revoke — best-effort)
 *   2. Reset Zustand store (user=null, isAuthenticated=false, isLoggingOut=false)
 *   3. Explicit `localStorage.removeItem(storageKey)` (defensive purge)
 *   4. Cross-tab BroadcastChannel notification (handled inside step 2's
 *      wrapped store.logout() — covered separately in store tests)
 *   5. Run consumer `onLogout` hook (provider default OR per-call override)
 *   6. Toast confirmation (skipped when `silent: true`)
 *   7. Hard `window.location.assign()` redirect
 *   8. `isLoggingOut: true` is set BEFORE step 1 (subscribers can render a spinner)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { toast } from 'sonner'

// Spy on api-sdk's `bumpLogoutEpoch` BEFORE importing the auth-sdk hook so
// the mock is in place when the module captures the binding. This proves
// the Wave C CRIT-2 fix is actually wired end-to-end: `logout()` MUST
// signal the api-sdk refresh helper before clearing the store, otherwise
// a refresh in-flight at logout time silently re-hydrates fresh tokens.
//
// `vi.hoisted` is required: `vi.mock` is itself hoisted ABOVE top-level
// const declarations, so a plain `const spy = vi.fn()` would still be
// `undefined` when the mock factory runs. Hoisting the spy alongside the
// mock keeps the binding ready in time.
const { bumpLogoutEpochSpy } = vi.hoisted(() => ({
  bumpLogoutEpochSpy: vi.fn(),
}))
vi.mock('@ezstart/api-sdk/core', async () => {
  const actual =
    await vi.importActual<typeof import('@ezstart/api-sdk/core')>('@ezstart/api-sdk/core')
  return { ...actual, bumpLogoutEpoch: bumpLogoutEpochSpy }
})

import { useAuth } from '../../react/hooks.js'
import { createAuthStore, type AuthStoreApi } from '../../react/store.js'
import { AuthContext, AuthStoreContext } from '../../react/__contexts.js'
import type { CoreAuthClient } from '../../core/auth-client.js'
import { createTestUser } from '../helpers.js'

interface MockClient {
  exchangeCode: ReturnType<typeof vi.fn>
  getCurrentUser: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
  verifyToken: ReturnType<typeof vi.fn>
  refreshTokens: ReturnType<typeof vi.fn>
  getApiUrl: () => string
  getAppName: () => string
  setApiUrl: () => void
  setAppName: () => void
  updateProfile: ReturnType<typeof vi.fn>
  deleteAccount: ReturnType<typeof vi.fn>
}

function createMockClient(): MockClient {
  return {
    exchangeCode: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn(),
    refreshTokens: vi.fn(),
    getApiUrl: () => 'http://localhost:6110/api/auth',
    getAppName: () => 'testapp',
    setApiUrl: () => {},
    setAppName: () => {},
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
  }
}

function makeWrapper(opts: {
  store: AuthStoreApi
  client: MockClient
  onLogout?: () => void | Promise<void>
  redirectAfterLogout?: string | false
  storageKey?: string
}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthStoreContext.Provider value={opts.store}>
        <AuthContext.Provider
          value={{
            client: opts.client as unknown as CoreAuthClient,
            appName: 'testapp',
            webUrl: 'http://localhost:6111',
            scope: 'live',
            publishableKey: undefined,
            keyConfig: null,
            logoutDefaults: {
              redirectAfterLogout: opts.redirectAfterLogout ?? false,
              onLogout: opts.onLogout,
              storageKey: opts.storageKey ?? 'ezauth-storage-test',
              texts: {
                signOutSuccess: 'Signed out',
                signOutError: 'Sign-out failed',
              },
            },
          }}
        >
          {children}
        </AuthContext.Provider>
      </AuthStoreContext.Provider>
    )
  }
}

describe('useAuth().logout() — 8-step orchestrator', () => {
  let store: AuthStoreApi
  let client: MockClient
  let assignSpy: ReturnType<typeof vi.fn>
  let originalLocation: Location

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    bumpLogoutEpochSpy.mockClear()
    // Force a unique storage key per test so persist rehydration from a
    // previous test does not pollute the new store.
    const key = `ezauth-test-${Math.random().toString(36).slice(2)}`
    store = createAuthStore({ broadcastChannel: false, storageKey: key })
    client = createMockClient()

    // Pre-seed an authenticated session so logout has something to clear.
    act(() => {
      store.getState().setAuth(createTestUser(), 'access-tok', 'localStorage', 'refresh-tok')
    })

    // Replace window.location with a stub so step 7 doesn't throw
    // "Not implemented" in jsdom AND we can observe the redirect target.
    // jsdom locks the descriptor so vi.spyOn(window.location, 'assign')
    // throws "Cannot redefine property" — work around by swapping the
    // whole `location` reference.
    originalLocation = window.location
    assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, assign: assignSpy, href: originalLocation.href },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('runs the full 8-step sequence in order on a successful logout', async () => {
    const onLogoutHook = vi.fn().mockResolvedValue(undefined)
    // Spy on Storage.prototype so we capture the call regardless of which
    // localStorage instance the SDK reaches at runtime (jsdom recreates the
    // storage layer per test in some configurations).
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
    const Wrapper = makeWrapper({
      store,
      client,
      onLogout: onLogoutHook,
      redirectAfterLogout: '/goodbye',
      storageKey: 'logout-test-storage',
    })

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    // Sanity: pre-seeded session is reflected in the hook output.
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).not.toBeNull()

    await act(async () => {
      await result.current.logout()
    })

    // Step 1 — server revoke called with the refresh token.
    expect(client.logout).toHaveBeenCalledTimes(1)
    expect(client.logout).toHaveBeenCalledWith('refresh-tok')

    // Steps 2 + 8 — store reset (isAuthenticated false, user null, isLoggingOut false).
    const finalState = store.getState()
    expect(finalState.user).toBeNull()
    expect(finalState.isAuthenticated).toBe(false)
    expect(finalState.isLoggingOut).toBe(false)
    expect(finalState.accessToken).toBeNull()
    expect(finalState.refreshToken).toBeNull()

    // Step 3 — explicit localStorage purge targets the configured key.
    expect(removeItemSpy).toHaveBeenCalledWith('logout-test-storage')

    // Step 5 — consumer hook fired exactly once.
    expect(onLogoutHook).toHaveBeenCalledTimes(1)

    // Step 6 — success toast emitted.
    expect(toast.success).toHaveBeenCalledWith('Signed out')

    // Step 7 — hard redirect to the configured target.
    expect(assignSpy).toHaveBeenCalledWith('/goodbye')

    removeItemSpy.mockRestore()
  })

  it('continues local cleanup when the server logout call fails', async () => {
    const onLogoutHook = vi.fn().mockResolvedValue(undefined)
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
    client.logout.mockRejectedValueOnce(new Error('Network down'))

    const Wrapper = makeWrapper({
      store,
      client,
      onLogout: onLogoutHook,
      redirectAfterLogout: '/bye',
      storageKey: 'logout-fail-storage',
    })

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    let returned: { serverFailed: boolean; errorText: string } | undefined
    await act(async () => {
      returned = await result.current.logout()
    })

    // The server call was attempted and failed.
    expect(client.logout).toHaveBeenCalledTimes(1)
    expect(returned?.serverFailed).toBe(true)

    // Steps 2 + 3 + 5 + 6 + 7 STILL ran despite the server failure.
    expect(store.getState().isAuthenticated).toBe(false)
    expect(store.getState().user).toBeNull()
    expect(removeItemSpy).toHaveBeenCalledWith('logout-fail-storage')
    expect(onLogoutHook).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(assignSpy).toHaveBeenCalledWith('/bye')

    removeItemSpy.mockRestore()
  })

  it('exposes isLoggingOut: true while the server call is in flight (step 8)', async () => {
    // Hold the server response open with a manual deferred so we can sample
    // the store mid-flight.
    let resolveServer!: () => void
    const serverPromise = new Promise<void>(resolve => {
      resolveServer = resolve
    })
    client.logout.mockReturnValueOnce(serverPromise)

    const Wrapper = makeWrapper({ store, client, redirectAfterLogout: false })
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    // Kick off the logout but DO NOT await it yet.
    let logoutPromise: Promise<unknown>
    act(() => {
      logoutPromise = result.current.logout()
    })

    // While the server is still pending, isLoggingOut MUST be true.
    expect(store.getState().isLoggingOut).toBe(true)

    // Release the server response and await the full flow.
    resolveServer()
    await act(async () => {
      await logoutPromise
    })

    // After the orchestrator finishes, the store reset (step 2) cleared
    // isLoggingOut back to false — subscribers can rely on this transition.
    expect(store.getState().isLoggingOut).toBe(false)
  })

  it('skips the success toast when called with silent: true', async () => {
    const Wrapper = makeWrapper({ store, client, redirectAfterLogout: false })
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.logout({ silent: true })
    })

    expect(toast.success).not.toHaveBeenCalled()
    // Local cleanup still ran.
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('honors per-call overrides over provider defaults', async () => {
    const providerHook = vi.fn()
    const callHook = vi.fn().mockResolvedValue(undefined)

    const Wrapper = makeWrapper({
      store,
      client,
      onLogout: providerHook,
      redirectAfterLogout: '/provider-default',
    })
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.logout({
        onLogout: callHook,
        redirectAfterLogout: '/per-call-target',
        texts: { signOutSuccess: 'Per-call success' },
      })
    })

    // Per-call hook used, provider default ignored.
    expect(callHook).toHaveBeenCalledTimes(1)
    expect(providerHook).not.toHaveBeenCalled()
    // Per-call redirect used.
    expect(assignSpy).toHaveBeenCalledWith('/per-call-target')
    // Per-call toast text used.
    expect(toast.success).toHaveBeenCalledWith('Per-call success')
  })

  it('does not redirect when redirectAfterLogout === false', async () => {
    const Wrapper = makeWrapper({ store, client, redirectAfterLogout: false })
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.logout()
    })

    expect(assignSpy).not.toHaveBeenCalled()
    // Local cleanup still ran.
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('wires bumpLogoutEpoch BEFORE any other logout side-effect (CRIT-2)', async () => {
    // Track call order across (a) bumpLogoutEpoch (api-sdk signal),
    // (b) the server-side logout POST, and (c) the local store reset.
    // The contract: bump MUST land first so any refresh in-flight at this
    // very moment discards its resulting tokens instead of re-hydrating
    // the store post-logout.
    const callOrder: string[] = []
    bumpLogoutEpochSpy.mockImplementation(() => {
      callOrder.push('bump')
    })
    client.logout.mockImplementation(async () => {
      callOrder.push('server')
    })

    // Patch the store's `logout` action to record when the reset runs.
    const originalStoreLogout = store.getState().logout
    store.setState({
      logout: () => {
        callOrder.push('storeReset')
        originalStoreLogout()
      },
    })

    const Wrapper = makeWrapper({ store, client, redirectAfterLogout: false })
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.logout()
    })

    // Exactly one bump per logout call.
    expect(bumpLogoutEpochSpy).toHaveBeenCalledTimes(1)

    // Order matters: bump → server POST → store reset. The bump being
    // first is the security invariant we are testing; anything later
    // would leave a window where an in-flight refresh can re-hydrate the
    // store after the server already revoked the refresh token.
    expect(callOrder[0]).toBe('bump')
    expect(callOrder.indexOf('bump')).toBeLessThan(callOrder.indexOf('storeReset'))
    expect(callOrder.indexOf('bump')).toBeLessThan(callOrder.indexOf('server'))

    // Final state sanity — full flow still ran end-to-end.
    expect(store.getState().isAuthenticated).toBe(false)
  })
})
