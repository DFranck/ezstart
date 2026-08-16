/**
 * Direct unit tests for the `safeRedirectUri` Zod schema primitive.
 *
 * These tests exercise the schema in isolation (without going through
 * `LoginRequestSchema` etc.). The companion H4 integration tests in
 * `./auth-requests.test.ts` cover the wiring into every request schema that
 * accepts a `redirect_uri` field.
 *
 * Extracted from the auth-shared grab-bag (Wave A R2, 2026-05-16) to keep
 * the primitive's coverage co-located with its source file.
 *
 * @see ../../auth/redirect-uri.ts
 * @see ./auth-requests.test.ts (integration via LoginRequestSchema)
 */

import { describe, expect, it } from 'vitest'

import { safeRedirectUri } from '../../auth/redirect-uri.js'

describe('safeRedirectUri — protocol allowlist', () => {
  it('accepts https://', () => {
    expect(safeRedirectUri.parse('https://example.com/callback')).toBe(
      'https://example.com/callback'
    )
  })

  it('accepts http:// (dev)', () => {
    expect(safeRedirectUri.parse('http://localhost:6111/auth/callback')).toBe(
      'http://localhost:6111/auth/callback'
    )
  })

  it('rejects javascript: scheme', () => {
    expect(() => safeRedirectUri.parse('javascript:alert(1)')).toThrow()
  })

  it('rejects data: scheme', () => {
    expect(() => safeRedirectUri.parse('data:text/html,<script>alert(1)</script>')).toThrow()
  })

  it('rejects vbscript: scheme', () => {
    expect(() => safeRedirectUri.parse('vbscript:MsgBox("XSS")')).toThrow()
  })

  it('rejects blob: scheme', () => {
    expect(() => safeRedirectUri.parse('blob:https://evil.com/uuid')).toThrow()
  })

  it('rejects file: scheme', () => {
    expect(() => safeRedirectUri.parse('file:///etc/passwd')).toThrow()
  })
})

describe('safeRedirectUri — length bound', () => {
  it('rejects URL > 2048 chars', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050)
    expect(() => safeRedirectUri.parse(longUrl)).toThrow()
  })

  it('accepts URL at exactly 2048 chars', () => {
    const url = 'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length)
    expect(safeRedirectUri.parse(url)).toHaveLength(2048)
  })
})

describe('safeRedirectUri — control character rejection (CRLF injection)', () => {
  it('rejects raw CR', () => {
    expect(() => safeRedirectUri.parse('https://example.com/\rpath')).toThrow()
  })

  it('rejects raw LF', () => {
    expect(() => safeRedirectUri.parse('https://example.com/\npath')).toThrow()
  })

  it('rejects raw TAB', () => {
    expect(() => safeRedirectUri.parse('https://example.com/\tpath')).toThrow()
  })

  it('rejects raw NUL byte', () => {
    expect(() => safeRedirectUri.parse('https://example.com/\0path')).toThrow()
  })
})

describe('safeRedirectUri — userinfo rejection (phishing primitive)', () => {
  it('rejects userinfo (https://evil@trusted.com/)', () => {
    expect(() => safeRedirectUri.parse('https://evil.com@trusted.com/')).toThrow()
  })

  it('rejects userinfo with password (https://user:pass@host/)', () => {
    expect(() => safeRedirectUri.parse('https://u:p@example.com/')).toThrow()
  })
})

describe('safeRedirectUri — fragment XSS rejection', () => {
  it('rejects fragment containing javascript:', () => {
    expect(() => safeRedirectUri.parse('https://example.com/#javascript:alert(1)')).toThrow()
  })

  it('rejects fragment with case-insensitive JavaScript:', () => {
    expect(() => safeRedirectUri.parse('https://example.com/#JavaScript:void(0)')).toThrow()
  })

  it('accepts clean fragment (non-javascript)', () => {
    expect(safeRedirectUri.parse('https://example.com/page#section-1')).toBe(
      'https://example.com/page#section-1'
    )
  })
})

describe('safeRedirectUri — IDN / homograph rejection', () => {
  it('rejects Cyrillic confusable hostname (а in "exаmple.com")', () => {
    // The second "a" in "exаmple.com" is U+0430 (Cyrillic small letter a).
    expect(() => safeRedirectUri.parse('https://exаmple.com/callback')).toThrow()
  })

  it('rejects general non-ASCII hostname (münchen.example.com)', () => {
    expect(() => safeRedirectUri.parse('https://münchen.example.com/callback')).toThrow()
  })

  it('accepts pre-encoded punycode hostname', () => {
    expect(safeRedirectUri.parse('https://xn--mnchen-3ya.example.com/callback')).toBe(
      'https://xn--mnchen-3ya.example.com/callback'
    )
  })
})

describe('safeRedirectUri — happy paths (regression checks)', () => {
  it('accepts URL with query string', () => {
    expect(safeRedirectUri.parse('https://example.com/callback?state=xyz')).toBe(
      'https://example.com/callback?state=xyz'
    )
  })

  it('accepts URL with port', () => {
    expect(safeRedirectUri.parse('https://example.com:8443/cb')).toBe('https://example.com:8443/cb')
  })

  it('accepts URL with path + query + fragment combined', () => {
    expect(safeRedirectUri.parse('https://example.com/path/cb?state=xyz#section')).toBe(
      'https://example.com/path/cb?state=xyz#section'
    )
  })

  it('rejects malformed URL string', () => {
    expect(() => safeRedirectUri.parse('not-a-url')).toThrow()
  })
})
