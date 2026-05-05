import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '@ezstart/auth-sdk'
import { useAuthGate } from '../useAuthGate'

// Mock @ezstart/auth-sdk's useAuth hook so we can drive isAuthReady /
// isAuthenticated independently of the actual store.
vi.mock('@ezstart/auth-sdk', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function buildAuthState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    isAuthenticated: false,
    isAuthReady: false,
    isAuthenticating: false,
    isLoggingOut: false,
    mode: 'localStorage',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    refreshUserSilent: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>
}

describe('useAuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // The race-condition fix: cross-origin staging boots with
  // `{ isAuthenticated: false, isAuthReady: false }` because SSR
  // `getServerAuth()` cannot read a cross-origin cookie. The Zustand persist
  // `onRehydrateStorage` callback then async-restores the user from
  // localStorage. The OLD redirect effect (no isAuthReady gate) fired on first
  // paint and bounced the authed user to /login → infinite loop.
  // -------------------------------------------------------------------------
  it('does NOT call onRedirect during the pre-hydration window (isAuthReady=false)', () => {
    const onRedirect = vi.fn()
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: false, isAuthenticated: false, user: null })
    )

    const { result } = renderHook(() => useAuthGate({ onRedirect }))

    expect(onRedirect).not.toHaveBeenCalled()
    expect(result.current.isAuthReady).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('does NOT call onRedirect when persist hydrates with an authed user (isAuthReady=true, isAuthenticated=true)', () => {
    const onRedirect = vi.fn()
    const authedUser = { _id: 'u1', email: 'a@b.c', username: 'alice' }
    mockedUseAuth.mockReturnValue(
      buildAuthState({
        isAuthReady: true,
        isAuthenticated: true,
        // @ts-expect-error — minimal fixture, AuthUser has more fields but we
        // only need _id/email/username for the gate logic.
        user: authedUser,
      })
    )

    const { result } = renderHook(() => useAuthGate({ onRedirect }))

    expect(onRedirect).not.toHaveBeenCalled()
    expect(result.current.isAuthReady).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(authedUser)
  })

  it('calls onRedirect exactly once when persist hydrates with no user (isAuthReady=true, isAuthenticated=false)', () => {
    const onRedirect = vi.fn()
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: true, isAuthenticated: false, user: null })
    )

    renderHook(() => useAuthGate({ onRedirect }))

    expect(onRedirect).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onRedirect on the first render then call it once after hydration completes anonymous (race-condition fix)', () => {
    const onRedirect = vi.fn()

    // Pre-hydration render: store reports `isAuthReady: false`
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: false, isAuthenticated: false, user: null })
    )
    const { rerender } = renderHook(() => useAuthGate({ onRedirect }))
    expect(onRedirect).not.toHaveBeenCalled()

    // Post-hydration render: store now reports `isAuthReady: true` AND
    // confirms anonymous (no user in localStorage)
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: true, isAuthenticated: false, user: null })
    )
    rerender()
    expect(onRedirect).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onRedirect when hydration restores a user (race-condition fix — happy path)', () => {
    const onRedirect = vi.fn()

    // Pre-hydration render: store reports `isAuthReady: false`
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: false, isAuthenticated: false, user: null })
    )
    const { rerender } = renderHook(() => useAuthGate({ onRedirect }))
    expect(onRedirect).not.toHaveBeenCalled()

    // Post-hydration render: persist restored the authed user from
    // localStorage, store flips to `isAuthReady: true, isAuthenticated: true`
    const authedUser = { _id: 'u1', email: 'a@b.c', username: 'alice' }
    mockedUseAuth.mockReturnValue(
      buildAuthState({
        isAuthReady: true,
        isAuthenticated: true,
        // @ts-expect-error — minimal user fixture
        user: authedUser,
      })
    )
    rerender()
    expect(onRedirect).not.toHaveBeenCalled()
  })

  it('does NOT re-call onRedirect on subsequent renders when the auth state is stable', () => {
    const onRedirect = vi.fn()
    mockedUseAuth.mockReturnValue(
      buildAuthState({ isAuthReady: true, isAuthenticated: false, user: null })
    )

    const { rerender } = renderHook(() => useAuthGate({ onRedirect }))
    expect(onRedirect).toHaveBeenCalledTimes(1)

    rerender()
    rerender()
    rerender()

    expect(onRedirect).toHaveBeenCalledTimes(1)
  })
})
