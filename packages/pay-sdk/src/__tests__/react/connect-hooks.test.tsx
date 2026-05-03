/**
 * Tests for Stripe Connect hooks.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { PayProvider } from '../../react/pay-provider.js'
import { useConnectStatus } from '../../react/hooks/useConnectStatus.js'
import { useConnectOnboard } from '../../react/hooks/useConnectOnboard.js'
import { useConnectDashboardLink } from '../../react/hooks/useConnectDashboardLink.js'
import { useConnectDisconnect } from '../../react/hooks/useConnectDisconnect.js'
import { setupFetchMock, makeConnectedAccount } from '../helpers.js'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// useConnectStatus
// ---------------------------------------------------------------------------

describe('useConnectStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads connected account on mount', async () => {
    const account = makeConnectedAccount()
    setupFetchMock([
      {
        url: '/connect/status',
        response: { success: true, data: { connectedAccount: account } },
      },
    ])

    const { result } = renderHook(() => useConnectStatus(), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.account).toBeTruthy()
    expect(result.current.account?.stripeAccountId).toBe('acct_test123')
    expect(result.current.error).toBeNull()
  })

  it('handles null connected account', async () => {
    setupFetchMock([
      {
        url: '/connect/status',
        response: { success: true, data: { connectedAccount: null } },
      },
    ])

    const { result } = renderHook(() => useConnectStatus(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.account).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('does not load when autoLoad=false', async () => {
    const fetchMock = setupFetchMock([
      { url: '/connect/status', response: { success: true, data: { connectedAccount: null } } },
    ])

    const { result } = renderHook(() => useConnectStatus({ autoLoad: false }), {
      wrapper: Wrapper,
    })

    await new Promise(r => setTimeout(r, 50))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.account).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('handles fetch errors gracefully', async () => {
    setupFetchMock([
      {
        url: '/connect/status',
        response: { error: 'Unauthorized' },
        status: 401,
      },
    ])

    const { result } = renderHook(() => useConnectStatus(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.account).toBeNull()
  })

  it('refetch reloads data', async () => {
    setupFetchMock([
      {
        url: '/connect/status',
        response: { success: true, data: { connectedAccount: null } },
      },
    ])

    const { result } = renderHook(() => useConnectStatus(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.account).toBeNull()

    // Now set up a new response for the refetch
    setupFetchMock([
      {
        url: '/connect/status',
        response: { success: true, data: { connectedAccount: makeConnectedAccount() } },
      },
    ])

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.account).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// useConnectOnboard
// ---------------------------------------------------------------------------

describe('useConnectOnboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns account link URL on success', async () => {
    setupFetchMock([
      {
        url: '/connect/onboard',
        method: 'POST',
        response: {
          success: true,
          data: {
            accountLinkUrl: 'https://connect.stripe.com/setup/test',
            connectedAccount: makeConnectedAccount({ status: 'pending' }),
          },
        },
      },
    ])

    const { result } = renderHook(() => useConnectOnboard(), { wrapper: Wrapper })

    expect(result.current.isPending).toBe(false)

    let response: Awaited<ReturnType<typeof result.current.onboard>> | undefined
    await act(async () => {
      response = await result.current.onboard({
        email: 'test@example.com',
        businessName: 'Test Business',
        type: 'standard',
      })
    })

    expect(response?.accountLinkUrl).toBe('https://connect.stripe.com/setup/test')
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    setupFetchMock([
      {
        url: '/connect/onboard',
        method: 'POST',
        response: { error: 'Invalid email' },
        status: 400,
      },
    ])

    const { result } = renderHook(() => useConnectOnboard(), { wrapper: Wrapper })

    await act(async () => {
      try {
        await result.current.onboard({
          email: 'bad',
          businessName: 'Test',
          type: 'standard',
        })
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isPending).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// useConnectDashboardLink
// ---------------------------------------------------------------------------

describe('useConnectDashboardLink', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns dashboard URL', async () => {
    setupFetchMock([
      {
        url: '/connect/dashboard-link',
        response: {
          success: true,
          data: { loginLinkUrl: 'https://dashboard.stripe.com/test' },
        },
      },
    ])

    const { result } = renderHook(() => useConnectDashboardLink(), { wrapper: Wrapper })

    let url: string | null = null
    await act(async () => {
      url = await result.current.openDashboard()
    })

    expect(url).toBe('https://dashboard.stripe.com/test')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('returns null and sets error on failure', async () => {
    setupFetchMock([
      {
        url: '/connect/dashboard-link',
        response: { error: 'Not connected' },
        status: 403,
      },
    ])

    const { result } = renderHook(() => useConnectDashboardLink(), { wrapper: Wrapper })

    let url: string | null = null
    await act(async () => {
      url = await result.current.openDashboard()
    })

    expect(url).toBeNull()
    expect(result.current.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// useConnectDisconnect
// ---------------------------------------------------------------------------

describe('useConnectDisconnect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true on successful disconnect', async () => {
    setupFetchMock([
      {
        url: '/connect/disconnect',
        method: 'DELETE',
        response: { success: true },
      },
    ])

    const { result } = renderHook(() => useConnectDisconnect(), { wrapper: Wrapper })

    let success = false
    await act(async () => {
      success = await result.current.disconnect()
    })

    expect(success).toBe(true)
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error on failure', async () => {
    setupFetchMock([
      {
        url: '/connect/disconnect',
        method: 'DELETE',
        response: { error: 'Cannot disconnect' },
        status: 400,
      },
    ])

    const { result } = renderHook(() => useConnectDisconnect(), { wrapper: Wrapper })

    let success = false
    await act(async () => {
      success = await result.current.disconnect()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('forwards applicationId as a query string when provided', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/connect/disconnect?applicationId=app_123',
        method: 'DELETE',
        response: { success: true },
      },
    ])

    const { result } = renderHook(() => useConnectDisconnect(), { wrapper: Wrapper })

    let success = false
    await act(async () => {
      success = await result.current.disconnect({ applicationId: 'app_123' })
    })

    expect(success).toBe(true)
    // Verify fetch was called with the scoped URL — `setupFetchMock` matches
    // with `String.includes`, so this asserts the query string actually made
    // it through the SDK layer.
    const calledUrls = fetchMock.mock.calls.map(call => {
      const input = call[0] as string | URL | Request
      return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    })
    expect(calledUrls.some(u => u.includes('applicationId=app_123'))).toBe(true)
  })

  it('omits the query string when no applicationId is provided', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/connect/disconnect',
        method: 'DELETE',
        response: { success: true },
      },
    ])

    const { result } = renderHook(() => useConnectDisconnect(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.disconnect()
    })

    const calledUrls = fetchMock.mock.calls.map(call => {
      const input = call[0] as string | URL | Request
      return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    })
    expect(calledUrls.some(u => u.endsWith('/connect/disconnect'))).toBe(true)
  })
})
