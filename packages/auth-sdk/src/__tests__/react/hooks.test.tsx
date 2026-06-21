import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useAuth } from '../../react/hooks.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import { createTestUser } from '../helpers.js'

describe('useAuth hook', () => {
  let store: ReturnType<typeof createTestStore>
  let mockClient: {
    exchangeCode: ReturnType<typeof vi.fn>
    getCurrentUser: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
    verifyToken: ReturnType<typeof vi.fn>
    refreshTokens: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
    mockClient = {
      exchangeCode: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
      refreshTokens: vi.fn(),
    }
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestAuthProvider store={store} client={mockClient as never}>
      {children}
    </TestAuthProvider>
  )

  it('returns default unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.accessToken).toBeNull()
    expect(result.current.isLoggingIn).toBe(false)
    expect(result.current.mode).toBe('localStorage')
  })

  it('reflects store state when authenticated', () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'access-token', 'localStorage', 'refresh-token')
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.accessToken).toBe('access-token')
  })

  it('handleCallback exchanges code and sets auth', async () => {
    const user = createTestUser()
    mockClient.exchangeCode.mockResolvedValueOnce({
      access_token: 'new-at',
      token_type: 'Bearer',
      expires_in: 3600,
      user,
      refresh_token: 'new-rt',
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    let returnedUser
    await act(async () => {
      returnedUser = await result.current.handleCallback('auth-code-xyz')
    })

    expect(returnedUser).toEqual(user)
    expect(store.getState().isAuthenticated).toBe(true)
    expect(store.getState().user).toEqual(user)
    expect(store.getState().accessToken).toBe('new-at')
  })

  it('handleCallback throws on exchange error', async () => {
    mockClient.exchangeCode.mockRejectedValueOnce(new Error('Invalid code'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.handleCallback('bad-code')
      })
    ).rejects.toThrow('Invalid code')
  })

  it('handleCallback forwards redirectUriOverride to client.exchangeCode (RFC 6749 §4.1.3)', async () => {
    // Same-origin first-party logins use a redirect_uri different from the
    // SDK-detected `/auth/callback` default (e.g. `/dashboard`). The backend
    // enforces strict equality between the redirect_uri at code creation and
    // at token exchange — handleCallback MUST forward the override so the
    // /token request echoes back the exact value sent at /login.
    const user = createTestUser()
    mockClient.exchangeCode.mockResolvedValueOnce({
      access_token: 'at',
      token_type: 'Bearer',
      expires_in: 3600,
      user,
      refresh_token: 'rt',
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.handleCallback(
        'auth-code-strict',
        'pkce-verifier',
        'http://localhost:6111/en/dashboard'
      )
    })

    expect(mockClient.exchangeCode).toHaveBeenCalledWith(
      'auth-code-strict',
      'pkce-verifier',
      'http://localhost:6111/en/dashboard'
    )
  })

  it('handleCallback omits redirectUriOverride when not provided (backward compat)', async () => {
    const user = createTestUser()
    mockClient.exchangeCode.mockResolvedValueOnce({
      access_token: 'at',
      token_type: 'Bearer',
      expires_in: 3600,
      user,
      refresh_token: 'rt',
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.handleCallback('cross-origin-code', 'pkce-verifier')
    })

    // Third arg must be undefined so `exchangeCode` falls back to
    // `ctx.redirectUri` (the SDK-detected `/auth/callback` URL). This is what
    // AuthCallbackPage relies on for the cross-origin SSO flow.
    expect(mockClient.exchangeCode).toHaveBeenCalledWith(
      'cross-origin-code',
      'pkce-verifier',
      undefined
    )
  })

  it('logout calls client.logout and clears store', async () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    mockClient.logout.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.logout()
    })

    expect(mockClient.logout).toHaveBeenCalledWith('rt')
    expect(store.getState().isAuthenticated).toBe(false)
    expect(store.getState().user).toBeNull()
  })

  it('verifyAndRefresh fetches current user in localStorage mode', async () => {
    const user = createTestUser()
    const updatedUser = createTestUser({ firstName: 'Refreshed' })
    act(() => {
      store.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    mockClient.getCurrentUser.mockResolvedValueOnce(updatedUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    let refreshedUser
    await act(async () => {
      refreshedUser = await result.current.verifyAndRefresh()
    })

    expect(refreshedUser).toEqual(updatedUser)
    expect(store.getState().user?.firstName).toBe('Refreshed')
  })

  it('verifyAndRefresh logs out on 401 error', async () => {
    const user = createTestUser()
    act(() => {
      store.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    const error = Object.assign(new Error('Unauthorized'), { status: 401 })
    mockClient.getCurrentUser.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.verifyAndRefresh()
      })
    ).rejects.toThrow()

    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('verifyAndRefresh returns null when no token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    let res
    await act(async () => {
      res = await result.current.verifyAndRefresh()
    })

    expect(res).toBeNull()
  })

  it('setLoggingIn updates the store', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.setLoggingIn(true)
    })

    expect(store.getState().isLoggingIn).toBe(true)
  })
})
