/**
 * LOW-1 regression — `AuthCallbackPage` must never surface
 * "Authentication failed" when `localStorage.getItem`/`removeItem` throws
 * (Safari private mode, storage disabled). The session is already
 * established by the time the redirect-hint bookkeeping runs, so a storage
 * failure must be swallowed and the flow must fall back to the prop default
 * redirect — NOT drop into the error branch.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
const handleCallbackMock = vi.fn().mockResolvedValue(undefined)

// Auth succeeds — the OAuth code exchange resolves cleanly.
vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: handleCallbackMock,
    isAuthenticated: false,
  }),
}))

// A non-empty `code` drives the success branch (vs the no-code error branch).
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('code=valid_oauth_code'),
  usePathname: () => '/auth/callback',
}))

const { AuthCallbackPage } = await import('../../components/AuthCallbackPage.js')

describe('AuthCallbackPage — defensive localStorage (LOW-1)', () => {
  beforeEach(() => {
    pushMock.mockClear()
    handleCallbackMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finishes the auth flow (no "Authentication failed") and falls back to the default redirect when getItem throws', async () => {
    // Safari private mode: every read throws.
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError')
    })

    render(<AuthCallbackPage redirectTo="/en/dashboard" errorTitle="Authentication failed" />)

    // Flush the 100ms processCallback delay + the async exchange.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    // The OAuth exchange ran and succeeded. The PKCE verifier read from
    // sessionStorage also threw (Safari private mode) and was swallowed →
    // verifier is undefined (legacy / backward-compat exchange).
    expect(handleCallbackMock).toHaveBeenCalledWith('valid_oauth_code', undefined)
    // getItem was attempted (and threw) — but the flow swallowed it.
    expect(getItemSpy).toHaveBeenCalledWith('ezauth_redirect_after_login')
    // CRITICAL: no error state surfaced despite the storage throw.
    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument()

    // Flush the 1500ms redirect delay — falls back to the prop default.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1600))
    })
    expect(pushMock).toHaveBeenCalledWith('/en/dashboard')
  })

  it('uses the stored redirect hint and clears it when storage works', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('/en/account')
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {})

    render(<AuthCallbackPage redirectTo="/en/dashboard" errorTitle="Authentication failed" />)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument()
    expect(removeItemSpy).toHaveBeenCalledWith('ezauth_redirect_after_login')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1600))
    })
    expect(pushMock).toHaveBeenCalledWith('/en/account')
  })

  it('does not throw when removeItem fails after a successful read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('/en/account')
    // Read works, but the clear throws (e.g. storage revoked mid-flow).
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError')
    })

    render(<AuthCallbackPage redirectTo="/en/dashboard" errorTitle="Authentication failed" />)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    // The removeItem throw must not derail the success flow.
    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1600))
    })
    expect(pushMock).toHaveBeenCalledWith('/en/account')
  })
})
