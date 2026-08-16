/**
 * AuthCallbackPage — PKCE (RFC 7636) verifier recovery from sessionStorage.
 *
 * When a same-origin OAuth/login flow stashes a `code_verifier` in
 * sessionStorage before the redirect, the callback page MUST recover it,
 * forward it to `handleCallback`, and clear it (single-use hygiene). When no
 * verifier is stored the exchange runs the legacy path (verifier undefined).
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PKCE_VERIFIER_STORAGE_KEY } from '../../core/pkce.js'

const handleCallbackMock = vi.fn()

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    handleCallback: handleCallbackMock,
    isAuthenticated: false,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  // Provide a `code` so the component takes the exchange path.
  useSearchParams: () => new URLSearchParams('code=oauth-code-abc'),
  usePathname: () => '/auth/callback',
}))

const { AuthCallbackPage } = await import('../../components/AuthCallbackPage.js')

describe('AuthCallbackPage — PKCE verifier recovery', () => {
  beforeEach(() => {
    handleCallbackMock.mockReset()
    handleCallbackMock.mockResolvedValue({ id: 'u1', email: 'user@example.com' })
    window.sessionStorage.clear()
  })

  it('recovers the stashed verifier, forwards it, and clears sessionStorage', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)

    render(<AuthCallbackPage redirectTo="/en/dashboard" />)

    await waitFor(() => {
      // AuthCallbackPage runs the cross-origin path — no redirect_uri override
      // is needed because `ctx.redirectUri` (= detectRedirectUri()) already
      // resolves to this very `/auth/callback` URL, which is the value the
      // original /login committed to (RFC 6749 §4.1.3 strict equality holds).
      expect(handleCallbackMock).toHaveBeenCalledWith('oauth-code-abc', verifier)
    })
    // Single-use hygiene — the verifier must be cleared after recovery.
    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBeNull()
  })

  it('passes undefined when no verifier is stored (legacy / backward compat)', async () => {
    render(<AuthCallbackPage redirectTo="/en/dashboard" />)

    await waitFor(() => {
      expect(handleCallbackMock).toHaveBeenCalledWith('oauth-code-abc', undefined)
    })
  })

  // MED-2 (Wave D Lot 5B) — the verifier must NOT be cleared before the
  // exchange. A transient failure (network blip, cold start) used to wipe it
  // up-front, making a retry impossible because the re-navigation found an
  // empty sessionStorage. We now keep it on failure and clear it only on
  // success.
  it('KEEPS the verifier in sessionStorage when the exchange fails (retry possible)', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
    handleCallbackMock.mockRejectedValue(new Error('Network error'))

    render(<AuthCallbackPage redirectTo="/en/dashboard" />)

    await waitFor(() => {
      expect(handleCallbackMock).toHaveBeenCalledWith('oauth-code-abc', verifier)
    })

    // The exchange failed — the verifier MUST survive so a retry can complete
    // the bound exchange. Clearing it here re-introduces MED-2.
    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBe(verifier)
  })

  it('clears the verifier ONLY after a successful exchange', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
    handleCallbackMock.mockResolvedValue({ id: 'u1', email: 'user@example.com' })

    render(<AuthCallbackPage redirectTo="/en/dashboard" />)

    await waitFor(() => {
      expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBeNull()
    })
    expect(handleCallbackMock).toHaveBeenCalledWith('oauth-code-abc', verifier)
  })
})
