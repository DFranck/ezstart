/**
 * useAuthedRedirect — T02 regression tests.
 *
 * The cross-origin SSO handoff (`POST /auth/sso/authorize`) requires a LIVE
 * ezauth credential. The persisted `isAuthenticated` flag outlives the
 * 15-minute httpOnly access cookie, so gating the handoff on the flag alone
 * fired a guaranteed 401 that, unguarded, re-fired on every re-render into a
 * 401 → 429 storm — leaving the consumer callback with no `?code=`.
 *
 * These tests pin the defenses (incl. hacker findings F1–F3):
 *  1. Revalidate (`revalidateSession`) BEFORE the handoff; tri-state result —
 *     `'expired'` clears the stale flag, `'error'` (transient) leaves state
 *     untouched, only `'live'` proceeds to sso/authorize.
 *  2. One-shot guard + latch RELEASED on incomplete teardown → a StrictMode
 *     mount→cleanup→mount (Next.js dev default) still redirects a live user
 *     (F1: no stranding) while a stable-key re-render cascade stays at 1 call.
 *  3. Microtask yield bounds the `/me` storm on a flickering key (F2).
 */
import React, { StrictMode } from 'react'
import { render, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import {
  useAuthedRedirect,
  type SessionLiveness,
} from '../../components/_internal/sign-in-form/use-authed-redirect.js'

const mockApiCall = vi.mocked(apiCall)

const originalLocation = window.location
let replaceMock: ReturnType<typeof vi.fn>

function setupLocation(origin: string): void {
  replaceMock = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      href: `${origin}/en/login`,
      origin,
      pathname: '/en/login',
      search: '',
      hash: '',
      hostname: new URL(origin).hostname,
      protocol: new URL(origin).protocol,
      host: new URL(origin).host,
      port: new URL(origin).port,
      replace: replaceMock,
      assign: vi.fn(),
    },
  })
}

function restoreLocation(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
}

interface HarnessProps {
  isAuthReady?: boolean
  isAuthenticated?: boolean
  resolvedRedirectUri?: string
  appName?: string
  revalidateSession: () => Promise<SessionLiveness>
  onStaleSession: () => void
}

function Harness({
  isAuthReady = true,
  isAuthenticated = true,
  resolvedRedirectUri = 'https://app.example.com/admin',
  appName = 'ezauth',
  revalidateSession,
  onStaleSession,
}: HarnessProps): React.ReactElement {
  useAuthedRedirect({
    isAuthReady,
    isAuthenticated,
    resolvedRedirectUri,
    appName,
    revalidateSession,
    onStaleSession,
  })
  return React.createElement('div', { 'data-testid': 'harness' })
}

describe('useAuthedRedirect — T02 SSO handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupLocation('http://localhost:6111')
  })

  afterEach(() => {
    restoreLocation()
  })

  it('does NOT call sso/authorize (and clears the stale flag) when the session is expired', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('expired')
    const onStaleSession = vi.fn()

    render(<Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />)

    await waitFor(() => {
      expect(onStaleSession).toHaveBeenCalledTimes(1)
    })
    expect(mockApiCall).not.toHaveBeenCalledWith('/auth/sso/authorize', expect.anything())
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('F3: a transient revalidation error leaves the session untouched (no clear, no handoff, no redirect)', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('error')
    const onStaleSession = vi.fn()

    render(<Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />)

    await waitFor(() => {
      expect(revalidateSession).toHaveBeenCalledTimes(1)
    })
    // The whole point of F3: a /me blip must NOT log the user out of every tab.
    expect(onStaleSession).not.toHaveBeenCalled()
    expect(mockApiCall).not.toHaveBeenCalledWith('/auth/sso/authorize', expect.anything())
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does NOT loop: a stale flag triggers revalidation exactly once (no storm)', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('expired')
    const onStaleSession = vi.fn()

    const { rerender } = render(
      <Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />
    )

    await waitFor(() => {
      expect(revalidateSession).toHaveBeenCalledTimes(1)
    })

    // Store-subscription re-render cascade: many re-renders with identical
    // triggers must NOT re-fire the revalidation or the handoff.
    for (let i = 0; i < 5; i++) {
      rerender(<Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />)
    }
    await act(async () => {
      await Promise.resolve()
    })

    expect(revalidateSession).toHaveBeenCalledTimes(1)
    expect(mockApiCall).not.toHaveBeenCalledWith('/auth/sso/authorize', expect.anything())
  })

  it('fires sso/authorize exactly once when the session IS live, then redirects with ?code=', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()
    mockApiCall.mockResolvedValueOnce({ code: 'sso-code-xyz', expiresIn: 60 })

    render(<Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />)

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        '/auth/sso/authorize',
        expect.objectContaining({
          method: 'POST',
          body: { app: 'ezauth', redirectUri: 'https://app.example.com/admin' },
        })
      )
    })
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('https://app.example.com/admin?code=sso-code-xyz')
    })
    expect(revalidateSession).toHaveBeenCalledTimes(1)
    expect(mockApiCall).toHaveBeenCalledTimes(1)
    expect(onStaleSession).not.toHaveBeenCalled()
  })

  it('F1: StrictMode mount→cleanup→mount still redirects a LIVE user (no stranding)', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()
    mockApiCall.mockResolvedValue({ code: 'sso-strict', expiresIn: 60 })

    render(
      <StrictMode>
        <Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />
      </StrictMode>
    )

    // The live user MUST end up redirected despite the double-invoke teardown.
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('https://app.example.com/admin?code=sso-strict')
    })
    // Exactly one real handoff (the cancelled attempt never reached sso/authorize).
    expect(mockApiCall).toHaveBeenCalledTimes(1)
    expect(onStaleSession).not.toHaveBeenCalled()
  })

  it('one-shot guard: toggling isAuthenticated does not re-fire the handoff', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()
    mockApiCall.mockResolvedValue({ code: 'sso-code-once', expiresIn: 60 })

    const { rerender } = render(
      <Harness
        isAuthenticated
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledTimes(1)
    })

    rerender(
      <Harness
        isAuthenticated={false}
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )
    rerender(
      <Harness
        isAuthenticated
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockApiCall).toHaveBeenCalledTimes(1)
    expect(revalidateSession).toHaveBeenCalledTimes(1)
  })

  it('F2: a flickering redirect target does not storm GET /me', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()
    mockApiCall.mockResolvedValue({ code: 'sso-flicker', expiresIn: 60 })

    const { rerender } = render(
      <Harness
        resolvedRedirectUri="https://app.example.com/admin?n=0"
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )
    // Synchronous burst of DISTINCT cross-origin targets — each re-render
    // supersedes the previous attempt BEFORE it spends a /me round-trip.
    for (let i = 1; i < 15; i++) {
      rerender(
        <Harness
          resolvedRedirectUri={`https://app.example.com/admin?n=${i}`}
          revalidateSession={revalidateSession}
          onStaleSession={onStaleSession}
        />
      )
    }
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Only the surviving (last) attempt reaches the network — not 15 calls.
    expect(revalidateSession).toHaveBeenCalledTimes(1)
    expect(mockApiCall).toHaveBeenCalledTimes(1)
  })

  it('does NOT auto-retry after a 429 from sso/authorize', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()
    const rateLimited = Object.assign(new ApiError('Rate limited', 429), { retryAfter: 1 })
    mockApiCall.mockRejectedValue(rateLimited)

    const { rerender } = render(
      <Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />
    )

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1)
    })

    for (let i = 0; i < 3; i++) {
      rerender(<Harness revalidateSession={revalidateSession} onStaleSession={onStaleSession} />)
    }
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockApiCall).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does nothing while auth is still hydrating (isAuthReady=false)', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()

    render(
      <Harness
        isAuthReady={false}
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(revalidateSession).not.toHaveBeenCalled()
    expect(mockApiCall).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirects directly (no revalidation) for a same-origin target', async () => {
    const revalidateSession = vi.fn<() => Promise<SessionLiveness>>().mockResolvedValue('live')
    const onStaleSession = vi.fn()

    render(
      <Harness
        resolvedRedirectUri="http://localhost:6111/en/dashboard"
        revalidateSession={revalidateSession}
        onStaleSession={onStaleSession}
      />
    )

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('http://localhost:6111/en/dashboard')
    })
    // Same-origin trusts the destination's RequireAuth — no /me, no sso/authorize.
    expect(revalidateSession).not.toHaveBeenCalled()
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})
