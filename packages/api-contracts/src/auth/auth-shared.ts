/**
 * Auth shared primitives — regex allowlists, helpers, types used by BOTH
 * `auth-requests.ts` (client→server) and `auth-responses.ts` (server→client).
 *
 * Lives in its own file (rather than at the top of `auth.ts`) so the request
 * and response schemas can import only what they need without pulling the
 * monolith. The barrel `../auth.ts` re-exports everything from this file +
 * the two sibling files, so existing imports keep working.
 *
 * @see ../auth.ts (barrel re-export)
 * @see ./auth-requests.ts
 * @see ./auth-responses.ts
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Regex primitives
// ---------------------------------------------------------------------------

/**
 * Strict regex for "free-form text" fields that must NOT contain control
 * characters (CR/LF/TAB/NUL/VT/FF). Used on email subjects, headings, login
 * identifier, etc. to defuse SMTP/HTTP header injection primitives at the
 * contract layer.
 */
export const NO_CONTROL_CHARS = /^[^\r\n\t\0\v\f]*$/

/**
 * Username allowlist — alphanumerics + `_`, `-`, `.`.
 * Min 3, max 32 chars. Defuses path traversal (`../`), HTML injection
 * (`<script>`), and log-injection (`\n`).
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_\-.]{3,32}$/

/**
 * App slug allowlist — lowercase alphanumerics + `-` only.
 * Min 2, max 32 chars. `app` is used as a discriminator in URL paths and
 * DB queries; a strict allowlist prevents path-traversal / NUL-byte attacks.
 */
export const APP_SLUG_REGEX = /^[a-z0-9-]{2,32}$/

/**
 * Opaque token allowlist — URL-safe base64 + `.` (for JWT segments).
 * Min 1, max 2048 chars. Bound at the contract layer so a malicious caller
 * cannot ship 1 MB of "token" through the validator.
 */
export const OPAQUE_TOKEN_REGEX = /^[A-Za-z0-9_\-.]{1,2048}$/

/**
 * Short-code allowlist — alphanumerics only.
 * Min 6, max 12 chars. Used for 2FA TOTP / email verification codes.
 */
export const SHORT_CODE_REGEX = /^[a-zA-Z0-9]{6,12}$/

/**
 * Re-exported short-code regex (alphanumeric, 6-12 chars) for downstream
 * use in 2FA TOTP / email verification code schemas (kept here so the
 * regex source lives in one place; consumers can build their own
 * `z.string().regex(SHORT_CODE_REGEX_SOURCE)` if needed).
 */
export const SHORT_CODE_REGEX_SOURCE = SHORT_CODE_REGEX.source

/**
 * Dangerous HTML primitive detector. Refines against the `bodyHtml` field of
 * email overrides. Rejects payloads that LOOK like `<script>`, `javascript:`
 * (including whitespace-inside-scheme bypasses like `java\tscript:`), or
 * inline `on*=` event handlers inside an HTML tag opener.
 *
 * **A4-new fix (2026-05-15)** — the previous regex `javascript\s*:` could
 * be bypassed by whitespace INSIDE the scheme literal (`java\tscript:`,
 * `java\nscript:`, `java script:`). Browsers strip ASCII whitespace from URL
 * schemes per WHATWG URL spec, so the bypass executed in `<a href="...">`
 * attributes. The new regex matches the same letters with optional
 * whitespace between each character.
 *
 * **Lot 2.1.1 corrections (2026-05-15)** — two false-positive classes
 * introduced by the previous A4-new tightening were rolled back:
 *
 * 1. **HTML numeric-entity blanket reject removed.** The previous
 *    alternation `&#x?[0-9a-f]+;` matched ALL numeric entities, rejecting
 *    legitimate template content (`&#160;` nbsp, `&#169;` ©, `&#8364;` €,
 *    `&#8217;` ’, `&#8211;` –). Entity-encoded attack vectors
 *    (`&#x6A;avascript:`) are explicitly delegated to the server-side
 *    sanitizer — see the JSDoc on `EmailOverrideSchema.bodyHtml`.
 * 2. **`on*=` scoped to HTML tag context.** The previous `\bon\w+\s*=`
 *    matched plain text mentioning `onclick=` (tutorials, code samples in
 *    `<p>`/`<code>`/`<pre>`). The new pattern `<[^>]*\son\w+\s*=` requires
 *    the handler to appear inside an HTML tag opener (after `<tagname` and
 *    before the closing `>`), so legitimate technical/educational content
 *    is accepted while real attack vectors (`<a onclick=`, `<svg onload=`,
 *    `<img onerror=`) still match.
 *
 * **This regex remains a coarse first-line filter, NOT a substitute for a
 * proper HTML sanitizer.** The server MUST run DOMPurify / sanitize-html
 * before storing or rendering `bodyHtml`. The contract layer catches the
 * obvious primitives so the field cannot be naively trusted, but the regex
 * cannot enumerate every XSS vector (CSS expressions, `<base href="...">`,
 * entity-encoded scheme characters, exotic mutation XSS, etc.). Defense in
 * depth: regex filter + server-side sanitizer.
 */
export const HTML_DANGEROUS_PRIMITIVE =
  /<\s*script\b|j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|<[^>]*\son\w+\s*=/i

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

// ---------------------------------------------------------------------------
// Locales
// ---------------------------------------------------------------------------

/** Locales supported by user-facing emails. Mirror of `@ezstart/email-service`. */
export const SupportedLocaleSchema = z.enum(['en', 'fr', 'vi'])
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>

// ---------------------------------------------------------------------------
// Email override (used by Register, QuickSignup, ForgotPassword,
// SendVerification — shared between requests)
// ---------------------------------------------------------------------------

/**
 * Per-send email overrides forwarded to templating (optional branding).
 *
 * **Security warning** — these fields are passed through the wire AS-IS.
 * The server-side templating layer MUST sanitize / escape them before
 * composing the email. Specifically:
 *
 * - `subject`, `heading`, `intro`, `outro`, `ctaLabel` are constrained to
 *   reject `\r`/`\n`/`\t`/`\0` at the contract layer (defuses SMTP header
 *   injection: `Subject: Hi\r\nBcc: attacker@evil.com`).
 * - `bodyHtml` is constrained to reject obvious XSS primitives (`<script>`,
 *   `javascript:` incl. whitespace-broken variants, inline `on*=` handlers
 *   inside HTML tag openers) at the contract layer. Schema-level validation
 *   catches the obvious attack primitives. It is **NOT** a substitute for
 *   runtime HTML sanitization (DOMPurify, sanitize-html). The schema
 *   intentionally accepts numeric HTML entities (e.g. `&#160;` nbsp,
 *   `&#169;` ©, `&#8364;` €, `&#8217;` ’) because they are legitimate in
 *   email templates — the server-side sanitizer must handle entity-decoded
 *   attack vectors (`&#x6A;avascript:` post-decode). A tenant editing
 *   branded emails should NEVER be trusted to ship raw HTML through to
 *   recipients without server-side validation. See
 *   `HTML_DANGEROUS_PRIMITIVE` JSDoc for the full bypass landscape.
 * - `from` / `replyTo` SHOULD be allowlisted to tenant-owned domains
 *   server-side (DKIM/SPF alignment). The contract only enforces
 *   well-formed email + max 254 chars.
 */
export const EmailOverrideSchema = z.object({
  subject: z
    .string()
    .max(998) // RFC 5322 line length
    .regex(NO_CONTROL_CHARS, 'subject must not contain control characters')
    .optional()
    .describe('Email subject override (no CRLF — defuses header injection)'),
  heading: z
    .string()
    .max(500)
    .regex(NO_CONTROL_CHARS, 'heading must not contain control characters')
    .optional()
    .describe('Email main heading override (no CRLF)'),
  preheader: z
    .string()
    .max(998)
    .regex(NO_CONTROL_CHARS, 'preheader must not contain control characters')
    .optional()
    .describe('Email preheader / preview text (no CRLF)'),
  intro: z
    .string()
    .max(2000)
    .regex(NO_CONTROL_CHARS, 'intro must not contain control characters')
    .optional()
    .describe('Email intro paragraph override (no CRLF)'),
  ctaLabel: z
    .string()
    .max(200)
    .regex(NO_CONTROL_CHARS, 'ctaLabel must not contain control characters')
    .optional()
    .describe('Call-to-action button label override (no CRLF)'),
  outro: z
    .string()
    .max(2000)
    .regex(NO_CONTROL_CHARS, 'outro must not contain control characters')
    .optional()
    .describe('Email outro paragraph override (no CRLF)'),
  from: z.string().email().max(254).optional().describe('Sender email address override'),
  replyTo: z.string().email().max(254).optional().describe('Reply-To email address override'),
  bodyHtml: z
    .string()
    .max(50_000)
    .refine(val => !HTML_DANGEROUS_PRIMITIVE.test(val), {
      message:
        'bodyHtml must not contain <script>, javascript: scheme (incl. whitespace-broken), or inline on*= event handlers in HTML tag openers (coarse filter — server MUST also run a proper HTML sanitizer to defuse entity-encoded bypasses)',
    })
    .optional()
    .describe(
      'Full HTML body override (max 50 KB; <script>, javascript:, and inline on*= handlers rejected at contract — server MUST run a proper HTML sanitizer for entity-encoded vectors)'
    ),
})
export type EmailOverride = z.infer<typeof EmailOverrideSchema>

// ---------------------------------------------------------------------------
// AuthUser shape (returned by /me, token exchange, refresh, verify)
// ---------------------------------------------------------------------------

/**
 * Public user shape — never contains `passwordHash` or secrets.
 *
 * This schema is aligned with the consumer `AuthUser` interface in
 * `@ezstart/auth-sdk` (see `packages/auth-sdk/src/core/types.ts`). It uses
 * `.passthrough()` so unknown forward-compatible fields (added by concrete
 * apps or future versions of ezauth) are PRESERVED on parse rather than
 * silently stripped. Stripping security-critical fields (`twoFactorEnabled`,
 * `globalRoles`, `appRoles`, ...) at the schema layer would silently disable
 * RBAC gates downstream — a critical footgun. See C-2 in the api-contracts
 * hacker report (2026-05-15).
 *
 * **Required fields**: `_id`, `email`, `username`, `createdAt`, `updatedAt`.
 * **Everything else is `.optional()`** so partial responses from legacy /
 * preview servers don't fail validation. Consumers should still treat
 * security gates conservatively (treat `undefined twoFactorEnabled` as
 * "unknown — fall back to /me").
 *
 * **A2 caveat (passthrough secret leak)**: because `.passthrough()` preserves
 * unknown keys, a buggy server returning `password` / `passwordHash` /
 * `totpSecret` etc. would expose them in the parsed object. Use the
 * companion helper {@link redactAuthUser} on the server BEFORE sending the
 * `/me` or `/users/:id` response, AND audit the server code to ensure it
 * never selects sensitive Mongoose fields. The schema cannot enforce
 * absence of unknown sensitive fields — it can only preserve what's there.
 */
export const AuthUserSchema = z
  .object({
    _id: z.string().min(1).max(64).describe('MongoDB ObjectId of the user'),
    email: z.string().email().max(254).describe('User email address'),
    username: z.string().min(1).max(64).describe('Unique username'),
    firstName: z.string().max(100).optional().describe('User first name'),
    lastName: z.string().max(100).optional().describe('User last name'),
    avatar: z.string().max(2048).optional().describe('URL of the user avatar image'),
    isVerified: z.boolean().optional().describe('Whether the user email has been verified'),
    apps: z.array(z.string().max(100)).max(100).optional().describe('Apps the user has access to'),
    roles: z
      .array(z.string().max(64))
      .max(100)
      .optional()
      .describe('Legacy RBAC roles assigned to the user'),
    permissions: z
      .array(z.string().max(128))
      .max(200)
      .optional()
      .describe('Granular permissions granted to the user'),
    features: z
      .array(z.string().max(64))
      .max(100)
      .optional()
      .describe('Feature flags enabled for the user'),
    organizationId: z.string().max(64).optional().describe('Organization this user belongs to'),
    managedBy: z
      .string()
      .max(64)
      .optional()
      .describe('User ID of the manager account (if managed)'),
    createdAt: z.string().describe('ISO timestamp when the account was created'),
    updatedAt: z.string().describe('ISO timestamp of the last account update'),
    // RBAC extensions (added 2026-05-15 — aligned with auth-sdk AuthUser)
    globalRoles: z
      .array(z.string().max(64))
      .max(50)
      .optional()
      .describe('Platform-wide roles (e.g. `superadmin`)'),
    appRoles: z
      .record(z.string().max(64), z.array(z.string().max(64)).max(50))
      .optional()
      .describe('Per-app RBAC roles, keyed by app slug'),
    // Promo / billing
    promoCode: z
      .string()
      .max(50)
      .optional()
      .describe('Promo code applied at signup (for billing attribution)'),
    // Password state
    hasSetOwnPassword: z
      .boolean()
      .optional()
      .describe('Whether the user has set their own password (vs. magic-link bootstrap)'),
    mustChangePassword: z
      .boolean()
      .optional()
      .describe('When true, the user MUST reset their password on next login (force rotation)'),
    // 2FA
    twoFactorEnabled: z
      .boolean()
      .optional()
      .describe('Whether the user has an enabled TOTP secret (drives admin gates)'),
    twoFactorVerifiedAt: z
      .string()
      .nullable()
      .optional()
      .describe('ISO timestamp of the most recent successful 2FA verification'),
    // Presence
    lastActiveAt: z
      .string()
      .nullable()
      .optional()
      .describe('ISO timestamp of the last user activity (for presence UI)'),
  })
  .passthrough()
export type AuthUser = z.infer<typeof AuthUserSchema>

// ---------------------------------------------------------------------------
// redactAuthUser — defense-in-depth helper (A2 fix)
// ---------------------------------------------------------------------------

export {
  redactAuthUser,
  SENSITIVE_AUTH_USER_KEYS,
  type SensitiveAuthUserKey,
} from './redact-auth-user.js'
