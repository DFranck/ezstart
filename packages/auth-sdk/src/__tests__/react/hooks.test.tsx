import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useAuthStore } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

// Mock the auth-provider to provide context
vi.mock('../../react/auth-provider.js', () => {
  const mockClient = {
    getApiUrl: () => 'http://localhost:6110/api/auth',
    getAppName: () => 'testapp',
    exchangeCode: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    refreshTokens: vi.fn(),
  }

  return {
    useAuthContext: () => ({
      client: mockClient,
      appName: 'testapp',
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    __mockClient: mockClient,
  }
})

const { useAuth } = await import('../../react/hooks.js')
const { __mockClient: mockClient } = (await import('../../react/auth-provider.js')) as unknown as {
  __mockClient: {
    exchangeCode: ReturnType<typeof vi.fn>
    getCurrentUser: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
    verifyToken: ReturnType<typeof vi.fn>
    refreshTokens: ReturnType<typeof vi.fn>
  }
}

describe('useAuth hook', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout()
    })
    vi.clearAllMocks()
  })

  it('returns default unauthenticated state', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.accessToken).toBeNull()
    expect(result.current.isLoggingIn).toBe(false)
    expect(result.current.mode).toBe('localStorage')
  })

  it('reflects store state when authenticated', () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'access-token', 'localStorage', 'refresh-token')
    })

    const { result } = renderHook(() => useAuth())
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

    const { result } = renderHook(() => useAuth())

    let returnedUser
    await act(async () => {
      returnedUser = await result.current.handleCallback('auth-code-xyz')
    })

    expect(returnedUser).toEqual(user)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().accessToken).toBe('new-at')
  })

  it('handleCallback throws on exchange error', async () => {
    mockClient.exchangeCode.mockRejectedValueOnce(new Error('Invalid code'))

    const { result } = renderHook(() => useAuth())

    await expect(
      act(async () => {
        await result.current.handleCallback('bad-code')
      })
    ).rejects.toThrow('Invalid code')
  })

  it('logout calls client.logout and clears store', async () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    mockClient.logout.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.logout()
    })

    expect(mockClient.logout).toHaveBeenCalledWith('rt')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('verifyAndRefresh fetches current user in localStorage mode', async () => {
    const user = createTestUser()
    const updatedUser = createTestUser({ firstName: 'Refreshed' })
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    mockClient.getCurrentUser.mockResolvedValueOnce(updatedUser)

    const { result } = renderHook(() => useAuth())

    let refreshedUser
    await act(async () => {
      refreshedUser = await result.current.verifyAndRefresh()
    })

    expect(refreshedUser).toEqual(updatedUser)
    expect(useAuthStore.getState().user?.firstName).toBe('Refreshed')
  })

  it('verifyAndRefresh logs out on 401 error', async () => {
    const user = createTestUser()
    act(() => {
      useAuthStore.getState().setAuth(user, 'at', 'localStorage', 'rt')
    })

    const error = Object.assign(new Error('Unauthorized'), { status: 401 })
    mockClient.getCurrentUser.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useAuth())

    await expect(
      act(async () => {
        await result.current.verifyAndRefresh()
      })
    ).rejects.toThrow()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('verifyAndRefresh returns null when no token', async () => {
    const { result } = renderHook(() => useAuth())

    let res
    await act(async () => {
      res = await result.current.verifyAndRefresh()
    })

    expect(res).toBeNull()
  })

  it('setLoggingIn updates the store', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.setLoggingIn(true)
    })

    expect(useAuthStore.getState().isLoggingIn).toBe(true)
  })
})
