/**
 * Wave D Lot 5B + 5B.5 — PKCE (RFC 7636) on the OAuth Google redirect flow
 * (SDK side), gated by same-origin (HIGH-CO-1 regression fix).
 *
 * Before redirecting to the EZAuth `/api/auth/google` authorize endpoint,
 * `OAuthButtons` mints PKCE ONLY when the page that handles the `?code=`
 * callback lives on the SAME origin as the button (first-party ezauth login,
 * or a same-origin `redirectUri`). In that case it MUST:
 *  - mint a verifier/challenge pair,
 *  - stash the SECRET verifier in sessionStorage (per-tab, survives the Google
 *    round trip because the button + callback share an origin),
 *  - send only the public `code_challenge` + `code_challenge_method=S256` on the
 *    authorize URL.
 *
 * For a CROSS-ORIGIN SSO `redirectUri` (the consumer's `AuthCallbackPage` runs
 * on its own origin and can't read this origin's sessionStorage), it MUST skip
 * PKCE entirely — no stashed verifier, no challenge param — so the server mints
 * a legacy code the consumer can exchange on the backward-compat path.
 *
 * When `crypto.subtle` is unavailable (`generatePkcePair` throws) the
 * same-origin path also falls back to no-PKCE: no challenge param, no stashed
 * verifier.
 *
 * jsdom's default origin is `http://localhost:3000`, so a `redirectUri` under
 * `http://localhost:3000/...` is same-origin and `https://app.com/...` is
 * cross-origin.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PKCE_VERIFIER_STORAGE_KEY } from '../../core/pkce.js'

const generatePkcePairMock = vi.fn()

vi.mock('../../core/pkce.js', async () => {
  const actual = await vi.importActual<typeof import('../../core/pkce.js')>('../../core/pkce.js')
  return {
    ...actual,
    generatePkcePair: () => generatePkcePairMock(),
  }
})

const { OAuthButtons } = await import('../../components/OAuthButtons.js')

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

describe('OAuthButtons — PKCE (Lot 5B + 5B.5 same-origin gate)', () => {
  let capturedHref = ''
  let originalLocation: Location

  beforeEach(() => {
    generatePkcePairMock.mockReset()
    window.sessionStorage.clear()
    capturedHref = ''
    originalLocation = window.location
    // @ts-expect-error - jsdom location override for test
    delete window.location
    window.location = {
      ...originalLocation,
      set href(val: string) {
        capturedHref = val
      },
      get href() {
        return originalLocation.href
      },
    } as Location
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('same-origin redirectUri: stashes the verifier and appends the challenge + S256 method', async () => {
    generatePkcePairMock.mockResolvedValue({
      codeVerifier: VERIFIER,
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    })

    // jsdom origin is http://localhost:3000 → this redirectUri is same-origin.
    render(<OAuthButtons appName="myapp" redirectUri="http://localhost:3000/auth/callback" />)
    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })

    // The secret verifier is stashed (per-tab) for the same-origin callback.
    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBe(VERIFIER)

    // The public challenge + S256 method ride on the authorize URL.
    const url = new URL(capturedHref)
    expect(url.searchParams.get('app')).toBe('myapp')
    expect(url.searchParams.get('code_challenge')).toBe(CHALLENGE)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('no redirectUri (first-party ezauth): mints PKCE (callback lands on this origin)', async () => {
    generatePkcePairMock.mockResolvedValue({
      codeVerifier: VERIFIER,
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    })

    render(<OAuthButtons appName="myapp" />)
    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })

    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBe(VERIFIER)
    const url = new URL(capturedHref)
    expect(url.searchParams.get('code_challenge')).toBe(CHALLENGE)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('cross-origin SSO redirectUri: skips PKCE (legacy code so the consumer can exchange it)', async () => {
    // HIGH-CO-1: the consumer's AuthCallbackPage runs on https://app.com and
    // cannot read this origin's sessionStorage. Minting PKCE here would mint a
    // code the consumer can never redeem → broken Google login. So we MUST NOT
    // touch sessionStorage and MUST NOT add a challenge to the authorize URL.
    generatePkcePairMock.mockResolvedValue({
      codeVerifier: VERIFIER,
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    })

    render(<OAuthButtons appName="myapp" redirectUri="https://app.com/auth/callback" />)
    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })

    // PKCE never minted for a cross-origin consumer.
    expect(generatePkcePairMock).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBeNull()

    const url = new URL(capturedHref)
    expect(url.searchParams.get('code_challenge')).toBeNull()
    expect(url.searchParams.get('code_challenge_method')).toBeNull()
    // The legacy flow still carries app + the forwarded redirect_uri.
    expect(url.searchParams.get('app')).toBe('myapp')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.com/auth/callback')
  })

  it('same-origin: falls back to no-PKCE when generatePkcePair throws (old browser / no secure ctx)', async () => {
    generatePkcePairMock.mockRejectedValue(new Error('Web Crypto API unavailable'))

    render(<OAuthButtons appName="myapp" redirectUri="http://localhost:3000/auth/callback" />)
    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(capturedHref).toContain('/api/auth/google?')
    })

    // PKCE was attempted (same-origin) but threw → no verifier, no challenge.
    expect(generatePkcePairMock).toHaveBeenCalled()
    expect(window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)).toBeNull()
    const url = new URL(capturedHref)
    expect(url.searchParams.get('code_challenge')).toBeNull()
    expect(url.searchParams.get('code_challenge_method')).toBeNull()
    // The flow still proceeds with the app param.
    expect(url.searchParams.get('app')).toBe('myapp')
  })
})
