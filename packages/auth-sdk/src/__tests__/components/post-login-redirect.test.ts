/**
 * Unit tests for `buildPostLoginRedirect`, the helper that decides between
 * the cross-origin SSO code flow (append `?code=` and `?theme=`) and the
 * same-origin first-party redirect (no query params).
 *
 * Regression coverage for the infinite-redirect bug where ezauth dogfooding
 * its own `/admin` page received `?code=` it could not exchange, sending
 * `RequireAuth` straight back to `/login?redirect_uri=...&code=...`.
 */
import { describe, it, expect } from 'vitest'
import { buildPostLoginRedirect } from '../../components/postLoginRedirect.js'

describe('buildPostLoginRedirect', () => {
  describe('same-origin (first-party app dogfood)', () => {
    it('returns the URL untouched when redirectUri matches the current origin', () => {
      const result = buildPostLoginRedirect(
        'http://localhost:6111/en/admin',
        'auth-code-123',
        'dark',
        'http://localhost:6111'
      )
      expect(result).toBe('http://localhost:6111/en/admin')
    })

    it('does NOT append `?code=` for same-origin redirects', () => {
      const result = buildPostLoginRedirect(
        'https://ezauth.example.com/en/admin',
        'should-not-leak',
        undefined,
        'https://ezauth.example.com'
      )
      expect(result).not.toContain('code=')
      expect(result).not.toContain('should-not-leak')
    })

    it('does NOT append `?theme=` for same-origin redirects', () => {
      const result = buildPostLoginRedirect(
        'https://ezauth.example.com/dashboard',
        'auth-code-123',
        'dark',
        'https://ezauth.example.com'
      )
      expect(result).not.toContain('theme=')
    })

    it('preserves pre-existing query params on same-origin redirects', () => {
      const result = buildPostLoginRedirect(
        'https://ezauth.example.com/dashboard?tab=keys',
        'auth-code-123',
        'dark',
        'https://ezauth.example.com'
      )
      expect(result).toBe('https://ezauth.example.com/dashboard?tab=keys')
    })

    it('treats matching protocol+host+port as same-origin', () => {
      const result = buildPostLoginRedirect(
        'http://localhost:6111/admin',
        'code-abc',
        'light',
        'http://localhost:6111'
      )
      expect(result).toBe('http://localhost:6111/admin')
    })

    it('treats different ports as cross-origin (defensive)', () => {
      const result = buildPostLoginRedirect(
        'http://localhost:6131/auth/callback',
        'code-abc',
        'dark',
        'http://localhost:6111'
      )
      expect(result).toContain('code=code-abc')
      expect(result).toContain('theme=dark')
    })

    it('treats http vs https on same host as cross-origin (defensive)', () => {
      const result = buildPostLoginRedirect(
        'https://ezauth.example.com/admin',
        'code-abc',
        undefined,
        'http://ezauth.example.com'
      )
      expect(result).toContain('code=code-abc')
    })
  })

  describe('cross-origin (foreign consumer SSO)', () => {
    it('appends `?code=` for cross-origin redirects', () => {
      const result = buildPostLoginRedirect(
        'https://consumer.example.com/auth/callback',
        'auth-code-xyz',
        undefined,
        'https://ezauth.example.com'
      )
      expect(result).toBe('https://consumer.example.com/auth/callback?code=auth-code-xyz')
    })

    it('appends both `?code=` and `?theme=` when theme is provided', () => {
      const result = buildPostLoginRedirect(
        'https://consumer.example.com/auth/callback',
        'auth-code-xyz',
        'dark',
        'https://ezauth.example.com'
      )
      const url = new URL(result)
      expect(url.searchParams.get('code')).toBe('auth-code-xyz')
      expect(url.searchParams.get('theme')).toBe('dark')
    })

    it('omits `?theme=` when themePref is undefined', () => {
      const result = buildPostLoginRedirect(
        'https://consumer.example.com/auth/callback',
        'auth-code-xyz',
        undefined,
        'https://ezauth.example.com'
      )
      expect(result).not.toContain('theme=')
    })

    it('omits `?theme=` when themePref is empty string', () => {
      const result = buildPostLoginRedirect(
        'https://consumer.example.com/auth/callback',
        'auth-code-xyz',
        '',
        'https://ezauth.example.com'
      )
      expect(result).not.toContain('theme=')
    })

    it('preserves pre-existing query params on cross-origin redirects', () => {
      const result = buildPostLoginRedirect(
        'https://consumer.example.com/callback?next=/dashboard',
        'auth-code-xyz',
        'light',
        'https://ezauth.example.com'
      )
      const url = new URL(result)
      expect(url.searchParams.get('next')).toBe('/dashboard')
      expect(url.searchParams.get('code')).toBe('auth-code-xyz')
      expect(url.searchParams.get('theme')).toBe('light')
    })

    it('forwards the full ezpay → ezauth → ezpay/auth/callback flow', () => {
      // Real-world cross-origin scenario: user signs in on ezauth to get
      // back to an ezpay-hosted callback page that exchanges the code.
      const result = buildPostLoginRedirect(
        'https://pay.ezstart.xyz/en/auth/callback',
        'live-code-123',
        'system',
        'https://ezauth.ezstart.xyz'
      )
      const url = new URL(result)
      expect(url.origin).toBe('https://pay.ezstart.xyz')
      expect(url.pathname).toBe('/en/auth/callback')
      expect(url.searchParams.get('code')).toBe('live-code-123')
      expect(url.searchParams.get('theme')).toBe('system')
    })
  })
})
