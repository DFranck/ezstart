import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { createTestStore } from '../testProvider.js'
import type { AuthStoreApi } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

/**
 * Adversarial / hacker tests for auth-sdk.
 *
 * These verify that the SDK handles security-critical edge cases correctly:
 * - Token storage is cleared on logout
 * - XSS payloads in user fields don't execute
 * - httpOnly mode never leaks tokens to JS
 * - State transitions are safe under race conditions
 */

describe('Token Storage Security', () => {
  let store: AuthStoreApi
  const STORAGE_KEY = 'ezauth-test-storage-security'

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore({ storageKey: STORAGE_KEY })
  })

  it('clears accessToken from state on logout', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'secret-access-token', 'localStorage', 'secret-rt')
    })
    expect(store.getState().accessToken).toBe('secret-access-token')

    act(() => {
      store.getState().logout()
    })
    expect(store.getState().accessToken).toBeNull()
    expect(store.getState().refreshToken).toBeNull()
    expect(store.getState().user).toBeNull()
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('never stores tokens in localStorage for httpOnly mode', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'secret-at', 'httpOnly', 'secret-rt')
    })

    // Check zustand persist storage
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
    }

    // Also check in-memory state
    expect(store.getState().accessToken).toBeNull()
    expect(store.getState().refreshToken).toBeNull()
  })

  it('setTokens is a no-op in httpOnly mode (tokens stay null)', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, undefined, 'httpOnly')
    })

    // Attempt to inject tokens
    act(() => {
      store.getState().setTokens('injected-at', 'injected-rt')
    })

    expect(store.getState().accessToken).toBeNull()
    expect(store.getState().refreshToken).toBeNull()
  })

  it('localStorage is clean after logout (no stale tokens)', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'at-123', 'localStorage', 'rt-456')
    })

    act(() => {
      store.getState().logout()
    })

    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
      expect(stored.state?.isAuthenticated).toBe(false)
      expect(stored.state?.user).toBeNull()
    }
  })
})

describe('XSS in User Fields', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('stores XSS payload in user fields without executing (store is data, not HTML)', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      "javascript:alert('xss')",
      '<svg/onload=alert(1)>',
    ]

    for (const payload of xssPayloads) {
      const user = createTestUser({
        username: payload,
        email: `${payload}@evil.com`,
        firstName: payload,
        lastName: payload,
      })

      act(() => {
        store.getState().setAuth(user, 'tok')
      })

      // The store should store these as plain strings, never executing them
      const stored = store.getState().user!
      expect(stored.username).toBe(payload)
      expect(stored.firstName).toBe(payload)
      expect(stored.lastName).toBe(payload)

      act(() => {
        store.getState().logout()
      })
    }
  })

  it('XSS in avatar URL is stored as-is (React auto-escapes on render)', () => {
    const user = createTestUser({
      avatar: 'javascript:alert("xss")',
    })
    act(() => {
      store.getState().setAuth(user, 'tok')
    })
    expect(store.getState().user?.avatar).toBe('javascript:alert("xss")')
  })
})

describe('State Transition Edge Cases', () => {
  let store: AuthStoreApi

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
  })

  it('double login: second setAuth overwrites first', () => {
    const user1 = createTestUser({ _id: 'user-1', email: 'a@a.com' })
    const user2 = createTestUser({ _id: 'user-2', email: 'b@b.com' })

    act(() => {
      store.getState().setAuth(user1, 'at1', 'localStorage', 'rt1')
    })
    act(() => {
      store.getState().setAuth(user2, 'at2', 'localStorage', 'rt2')
    })

    expect(store.getState().user?._id).toBe('user-2')
    expect(store.getState().accessToken).toBe('at2')
  })

  it('logout during pending setLoggingIn', () => {
    act(() => {
      store.getState().setLoggingIn(true)
    })
    expect(store.getState().isLoggingIn).toBe(true)

    act(() => {
      store.getState().logout()
    })
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('setAuth resets isLoggingIn to false', () => {
    act(() => {
      store.getState().setLoggingIn(true)
    })
    expect(store.getState().isLoggingIn).toBe(true)

    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
    })
    expect(store.getState().isLoggingIn).toBe(false)
  })

  it('logout resets isLoggingOut to false', () => {
    act(() => {
      store.getState().setAuth(createTestUser(), 'tok')
      store.getState().setLoggingOut(true)
    })
    expect(store.getState().isLoggingOut).toBe(true)

    act(() => {
      store.getState().logout()
    })
    expect(store.getState().isLoggingOut).toBe(false)
  })

  it('updateUser does not change auth state when called without prior login', () => {
    act(() => {
      store.getState().updateUser(createTestUser())
    })
    expect(store.getState().user).toBeTruthy()
    expect(store.getState().isAuthenticated).toBe(false)
  })
})

describe('Mode Switching Security', () => {
  let store: AuthStoreApi
  const STORAGE_KEY = 'ezauth-test-storage-mode'

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore({ storageKey: STORAGE_KEY })
  })

  it('switching from localStorage to httpOnly clears tokens from state', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'at-secret', 'localStorage', 'rt-secret')
    })
    expect(store.getState().accessToken).toBe('at-secret')

    // Switch to httpOnly
    act(() => {
      store.getState().setAuth(user, 'at-secret', 'httpOnly', 'rt-secret')
    })
    expect(store.getState().accessToken).toBeNull()
    expect(store.getState().refreshToken).toBeNull()
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it('partialize only persists tokens in localStorage mode', () => {
    const user = createTestUser()

    // Set in localStorage mode
    act(() => {
      store.getState().setAuth(user, 'visible-at', 'localStorage', 'visible-rt')
    })
    let raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBe('visible-at')
      expect(stored.state?.refreshToken).toBe('visible-rt')
    }

    // Switch to httpOnly
    act(() => {
      store.getState().setAuth(user, 'should-not-persist', 'httpOnly', 'should-not-persist')
    })
    raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
    }
  })
})
