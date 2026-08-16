import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { createAuthStore, configureAuthStorage } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

describe('createAuthStore', () => {
  let store: ReturnType<typeof createAuthStore>

  beforeEach(() => {
    localStorage.clear()
    store = createAuthStore({ broadcastChannel: false })
  })

  // ─── Initial state ──────────────────────────────────────────────────────

  it('has correct initial state when no initialUser is provided', () => {
    const state = store.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoggingIn).toBe(false)
    expect(state.isLoggingOut).toBe(false)
    expect(state.mode).toBe('localStorage')
  })

  it('boots authenticated when initialUser is provided (SSR bootstrap)', () => {
    const user = createTestUser()
    const ssrStore = createAuthStore({ initialUser: user, broadcastChannel: false })
    const state = ssrStore.getState()
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isAuthReady).toBe(true)
  })

  // ─── setAuth ────────────────────────────────────────────────────────────

  it('setAuth sets user, tokens, and isAuthenticated', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'access-token', 'localStorage', 'refresh-token')
    })

    const state = store.getState()
    expect(state.user).toEqual(user)
    expect(state.accessToken).toBe('access-token')
    expect(state.refreshToken).toBe('refresh-token')
    expect(state.isAuthenticated).toBe(true)
    expect(state.mode).toBe('localStorage')
    expect(state.isLoggingIn).toBe(false) // setAuth resets isLoggingIn
  })

  it('setAuth in httpOnly mode does NOT store tokens in state', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'access-tok', 'httpOnly', 'refresh-tok')
    })

    const state = store.getState()
    expect(state.user).toEqual(user)
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(true)
    expect(state.mode).toBe('httpOnly')
  })

  // ─── setTokens ──────────────────────────────────────────────────────────

  it('setTokens updates tokens in localStorage mode', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'old-at', 'localStorage', 'old-rt')
    })
    act(() => {
      store.getState().setTokens('new-at', 'new-rt')
    })

    expect(store.getState().accessToken).toBe('new-at')
    expect(store.getState().refreshToken).toBe('new-rt')
  })

  it('setTokens in httpOnly mode does NOT mutate tokens (security)', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, undefined, 'httpOnly')
    })
    act(() => {
      store.getState().setTokens('new-at', 'new-rt')
    })

    expect(store.getState().accessToken).toBeNull()
    expect(store.getState().refreshToken).toBeNull()
  })

  // ─── logout ─────────────────────────────────────────────────────────────

  it('logout clears all auth state', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })
    act(() => {
      store.getState().logout()
    })

    const state = store.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoggingOut).toBe(false)
    expect(state.mode).toBe('localStorage')
  })

  // ─── updateUser ─────────────────────────────────────────────────────────

  it('updateUser updates only the user field', () => {
    const user = createTestUser()
    const updatedUser = { ...user, firstName: 'Updated' }
    act(() => {
      store.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })
    act(() => {
      store.getState().updateUser(updatedUser)
    })

    expect(store.getState().user?.firstName).toBe('Updated')
    expect(store.getState().accessToken).toBe('at')
  })

  // ─── getMode ────────────────────────────────────────────────────────────

  it('getMode returns the current mode', () => {
    expect(store.getState().getMode()).toBe('localStorage')

    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, undefined, 'httpOnly')
    })
    expect(store.getState().getMode()).toBe('httpOnly')
  })

  // ─── isLoggingIn / isLoggingOut ────────────────────────────────────────

  it('setLoggingIn updates isLoggingIn', () => {
    act(() => {
      store.getState().setLoggingIn(true)
    })
    expect(store.getState().isLoggingIn).toBe(true)

    act(() => {
      store.getState().setLoggingIn(false)
    })
    expect(store.getState().isLoggingIn).toBe(false)
  })

  it('setLoggingOut updates isLoggingOut', () => {
    act(() => {
      store.getState().setLoggingOut(true)
    })
    expect(store.getState().isLoggingOut).toBe(true)

    act(() => {
      store.getState().setLoggingOut(false)
    })
    expect(store.getState().isLoggingOut).toBe(false)
  })

  // ─── partialize / persistence (security) ───────────────────────────────

  it('partialize: in httpOnly mode, NEVER persists tokens to localStorage', () => {
    const user = createTestUser()
    const channelKey = 'auth-test-httponly-' + Date.now()
    const persistStore = createAuthStore({ storageKey: channelKey, broadcastChannel: false })
    act(() => {
      persistStore.getState().setAuth(user, 'secret-at', 'httpOnly', 'secret-rt')
    })

    const persisted = JSON.parse(localStorage.getItem(channelKey) ?? '{}')
    expect(persisted?.state?.accessToken).toBeNull()
    expect(persisted?.state?.refreshToken).toBeNull()
    expect(persisted?.state?.user).toBeTruthy()
    expect(persisted?.state?.isAuthenticated).toBe(true)
    expect(persisted?.state?.mode).toBe('httpOnly')
  })

  // ─── configureAuthStorage (legacy) ─────────────────────────────────────

  it('configureAuthStorage exists as a deprecated no-op API', () => {
    // Just verifies the function is callable without throwing.
    expect(() => configureAuthStorage('test-key')).not.toThrow()
  })

  // ─── multiple stores are isolated ──────────────────────────────────────

  it('multiple stores created via the factory are fully isolated', () => {
    const a = createAuthStore({ storageKey: 'a-' + Date.now(), broadcastChannel: false })
    const b = createAuthStore({ storageKey: 'b-' + Date.now(), broadcastChannel: false })

    const userA = createTestUser({ _id: 'user-a' })
    act(() => {
      a.getState().setAuth(userA, 'at-a', 'localStorage', 'rt-a')
    })

    expect(a.getState().user?._id).toBe('user-a')
    expect(b.getState().user).toBeNull()
  })
})
