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

// ---------------------------------------------------------------------------
// PKCE (RFC 7636 — OAuth 2.1 authorization-code interception protection)
// ---------------------------------------------------------------------------

/**
 * PKCE `code_verifier` / `code_challenge` charset — the unreserved URL-safe
 * characters defined by RFC 7636 §4.1: `A-Z a-z 0-9 - . _ ~`.
 *
 * The `code_verifier` is a high-entropy random string (43–128 chars). The
 * `code_challenge` for the S256 method is `BASE64URL(SHA256(verifier))`, which
 * yields a 43-char string (32 bytes → 43 base64url chars, no padding). Both
 * share the same allowed alphabet, so a single regex bounds both fields and
 * blocks log-injection / NUL-byte smuggling at the contract layer.
 */
export const PKCE_CHARS_REGEX = /^[A-Za-z0-9\-._~]+$/

/**
 * Zod schema for a PKCE `code_challenge` (S256 method).
 *
 * RFC 7636 §4.1 bounds the verifier to 43–128 chars; the S256 challenge is a
 * fixed 43-char base64url SHA-256 digest. We accept the full 43–128 window
 * (rather than pinning 43) so a forward-compatible server / future challenge
 * shape isn't rejected, while still rejecting trivially short or oversized
 * values. URL-safe charset only.
 */
export const PkceCodeChallengeSchema = z
  .string()
  .min(43, 'code_challenge must be at least 43 characters (RFC 7636 §4.1)')
  .max(128, 'code_challenge must be at most 128 characters (RFC 7636 §4.1)')
  .regex(PKCE_CHARS_REGEX, 'code_challenge must be URL-safe base64 (A-Z, a-z, 0-9, -, ., _, ~)')

/**
 * Zod schema for the PKCE `code_challenge_method`.
 *
 * **S256 ONLY.** The `plain` method (RFC 7636 §4.2) offers no protection
 * against an attacker who can read the authorization request, so OAuth 2.1
 * (and `@ezstart`) reject it outright. A request that passes a `code_challenge`
 * with `method: 'plain'` (or any value other than `'S256'`) fails validation.
 */
export const PkceCodeChallengeMethodSchema = z
  .literal('S256')
  .describe('PKCE code challenge method — S256 only (plain is rejected per OAuth 2.1)')

/**
 * Zod schema for a PKCE `code_verifier` (sent on the /token exchange).
 *
 * RFC 7636 §4.1: 43–128 chars, unreserved URL-safe charset. The server hashes
 * it with SHA-256 and compares (timing-safe) against the stored
 * `code_challenge`.
 */
export const PkceCodeVerifierSchema = z
  .string()
  .min(43, 'code_verifier must be at least 43 characters (RFC 7636 §4.1)')
  .max(128, 'code_verifier must be at most 128 characters (RFC 7636 §4.1)')
  .regex(PKCE_CHARS_REGEX, 'code_verifier must be URL-safe base64 (A-Z, a-z, 0-9, -, ., _, ~)')

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
// safeRedirectUri — extracted to ./redirect-uri.ts (Wave A R2, 2026-05-16)
// Re-exported here for backward-compat — every existing import path keeps
// working. The security rationale (control chars, userinfo, fragment XSS,
// IDN homograph) lives in the dedicated file.
// ---------------------------------------------------------------------------

export { safeRedirectUri } from './redirect-uri.js'

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
