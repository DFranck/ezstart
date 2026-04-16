import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore, configureAuthStorage, useAuthStoreSSR } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useAuthStore.getState().logout()
      useAuthStore.setState({ isAuthReady: false })
    })
    localStorage.clear()
  })

  // ─── Initial state ──────────────────────────────────────────────────────

  it('has correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoggingIn).toBe(false)
    expect(state.isLoggingOut).toBe(false)
    expect(state.mode).toBe('localStorage')
  })

  // ─── setAuth ────────────────────────────────────────────────────────────

  it('setAuth sets user, tokens, and isAuthenticated', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'access-token', 'localStorage', 'refresh-token')
    })

    const state = useAuthStore.getState()
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
      useAuthStore.getState().setAuth(user, 'access-tok', 'httpOnly', 'refresh-tok')
    })

    const state = useAuthStore.getState()
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
      useAuthStore.getState().setAuth(user, 'old-at', 'localStorage', 'old-rt')
    })
    act(() => {
      useAuthStore.getState().setTokens('new-at', 'new-rt')
    })

    expect(useAuthStore.getState().accessToken).toBe('new-at')
    expect(useAuthStore.getState().refreshToken).toBe('new-rt')
  })

  it('setTokens does NOT update tokens in httpOnly mode', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, undefined, 'httpOnly')
    })
    act(() => {
      useAuthStore.getState().setTokens('new-at', 'new-rt')
    })

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  // ─── logout ─────────────────────────────────────────────────────────────

  it('logout clears all auth state', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })
    act(() => {
      useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoggingOut).toBe(false)
    expect(state.mode).toBe('localStorage') // Reset to default
  })

  // ─── updateUser ─────────────────────────────────────────────────────────

  it('updateUser replaces user while keeping other state', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    const updatedUser = createTestUser({ firstName: 'Updated' })
    act(() => {
      useAuthStore.getState().updateUser(updatedUser)
    })

    expect(useAuthStore.getState().user?.firstName).toBe('Updated')
    expect(useAuthStore.getState().accessToken).toBe('at')
  })

  // ─── getMode ────────────────────────────────────────────────────────────

  it('getMode returns the current auth mode', () => {
    expect(useAuthStore.getState().getMode()).toBe('localStorage')

    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, undefined, 'httpOnly')
    })
    expect(useAuthStore.getState().getMode()).toBe('httpOnly')
  })

  // ─── setLoggingIn / setLoggingOut ───────────────────────────────────────

  it('setLoggingIn toggles the flag', () => {
    act(() => {
      useAuthStore.getState().setLoggingIn(true)
    })
    expect(useAuthStore.getState().isLoggingIn).toBe(true)

    act(() => {
      useAuthStore.getState().setLoggingIn(false)
    })
    expect(useAuthStore.getState().isLoggingIn).toBe(false)
  })

  it('setLoggingOut toggles the flag', () => {
    act(() => {
      useAuthStore.getState().setLoggingOut(true)
    })
    expect(useAuthStore.getState().isLoggingOut).toBe(true)

    act(() => {
      useAuthStore.getState().setLoggingOut(false)
    })
    expect(useAuthStore.getState().isLoggingOut).toBe(false)
  })

  // ─── persist (partialize) ──────────────────────────────────────────────

  it('does NOT persist tokens in httpOnly mode to localStorage', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'secret-at', 'httpOnly', 'secret-rt')
    })

    // Check what zustand persisted
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
    }
  })
})

// ─── useAuthStoreSSR ──────────────────────────────────────────────────────

describe('useAuthStoreSSR', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('returns default state before mount (SSR)', () => {
    const { result } = renderHook(() => useAuthStoreSSR())
    // Before useEffect fires, user should be null
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('returns real store state after mount', async () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    const { result } = renderHook(() => useAuthStoreSSR())

    // After mount, useEffect sets mounted=true
    // We need to wait for the effect
    await act(async () => {})

    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
  })
})

// ─── configureAuthStorage ─────────────────────────────────────────────────

describe('configureAuthStorage', () => {
  it('is callable without error', () => {
    expect(() => configureAuthStorage('custom-key')).not.toThrow()
  })
})
