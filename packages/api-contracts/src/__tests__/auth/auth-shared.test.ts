/**
 * Tests for `src/auth/auth-shared.ts` — primitives shared between request
 * and response schemas:
 * - SupportedLocaleSchema
 * - EmailOverrideSchema (+ H2 injection vectors)
 * - AuthUserSchema (+ C-2 field preservation)
 * - redactAuthUser helper (A2 fix)
 * - HTML_DANGEROUS_PRIMITIVE bypass coverage (A4-new fix)
 */

import { describe, expect, it } from 'vitest'
import {
  AuthUserSchema,
  EmailOverrideSchema,
  redactAuthUser,
  SENSITIVE_AUTH_USER_KEYS,
  SupportedLocaleSchema,
} from '../../auth.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  username: 'testuser',
  isVerified: true,
  apps: ['myapp'],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// SupportedLocaleSchema
// ---------------------------------------------------------------------------

describe('SupportedLocaleSchema', () => {
  it('accepts valid locales', () => {
    expect(SupportedLocaleSchema.parse('en')).toBe('en')
    expect(SupportedLocaleSchema.parse('fr')).toBe('fr')
    expect(SupportedLocaleSchema.parse('vi')).toBe('vi')
  })

  it('rejects invalid locales', () => {
    expect(() => SupportedLocaleSchema.parse('de')).toThrow()
    expect(() => SupportedLocaleSchema.parse('')).toThrow()
    expect(() => SupportedLocaleSchema.parse(42)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// EmailOverrideSchema (basic)
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(EmailOverrideSchema.parse({})).toEqual({})
  })

  it('accepts all valid fields', () => {
    const full = {
      subject: 'Hello',
      heading: 'Welcome',
      intro: 'Hi there',
      ctaLabel: 'Click me',
      outro: 'Goodbye',
      from: 'noreply@example.com',
      replyTo: 'support@example.com',
      bodyHtml: '<h1>Hi</h1>',
    }
    expect(EmailOverrideSchema.parse(full)).toEqual(full)
  })

  it('rejects invalid email in from/replyTo', () => {
    expect(() => EmailOverrideSchema.parse({ from: 'not-an-email' })).toThrow()
    expect(() => EmailOverrideSchema.parse({ replyTo: 'bad' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// AuthUserSchema (basic)
// ---------------------------------------------------------------------------

describe('AuthUserSchema', () => {
  it('parses a minimal valid user', () => {
    const result = AuthUserSchema.parse(validUser)
    expect(result._id).toBe(validUser._id)
    expect(result.email).toBe(validUser.email)
  })

  it('parses a user with all optional fields', () => {
    const full = {
      ...validUser,
      firstName: 'Jane',
      lastName: 'Doe',
      avatar: 'https://example.com/avatar.png',
      roles: ['admin'],
      permissions: ['read:all'],
      features: ['beta'],
      organizationId: 'org_1',
      managedBy: 'user_0',
    }
    const result = AuthUserSchema.parse(full)
    expect(result.roles).toEqual(['admin'])
    expect(result.features).toEqual(['beta'])
  })

  it('rejects missing required fields', () => {
    expect(() => AuthUserSchema.parse({})).toThrow()
    expect(() => AuthUserSchema.parse({ _id: '1' })).toThrow()
    const { email: _, ...noEmail } = validUser
    expect(() => AuthUserSchema.parse(noEmail)).toThrow()
  })

  it('rejects wrong types', () => {
    expect(() => AuthUserSchema.parse({ ...validUser, isVerified: 'yes' })).toThrow()
    expect(() => AuthUserSchema.parse({ ...validUser, apps: 'myapp' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// C-2 — AuthUserSchema preserves RBAC + 2FA fields (2026-05-15)
//
// Previous schema silently stripped `twoFactorEnabled`, `globalRoles`,
// `appRoles`, `hasSetOwnPassword`, `mustChangePassword`, `promoCode`,
// `lastActiveAt`. A consumer wiring `AuthUserSchema.parse(serverResponse)`
// got an `AuthUser` shaped object with NO 2FA flag and NO superadmin role,
// silently disabling every downstream RBAC gate.
// Fix: schema aligned with `auth-sdk/src/core/types.ts:AuthUser` + `.passthrough()`.
// ---------------------------------------------------------------------------

describe('AuthUserSchema — C-2 field preservation', () => {
  it('preserves twoFactorEnabled: true', () => {
    const result = AuthUserSchema.parse({ ...validUser, twoFactorEnabled: true })
    expect(result.twoFactorEnabled).toBe(true)
  })

  it('preserves twoFactorEnabled: false', () => {
    const result = AuthUserSchema.parse({ ...validUser, twoFactorEnabled: false })
    expect(result.twoFactorEnabled).toBe(false)
  })

  it('preserves twoFactorVerifiedAt (nullable ISO string)', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      twoFactorVerifiedAt: '2025-04-01T00:00:00.000Z',
    })
    expect(result.twoFactorVerifiedAt).toBe('2025-04-01T00:00:00.000Z')

    const nullResult = AuthUserSchema.parse({ ...validUser, twoFactorVerifiedAt: null })
    expect(nullResult.twoFactorVerifiedAt).toBeNull()
  })

  it('preserves globalRoles array', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      globalRoles: ['superadmin', 'support'],
    })
    expect(result.globalRoles).toEqual(['superadmin', 'support'])
  })

  it('preserves appRoles record', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      appRoles: { ezauth: ['admin'], ezpay: ['readonly'] },
    })
    expect(result.appRoles).toEqual({ ezauth: ['admin'], ezpay: ['readonly'] })
  })

  it('preserves hasSetOwnPassword', () => {
    const result = AuthUserSchema.parse({ ...validUser, hasSetOwnPassword: true })
    expect(result.hasSetOwnPassword).toBe(true)
  })

  it('preserves mustChangePassword', () => {
    const result = AuthUserSchema.parse({ ...validUser, mustChangePassword: true })
    expect(result.mustChangePassword).toBe(true)
  })

  it('preserves promoCode', () => {
    const result = AuthUserSchema.parse({ ...validUser, promoCode: 'BLACKFRIDAY' })
    expect(result.promoCode).toBe('BLACKFRIDAY')
  })

  it('preserves lastActiveAt (nullable)', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      lastActiveAt: '2025-05-15T10:00:00.000Z',
    })
    expect(result.lastActiveAt).toBe('2025-05-15T10:00:00.000Z')

    const nullResult = AuthUserSchema.parse({ ...validUser, lastActiveAt: null })
    expect(nullResult.lastActiveAt).toBeNull()
  })

  it('preserves UNKNOWN forward-compatible fields via .passthrough()', () => {
    // A future ezauth version adds `betaFeatureEnrollments: string[]` —
    // older consumers MUST still see this field, not have it silently dropped.
    const result = AuthUserSchema.parse({
      ...validUser,
      betaFeatureEnrollments: ['feature-x', 'feature-y'],
    }) as typeof validUser & { betaFeatureEnrollments?: string[] }
    expect(result.betaFeatureEnrollments).toEqual(['feature-x', 'feature-y'])
  })

  it('preserves a full hostile-looking response (server announces 2FA + superadmin)', () => {
    const wireUser = {
      ...validUser,
      twoFactorEnabled: true,
      globalRoles: ['superadmin'],
      appRoles: { ezauth: ['admin'] },
      hasSetOwnPassword: true,
      mustChangePassword: false,
      promoCode: 'PROMO_2026',
      lastActiveAt: '2025-05-14T23:59:59.999Z',
    }
    const parsed = AuthUserSchema.parse(wireUser)
    expect(parsed.twoFactorEnabled).toBe(true)
    expect(parsed.globalRoles).toEqual(['superadmin'])
    expect(parsed.appRoles?.ezauth).toEqual(['admin'])
    expect(parsed.hasSetOwnPassword).toBe(true)
    expect(parsed.promoCode).toBe('PROMO_2026')
  })

  it('rejects oversized globalRoles array (DoS)', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `role-${i}`)
    expect(() => AuthUserSchema.parse({ ...validUser, globalRoles: tooMany })).toThrow()
  })

  it('rejects appRoles where role list exceeds bound', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `role-${i}`)
    expect(() => AuthUserSchema.parse({ ...validUser, appRoles: { ezauth: tooMany } })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// H2 — EmailOverrideSchema injection vectors (2026-05-15)
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema — H2 injection vectors', () => {
  it('rejects subject with CR (SMTP header injection)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\rBcc: attacker@evil.com' })).toThrow()
  })

  it('rejects subject with LF', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\nBcc: attacker@evil.com' })).toThrow()
  })

  it('rejects subject with CRLF combo', () => {
    expect(() =>
      EmailOverrideSchema.parse({
        subject: 'Hello\r\nBcc: attacker@evil.com\r\nContent-Type: text/html',
      })
    ).toThrow()
  })

  it('rejects subject with NUL byte', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\0evil' })).toThrow()
  })

  it('rejects subject with TAB (line folding bypass)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\tBcc: x@y.z' })).toThrow()
  })

  it('rejects heading with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ heading: 'Welcome\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects intro with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ intro: 'Hi\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects outro with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ outro: 'Bye\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects ctaLabel with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ ctaLabel: 'Click\r\nHere' })).toThrow()
  })

  it('rejects preheader with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ preheader: 'Preview\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects bodyHtml with <script> tag', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<script>alert(1)</script>' })).toThrow()
  })

  it('rejects bodyHtml with case-insensitive <SCRIPT>', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<ScRiPt>alert(1)</ScRiPt>' })).toThrow()
  })

  it('rejects bodyHtml with javascript: URL', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="javascript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with onerror= attribute', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<img src=x onerror=alert(1)>' })).toThrow()
  })

  it('rejects bodyHtml with onclick= attribute', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<a onclick="evil()">x</a>' })).toThrow()
  })

  it('accepts safe HTML in bodyHtml', () => {
    const safe = '<p>Hello <strong>world</strong>!</p><a href="https://example.com">link</a>'
    const result = EmailOverrideSchema.parse({ bodyHtml: safe })
    expect(result.bodyHtml).toBe(safe)
  })

  it('rejects subject > 998 chars (RFC 5322 line length)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'a'.repeat(999) })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// A4-new — bodyHtml regex hardening against whitespace-in-scheme + HTML
// entity bypasses (2026-05-15, hacker-wave-a-lot1.md A4-new).
//
// Previous regex `javascript\s*:` required consecutive letters "javascript"
// before optional whitespace + `:`. Browsers strip whitespace INSIDE the
// scheme letters per WHATWG URL spec, so `java\tscript:` / `java\nscript:` /
// `java script:` parsed as `javascript:` and executed in href attributes.
// HTML-entity-encoded scheme characters (`&#x6A;avascript:`) bypassed too.
// Tightened regex matches each letter with optional whitespace AND rejects
// any HTML numeric entity.
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema — A4-new bodyHtml bypass coverage', () => {
  it('rejects bodyHtml with TAB inside javascript literal (java\\tscript:)', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="java\tscript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with LF inside javascript literal (java\\nscript:)', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="jav\nascript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with CR inside javascript literal', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="ja\rvascript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with plain space inside javascript literal', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="java script:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with whitespace at every letter boundary', () => {
    expect(() =>
      EmailOverrideSchema.parse({
        bodyHtml: '<a href="j a v a s c r i p t :alert(1)">click</a>',
      })
    ).toThrow()
  })

  it('rejects bodyHtml with mixed-case JavaScript: AND inner whitespace', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="Java\tScript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('still rejects bodyHtml with literal javascript: (regression check)', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="javascript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('still accepts safe HTML without any flagged primitives', () => {
    const safe = '<p>Visit <a href="https://example.com">our site</a> for more.</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: safe }).bodyHtml).toBe(safe)
  })
})

// ---------------------------------------------------------------------------
// F.12 — Numeric HTML entities accepted (Lot 2.1.1 false-positive rollback).
//
// The previous A4-new regex blanket-rejected `&#x?[0-9a-f]+;`, which
// rejected ALL numeric HTML entities, including legitimate ones
// (`&#160;` nbsp, `&#169;` ©, `&#8364;` €, `&#8217;` ’, `&#8211;` –). The
// rollback removes the entity alternation and explicitly delegates
// entity-decoded attack vectors (`&#x6A;avascript:`) to the server-side
// HTML sanitizer per the JSDoc on `EmailOverrideSchema.bodyHtml`.
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema — F.12 numeric HTML entity acceptance', () => {
  it('accepts bodyHtml with &#160; (nbsp)', () => {
    const html = '<p>Hello&#160;world</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#169; (©)', () => {
    const html = '<p>&#169; 2026 Acme</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#8211; (en dash)', () => {
    const html = '<p>Pages 10&#8211;20</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#8217; (typographic apostrophe)', () => {
    const html = '<p>It&#8217;s great</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#8364; (€ decimal)', () => {
    const html = '<p>Price: &#8364;100</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#x20AC; (€ hex)', () => {
    const html = '<p>Price: &#x20AC;100</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with &#34; (quote) and &#8226; (bullet)', () => {
    const html = '<p>Notes:&#8226;Item &#34;A&#34;</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts bodyHtml with entity-encoded javascript: scheme (delegated to server sanitizer)', () => {
    // Documented limitation — the contract layer no longer attempts to
    // catch entity-decoded attack vectors. The server-side sanitizer is
    // the authoritative defense per the JSDoc on bodyHtml. The regex
    // intentionally accepts these so legitimate `&#xxx;` content passes.
    const html = '<a href="&#x6A;avascript:alert(1)">click</a>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })
})

// ---------------------------------------------------------------------------
// F.16 — `on*=` scoped to HTML tag context (Lot 2.1.1 false-positive
// rollback).
//
// The previous A4-new regex `\bon\w+\s*=` matched `on<word>=` anywhere in
// the HTML, including inside `<code>`/`<pre>`/plain `<p>` text. This
// rejected legitimate developer-focused / educational content. The new
// pattern `<[^>]*\son\w+\s*=` requires the handler to appear inside an
// HTML tag opener (after `<tagname` and before the closing `>`).
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema — F.16 on*= scoped to HTML tag context', () => {
  it('accepts plain text mentioning onclick= attribute (documentation)', () => {
    const html = '<p>Documentation about the onclick= attribute</p>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts <code> block mentioning onsubmit=function()', () => {
    const html = '<code>onsubmit=function() { return false; }</code>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts <pre> block mentioning onerror=null;', () => {
    const html = '<pre>onerror=null;</pre>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('accepts tutorial-style mention of on* prefix', () => {
    const html = '<span>Tutorial on JS: onmouseover= is a handler</span>'
    expect(EmailOverrideSchema.parse({ bodyHtml: html }).bodyHtml).toBe(html)
  })

  it('still rejects <a onclick="evil()"> (real attack)', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<a onclick="evil()">click</a>' })).toThrow()
  })

  it('still rejects <img onerror="alert(1)" src="x"> (real attack)', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<img onerror="alert(1)" src="x">' })
    ).toThrow()
  })

  it('still rejects <svg onload="evil()" /> (real attack)', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<svg onload="evil()" />' })).toThrow()
  })

  it('still rejects <body onload=alert(1)> (no quotes attack)', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<body onload=alert(1)>' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// A2 — redactAuthUser helper (2026-05-15, hacker-wave-a-lot1.md A2).
//
// `AuthUserSchema.passthrough()` preserves unknown fields by design (for
// forward-compat), but that means a buggy server returning `password` /
// `passwordHash` / `totpSecret` would leak them through the parsed shape.
// `redactAuthUser` is the canonical defense-in-depth helper to strip
// known-sensitive keys before crossing any trust boundary.
// ---------------------------------------------------------------------------

describe('redactAuthUser helper', () => {
  it('strips password from the output', () => {
    const out = redactAuthUser({ ...validUser, password: 'leaked' })
    expect((out as Record<string, unknown>).password).toBeUndefined()
  })

  it('strips passwordHash from the output', () => {
    const out = redactAuthUser({ ...validUser, passwordHash: '$2b$10$...' })
    expect((out as Record<string, unknown>).passwordHash).toBeUndefined()
  })

  it('strips totpSecret from the output', () => {
    const out = redactAuthUser({ ...validUser, totpSecret: 'JBSWY3DPEHPK3PXP' })
    expect((out as Record<string, unknown>).totpSecret).toBeUndefined()
  })

  it('strips recoveryCodes from the output', () => {
    const out = redactAuthUser({ ...validUser, recoveryCodes: ['a-b-c', 'd-e-f'] })
    expect((out as Record<string, unknown>).recoveryCodes).toBeUndefined()
  })

  it('strips tempToken from the output', () => {
    const out = redactAuthUser({ ...validUser, tempToken: 'tmp_abc' })
    expect((out as Record<string, unknown>).tempToken).toBeUndefined()
  })

  it('strips oauthRefreshToken from the output', () => {
    const out = redactAuthUser({ ...validUser, oauthRefreshToken: 'rt_xyz' })
    expect((out as Record<string, unknown>).oauthRefreshToken).toBeUndefined()
  })

  it('strips apiKeySecret from the output', () => {
    const out = redactAuthUser({ ...validUser, apiKeySecret: 'ez_sk_live_xxx' })
    expect((out as Record<string, unknown>).apiKeySecret).toBeUndefined()
  })

  it('strips ALL sensitive keys in one call', () => {
    const hostile = {
      ...validUser,
      password: 'p',
      passwordHash: 'h',
      tempToken: 't',
      totpSecret: 's',
      recoveryCodes: ['r'],
      oauthRefreshToken: 'or',
      apiKeySecret: 'aks',
    }
    const out = redactAuthUser(hostile) as Record<string, unknown>
    for (const key of SENSITIVE_AUTH_USER_KEYS) {
      expect(out[key]).toBeUndefined()
    }
  })

  it('preserves all NON-sensitive fields unchanged', () => {
    const full = {
      ...validUser,
      firstName: 'Jane',
      lastName: 'Doe',
      twoFactorEnabled: true,
      globalRoles: ['superadmin'],
      promoCode: 'PROMO',
      // sensitive — should disappear
      password: 'leaked',
      passwordHash: 'hash-leaked',
    }
    const out = redactAuthUser(full)
    expect(out._id).toBe(validUser._id)
    expect(out.email).toBe(validUser.email)
    expect(out.username).toBe(validUser.username)
    expect(out.firstName).toBe('Jane')
    expect(out.lastName).toBe('Doe')
    expect((out as { twoFactorEnabled?: boolean }).twoFactorEnabled).toBe(true)
    expect((out as { globalRoles?: string[] }).globalRoles).toEqual(['superadmin'])
    expect((out as { promoCode?: string }).promoCode).toBe('PROMO')
  })

  it('does not mutate the input object', () => {
    const input: Record<string, unknown> = {
      ...validUser,
      password: 'leaked',
      passwordHash: 'hash',
    }
    const before = { ...input }
    redactAuthUser(input)
    expect(input).toEqual(before)
    expect(input.password).toBe('leaked') // unchanged
    expect(input.passwordHash).toBe('hash') // unchanged
  })

  it('returns a different object reference', () => {
    const out = redactAuthUser(validUser)
    expect(out).not.toBe(validUser)
  })

  it('handles an empty object gracefully', () => {
    const out = redactAuthUser({} as Record<string, unknown>)
    expect(out).toEqual({})
  })

  it('does NOT strip keys that merely contain "password" as substring', () => {
    // mustChangePassword / hasSetOwnPassword are STATE flags, not secrets.
    const out = redactAuthUser({
      ...validUser,
      hasSetOwnPassword: true,
      mustChangePassword: false,
    })
    expect((out as { hasSetOwnPassword?: boolean }).hasSetOwnPassword).toBe(true)
    expect((out as { mustChangePassword?: boolean }).mustChangePassword).toBe(false)
  })

  it('exposes the canonical list of sensitive keys', () => {
    // Smoke test — guards against accidental removal of a key from the list.
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('password')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('passwordHash')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('totpSecret')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('recoveryCodes')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('tempToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('oauthRefreshToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('apiKeySecret')
  })
})

// ---------------------------------------------------------------------------
// G.1 — redactAuthUser expanded allowlist (Lot 2.1.1, hacker-wave-a-lot2-1.md
// G.1+G.2). The allowlist was extended to cover canonical ezauth field
// names from separate sensitive-data collections (refresh-token,
// oauth-account, totp-secret, application, magic-link-request,
// email-change-request).
// ---------------------------------------------------------------------------

describe('redactAuthUser — G.1 expanded sensitive key coverage', () => {
  // Canonical ezauth collection field names

  it('strips tokenHash (refresh-token.ts)', () => {
    const out = redactAuthUser({ ...validUser, tokenHash: 'sha256:abc' })
    expect((out as Record<string, unknown>).tokenHash).toBeUndefined()
  })

  it('strips accessToken (oauth-account.ts)', () => {
    const out = redactAuthUser({ ...validUser, accessToken: 'ya29.encrypted-blob' })
    expect((out as Record<string, unknown>).accessToken).toBeUndefined()
  })

  it('strips refreshToken (oauth-account.ts)', () => {
    const out = redactAuthUser({ ...validUser, refreshToken: '1//04-encrypted-blob' })
    expect((out as Record<string, unknown>).refreshToken).toBeUndefined()
  })

  it('strips secret (totp-secret.ts — TOTP shared secret)', () => {
    const out = redactAuthUser({ ...validUser, secret: 'JBSWY3DPEHPK3PXP' })
    expect((out as Record<string, unknown>).secret).toBeUndefined()
  })

  it('strips backupCodes (totp-secret.ts)', () => {
    const out = redactAuthUser({ ...validUser, backupCodes: ['hash-1', 'hash-2'] })
    expect((out as Record<string, unknown>).backupCodes).toBeUndefined()
  })

  it('strips webhookSecret (application.ts)', () => {
    const out = redactAuthUser({ ...validUser, webhookSecret: 'whsec_abcdef' })
    expect((out as Record<string, unknown>).webhookSecret).toBeUndefined()
  })

  // Semantic alias additions

  it('strips magicLinkToken', () => {
    const out = redactAuthUser({ ...validUser, magicLinkToken: 'ml_xyz' })
    expect((out as Record<string, unknown>).magicLinkToken).toBeUndefined()
  })

  it('strips passwordResetToken', () => {
    const out = redactAuthUser({ ...validUser, passwordResetToken: 'pr_xyz' })
    expect((out as Record<string, unknown>).passwordResetToken).toBeUndefined()
  })

  it('strips emailVerificationToken', () => {
    const out = redactAuthUser({ ...validUser, emailVerificationToken: 'ev_xyz' })
    expect((out as Record<string, unknown>).emailVerificationToken).toBeUndefined()
  })

  it('strips oauthAccessToken (semantic alias)', () => {
    const out = redactAuthUser({ ...validUser, oauthAccessToken: 'ya29.semantic' })
    expect((out as Record<string, unknown>).oauthAccessToken).toBeUndefined()
  })

  it('strips oauthIdToken', () => {
    const out = redactAuthUser({ ...validUser, oauthIdToken: 'eyJ.idt' })
    expect((out as Record<string, unknown>).oauthIdToken).toBeUndefined()
  })

  it('strips refreshTokenHash (semantic alias for tokenHash)', () => {
    const out = redactAuthUser({ ...validUser, refreshTokenHash: 'sha256:def' })
    expect((out as Record<string, unknown>).refreshTokenHash).toBeUndefined()
  })

  it('strips twoFactorSecret (semantic alias)', () => {
    const out = redactAuthUser({ ...validUser, twoFactorSecret: 'JBSWY' })
    expect((out as Record<string, unknown>).twoFactorSecret).toBeUndefined()
  })

  it('strips twoFactorBackupCodes (semantic alias)', () => {
    const out = redactAuthUser({ ...validUser, twoFactorBackupCodes: ['a', 'b'] })
    expect((out as Record<string, unknown>).twoFactorBackupCodes).toBeUndefined()
  })

  it('strips ALL G.1 new sensitive keys in one call (8+ field proof)', () => {
    // Matches the hacker G.2 explicit FAIL probe — pass after Lot 2.1.1.
    const hostile = {
      ...validUser,
      magicLinkToken: 'mlt',
      passwordResetToken: 'prt',
      emailVerificationToken: 'evt',
      oauthAccessToken: 'oat',
      oauthIdToken: 'oit',
      tokenHash: 'th',
      refreshTokenHash: 'rth',
      webhookSecret: 'ws',
      backupCodes: ['bc1'],
      twoFactorBackupCodes: ['tbc1'],
      twoFactorSecret: 'tfs',
      accessToken: 'at',
      refreshToken: 'rt',
      secret: 's',
    }
    const out = redactAuthUser(hostile) as Record<string, unknown>
    expect(out.magicLinkToken).toBeUndefined()
    expect(out.passwordResetToken).toBeUndefined()
    expect(out.emailVerificationToken).toBeUndefined()
    expect(out.oauthAccessToken).toBeUndefined()
    expect(out.oauthIdToken).toBeUndefined()
    expect(out.tokenHash).toBeUndefined()
    expect(out.refreshTokenHash).toBeUndefined()
    expect(out.webhookSecret).toBeUndefined()
    expect(out.backupCodes).toBeUndefined()
    expect(out.twoFactorBackupCodes).toBeUndefined()
    expect(out.twoFactorSecret).toBeUndefined()
    expect(out.accessToken).toBeUndefined()
    expect(out.refreshToken).toBeUndefined()
    expect(out.secret).toBeUndefined()
  })

  // Generic-key collision verification — exact match only, NOT substring.

  it('does NOT strip secretQuestion (substring of "secret" but exact-match only)', () => {
    // Documents the exact-key-match contract — `secret` is in the allowlist,
    // but `secretQuestion` is a different key entirely. The helper does a
    // shallow `delete` per allowlist key, not a substring scan.
    const out = redactAuthUser({
      ...validUser,
      secretQuestion: 'first pet name',
    }) as Record<string, unknown>
    expect(out.secretQuestion).toBe('first pet name')
  })

  it('does NOT strip refreshTokenExpiresAt (substring-of, not exact-match)', () => {
    // Similar collision guard — `refreshToken` is sensitive, but a metadata
    // timestamp keyed `refreshTokenExpiresAt` is not.
    const out = redactAuthUser({
      ...validUser,
      refreshTokenExpiresAt: '2026-12-01T00:00:00.000Z',
    }) as Record<string, unknown>
    expect(out.refreshTokenExpiresAt).toBe('2026-12-01T00:00:00.000Z')
  })

  it('exposes all Lot 2.1.1 new keys in SENSITIVE_AUTH_USER_KEYS', () => {
    // Guard against accidental removal during future refactor.
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('tokenHash')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('accessToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('refreshToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('secret')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('backupCodes')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('webhookSecret')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('magicLinkToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('passwordResetToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('emailVerificationToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('oauthAccessToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('oauthIdToken')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('refreshTokenHash')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('twoFactorSecret')
    expect(SENSITIVE_AUTH_USER_KEYS).toContain('twoFactorBackupCodes')
  })
})
