/**
 * DevModeBanner — first-party early-return regression tests.
 *
 * Bug 5 (2026-04-25):
 *   On ezauth web (mode="first-party"), the SignInForm always passed
 *   `appName` as `overrideAppName` to DevModeBanner. The banner's
 *   `if (scope === 'first-party' && !overrideAppName) return null` guard
 *   could therefore never fire, leaking a "Dev Mode — No API key
 *   configured" hint onto ezauth's own /login pages.
 *
 *   Fix (Option A, in SignInForm/SignUpForm/ForgotPasswordForm): only pass
 *   `appName` to DevModeBanner when the parent surfaced a real URL signal
 *   (`urlKey` or `keyStatus`). These tests pin DevModeBanner's contract so
 *   the regression cannot return.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Provider mocks — mutated per-test to flip `scope` / `publishableKey`.
// ---------------------------------------------------------------------------

const authState = {
  scope: 'first-party' as 'first-party' | 'live' | 'test' | 'admin',
  publishableKey: undefined as string | undefined,
}

vi.mock('../../react/hooks.js', () => ({
  useAuth: () => ({
    scope: authState.scope,
    publishableKey: authState.publishableKey,
  }),
}))

vi.mock('../../react/auth-provider.js', () => ({
  useAuthContext: () => ({
    appName: 'ezauth',
    webUrl: 'http://localhost:6111',
  }),
}))

const { DevModeBanner } = await import('../../components/DevModeBanner.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * `<DevModeBanner>` defers actual rendering to a `useEffect`-driven mount
 * flag (avoids hydration mismatch). Wrap renders in `act` so the post-mount
 * state flush is captured before assertions.
 */
function renderBanner(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>
  act(() => {
    result = render(ui)
  })
  return result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DevModeBanner — first-party early return', () => {
  beforeEach(() => {
    authState.scope = 'first-party'
    authState.publishableKey = undefined
    vi.clearAllMocks()
  })

  it('renders nothing when scope is first-party and no override appName is provided', () => {
    renderBanner(<DevModeBanner />)
    // Wrapper Div carries data-testid="Div" via the @ezstart/ui mock — its
    // absence proves the early `return null` branch fired.
    expect(screen.queryByTestId('Div')).toBeNull()
    expect(screen.queryByText(/Dev Mode/i)).toBeNull()
    expect(screen.queryByText(/No API key configured/i)).toBeNull()
  })

  it('renders the banner when first-party but an override appName is forced (legacy ?app= or ?key= flow)', () => {
    renderBanner(<DevModeBanner appName="ezauth" />)
    // Without a publishable key the dev banner falls into the "No API key
    // configured" branch — proves the early return did NOT fire when an
    // override is present.
    expect(screen.getByText(/No API key configured/i)).toBeInTheDocument()
  })

  it('renders the banner when first-party and a valid keyStatus is reported', () => {
    renderBanner(<DevModeBanner appName="ezauth" keyStatus="valid" urlKey="ez_pk_test_abc123" />)
    // The "valid" branch shows the resolved app name + key fingerprint.
    expect(screen.getByText(/Key:/i)).toBeInTheDocument()
  })

  it('renders the banner when first-party and an invalid keyStatus is reported', () => {
    renderBanner(<DevModeBanner appName="ezauth" keyStatus="invalid" urlKey="ez_pk_test_bad999" />)
    expect(screen.getByText(/Invalid API Key/i)).toBeInTheDocument()
  })

  it('renders the banner when scope is not first-party (e.g. live consumer app)', () => {
    authState.scope = 'live'
    authState.publishableKey = 'ez_pk_live_xyz789'
    renderBanner(<DevModeBanner />)
    // `live` scope with a configured key resolves to the standard label —
    // the first-party guard is irrelevant here.
    expect(screen.getByText(/Live/)).toBeInTheDocument()
  })

  it('renders the banner when scope is admin (platform-wide)', () => {
    authState.scope = 'admin'
    authState.publishableKey = 'ez_pk_live_admin'
    renderBanner(<DevModeBanner />)
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
  })
})
