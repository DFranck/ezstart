/**
 * Unit tests for the server-side `redirect_uri` default fallback applied
 * by the `/auth/google` (authorize) route when the OAuth client omits the
 * parameter (RFC 6749 §3.1.2.4).
 *
 * Covers AUTH-OAUTH-REDIRECT-URI-SEED-001. The fallback is the canonical
 * web-app callback URL computed from `getWebUrl(app)` — the same value the
 * SDK sends at `/token` via `ctx.redirectUri`, so the HAC-HIGH-4 strict
 * equality check at code redemption passes.
 */

import { describe, it, expect } from 'vitest'
import { getDefaultRedirectUriForApp } from '../../../routes/oauth/google-authorize.js'
import { getWebUrl, type AppName } from '@ezstart/config/urls'

const FIRST_PARTY_APPS: ReadonlyArray<AppName> = [
  'ezstart',
  'ezauth',
  'ezbill',
  'ezpay',
  'fengshui',
  'asc-tcd',
  'green-pulse',
  'gacha-analyzer',
]

describe('getDefaultRedirectUriForApp (RFC 6749 §3.1.2.4 default)', () => {
  it.each(FIRST_PARTY_APPS)('returns the canonical /auth/callback URL for %s', app => {
    const expected = `${getWebUrl(app)}/auth/callback`
    expect(getDefaultRedirectUriForApp(app)).toBe(expected)
  })

  it('returns a locale-less callback path (no `/en` or `/fr` segment)', () => {
    for (const app of FIRST_PARTY_APPS) {
      const uri = getDefaultRedirectUriForApp(app)
      expect(uri).toBeDefined()
      // Per RFC 6749 §3.1.2 the allowlist match is exact — adding a locale
      // here would force `Application.redirectUris` to register every locale
      // variant. Locale routing is a framework concern, not OAuth's.
      expect(uri).not.toMatch(/\/[a-z]{2,3}\/auth\/callback$/)
      expect(uri?.endsWith('/auth/callback')).toBe(true)
    }
  })

  it('returns undefined for unknown third-party tenant slugs', () => {
    expect(getDefaultRedirectUriForApp('external-acme-corp')).toBeUndefined()
    expect(getDefaultRedirectUriForApp('')).toBeUndefined()
    expect(getDefaultRedirectUriForApp('_internal-reserved')).toBeUndefined()
  })

  it('matches what the SDK detectRedirectUri() will send at /token for first-party apps', () => {
    // The SDK computes `${window.location.origin}/auth/callback` (locale-less
    // post-2026-06-21). The backend default mirrors this so HAC-HIGH-4's
    // strict equality check at /token never trips on a default-vs-explicit
    // value drift.
    for (const app of FIRST_PARTY_APPS) {
      const backendDefault = getDefaultRedirectUriForApp(app)
      const sdkClientWouldSend = `${getWebUrl(app)}/auth/callback`
      expect(backendDefault).toBe(sdkClientWouldSend)
    }
  })
})
