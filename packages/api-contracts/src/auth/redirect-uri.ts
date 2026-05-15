/**
 * Safe redirect URI schema — used by every auth flow that accepts a
 * `redirect_uri` body field (Login, Register, ForgotPassword,
 * SendVerification, Token exchange).
 *
 * Extracted from `auth-shared.ts` (Wave A R2, 2026-05-16) so the security
 * rationale lives in one focused file rather than diluted across a 411-line
 * grab-bag. The barrel `../auth.ts` re-exports this, and `auth-shared.ts`
 * re-exports `safeRedirectUri` for backward-compat — every existing import
 * path keeps working.
 *
 * @see ./auth-shared.ts (backcompat re-export)
 * @see ./auth-requests.ts (consumer)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// safeRedirectUri
// ---------------------------------------------------------------------------

/**
 * Validates a redirect URI, rejecting dangerous protocols (`javascript:`,
 * `data:`, `vbscript:`, `blob:`) that could be used for XSS or open-redirect
 * attacks. Only `http:` and `https:` are allowed.
 *
 * Additional hardening (H4):
 * - Rejects raw control chars (`\r`, `\n`, `\t`, `\0`) in the input string —
 *   WHATWG URL silently strips these, which is a CRLF injection primitive if
 *   the consumer forwards the original `redirect_uri` into HTTP headers.
 * - Rejects URLs with userinfo (`https://evil@trusted.com/`) — phishing
 *   primitive in webmail clients that truncate long URLs in tooltips.
 * - Rejects fragments containing `javascript:` — defense-in-depth against
 *   consumers that route on `window.location.hash`.
 * - Rejects non-ASCII hostnames (Unicode confusables / IDN homograph attacks).
 *   Consumers can pre-encode to punycode (`xn--mnchen-3ya.example.com`) for
 *   legitimate non-Latin domains.
 */
export const safeRedirectUri = z
  .string()
  .max(2048)
  .refine(val => !/[\r\n\t\0]/.test(val), {
    message: 'redirect_uri must not contain control characters',
  })
  .pipe(z.string().url())
  .refine(
    val => {
      try {
        const u = new URL(val)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'redirect_uri must use http or https protocol' }
  )
  .refine(
    val => {
      try {
        const u = new URL(val)
        return u.username === '' && u.password === ''
      } catch {
        return false
      }
    },
    { message: 'redirect_uri must not contain userinfo (user@host)' }
  )
  .refine(
    val => {
      try {
        const u = new URL(val)
        return !/javascript\s*:/i.test(u.hash)
      } catch {
        return false
      }
    },
    { message: 'redirect_uri fragment must not contain javascript: scheme' }
  )
  .refine(
    val => {
      // Detect non-ASCII characters in the hostname (Unicode confusables /
      // IDN homograph attacks). WHATWG URL parser converts to punycode at
      // parse time, but the schema preserves the raw input — so we sniff
      // the original string for any non-ASCII char in the host portion.
      // A consumer who allowlists by punycode `host` after re-parsing the
      // returned URL is fine; this refine catches the much more common
      // pattern where the consumer string-compares the raw `redirect_uri`
      // against an allowlist of canonical https://example.com entries.
      try {
        const u = new URL(val)
        // The .host on a URL with a non-ASCII hostname IS the punycode
        // form. If the raw input contains the same hostname but with
        // non-ASCII chars, the strings will differ — reject conservatively.
        const rawHostMatch = /^https?:\/\/([^/?#]+)/i.exec(val)
        const rawHost = rawHostMatch?.[1]
        if (!rawHost) return false
        // Strip any userinfo segment (already rejected above, but
        // defense-in-depth).
        const rawHostNoUser = rawHost.replace(/^[^@]*@/, '')
        // Reject any non-ASCII byte in the raw hostname.
        // eslint-disable-next-line no-control-regex
        if (/[^\x00-\x7F]/.test(rawHostNoUser)) {
          return false
        }
        return Boolean(u.host)
      } catch {
        return false
      }
    },
    {
      message:
        'redirect_uri hostname must be ASCII (Unicode IDN / homograph attacks rejected; pre-encode to punycode if needed)',
    }
  )
