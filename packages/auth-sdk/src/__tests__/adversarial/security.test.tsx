import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'
import type { AuthUser } from '../../core/types.js'

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
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
    localStorage.clear()
  })

  it('clears accessToken from state on logout', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'secret-access-token', 'localStorage', 'secret-rt')
    })
    expect(useAuthStore.getState().accessToken).toBe('secret-access-token')

    act(() => {
      useAuthStore.getState().logout()
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('never stores tokens in localStorage for httpOnly mode', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'secret-at', 'httpOnly', 'secret-rt')
    })

    // Check zustand persist storage
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
    }

    // Also check in-memory state
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  it('setTokens is a no-op in httpOnly mode (tokens stay null)', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, undefined, 'httpOnly')
    })

    // Attempt to inject tokens
    act(() => {
      useAuthStore.getState().setTokens('injected-at', 'injected-rt')
    })

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  it('localStorage is clean after logout (no stale tokens)', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at-123', 'localStorage', 'rt-456')
    })

    act(() => {
      useAuthStore.getState().logout()
    })

    const raw = localStorage.getItem('ezauth-storage')
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
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
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
        useAuthStore.getState().setAuth(user, 'tok')
      })

      // The store should store these as plain strings, never executing them
      const stored = useAuthStore.getState().user!
      expect(stored.username).toBe(payload)
      expect(stored.firstName).toBe(payload)
      expect(stored.lastName).toBe(payload)

      act(() => {
        useAuthStore.getState().logout()
      })
    }
  })

  it('XSS in avatar URL is stored as-is (React auto-escapes on render)', () => {
    const user = createTestUser({
      avatar: 'javascript:alert("xss")',
    })
    act(() => {
      useAuthStore.getState().setAuth(user, 'tok')
    })
    // The store stores the raw string — it's up to React's JSX escaping
    // to prevent execution. This test verifies the store doesn't sanitize
    // (it shouldn't — that's the render layer's job).
    expect(useAuthStore.getState().user?.avatar).toBe('javascript:alert("xss")')
  })
})

describe('State Transition Edge Cases', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('double login: second setAuth overwrites first', () => {
    const user1 = createTestUser({ _id: 'user-1', email: 'a@a.com' })
    const user2 = createTestUser({ _id: 'user-2', email: 'b@b.com' })

    act(() => {
      useAuthStore.getState().setAuth(user1, 'at1', 'localStorage', 'rt1')
    })
    act(() => {
      useAuthStore.getState().setAuth(user2, 'at2', 'localStorage', 'rt2')
    })

    expect(useAuthStore.getState().user?._id).toBe('user-2')
    expect(useAuthStore.getState().accessToken).toBe('at2')
  })

  it('logout during pending setLoggingIn', () => {
    act(() => {
      useAuthStore.getState().setLoggingIn(true)
    })
    expect(useAuthStore.getState().isLoggingIn).toBe(true)

    act(() => {
      useAuthStore.getState().logout()
    })
    // After logout, isLoggingIn should still be whatever it was
    // (logout doesn't explicitly reset isLoggingIn, but setAuth does)
    // This tests the state consistency
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('setAuth resets isLoggingIn to false', () => {
    act(() => {
      useAuthStore.getState().setLoggingIn(true)
    })
    expect(useAuthStore.getState().isLoggingIn).toBe(true)

    act(() => {
      useAuthStore.getState().setAuth(createTestUser(), 'tok')
    })
    expect(useAuthStore.getState().isLoggingIn).toBe(false)
  })

  it('logout resets isLoggingOut to false', () => {
    act(() => {
      useAuthStore.getState().setAuth(createTestUser(), 'tok')
      useAuthStore.getState().setLoggingOut(true)
    })
    expect(useAuthStore.getState().isLoggingOut).toBe(true)

    act(() => {
      useAuthStore.getState().logout()
    })
    expect(useAuthStore.getState().isLoggingOut).toBe(false)
  })

  it('updateUser does not change auth state when called without prior login', () => {
    // updateUser on an empty store should not make isAuthenticated true
    act(() => {
      useAuthStore.getState().updateUser(createTestUser())
    })
    // User is set but isAuthenticated remains false
    expect(useAuthStore.getState().user).toBeTruthy()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

describe('Mode Switching Security', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('switching from localStorage to httpOnly clears tokens from state', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at-secret', 'localStorage', 'rt-secret')
    })
    expect(useAuthStore.getState().accessToken).toBe('at-secret')

    // Switch to httpOnly
    act(() => {
      useAuthStore.getState().setAuth(user, 'at-secret', 'httpOnly', 'rt-secret')
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('partialize only persists tokens in localStorage mode', () => {
    const user = createTestUser()

    // Set in localStorage mode
    act(() => {
      useAuthStore.getState().setAuth(user, 'visible-at', 'localStorage', 'visible-rt')
    })
    let raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBe('visible-at')
      expect(stored.state?.refreshToken).toBe('visible-rt')
    }

    // Switch to httpOnly
    act(() => {
      useAuthStore.getState().setAuth(user, 'should-not-persist', 'httpOnly', 'should-not-persist')
    })
    raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const stored = JSON.parse(raw)
      expect(stored.state?.accessToken).toBeNull()
      expect(stored.state?.refreshToken).toBeNull()
    }
  })
})
