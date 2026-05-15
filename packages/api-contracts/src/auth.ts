/**
 * Auth flow contracts.
 *
 * Zod schemas + inferred TypeScript types for the core authentication
 * endpoints of an `@ezstart`-compatible auth server (ezauth or equivalent).
 *
 * This module is the single source of truth for the wire shape of:
 *
 * - Login (email/username + password, optional redirect_uri)
 * - Register
 * - Quick signup (username + email only, passwordless bootstrap)
 * - Forgot / reset password
 * - Verify email
 * - Refresh access token (rotating refresh)
 * - Authorization code → token exchange (OAuth-style)
 * - Token verify (introspection)
 *
 * More specialized flows (2FA enrollment, session listing, SSO authorize/
 * exchange, OAuth redirect_uri dance) are intentionally NOT included in
 * this first cut — they can be added in a follow-up without breaking these
 * contracts.
 *
 * @example
 * ```ts
 * // server
 * import { LoginRequestSchema } from '@ezstart/api-contracts'
 * const parsed = LoginRequestSchema.safeParse(req.body)
 * if (!parsed.success) return sendValidationError(res, parsed.error.issues)
 * ```
 *
 * @example
 * ```ts
 * // client
 * import type { LoginRequest } from '@ezstart/api-contracts'
 * const body: LoginRequest = { email, password, app: 'myapp' }
 * ```
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * Strict regex for "free-form text" fields that must NOT contain control
 * characters (CR/LF/TAB/NUL). Used on email subjects, headings, etc. to
 * defuse SMTP/HTTP header injection primitives at the contract layer.
 */
const NO_CONTROL_CHARS = /^[^\r\n\t\0\v\f]*$/

/**
 * Username allowlist — alphanumerics + `_`, `-`, `.`.
 * Min 3, max 32 chars. Defuses path traversal (`../`), HTML injection
 * (`<script>`), and log-injection (`\n`).
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_\-.]{3,32}$/

/**
 * App slug allowlist — lowercase alphanumerics + `-` only.
 * Min 2, max 32 chars. `app` is used as a discriminator in URL paths and
 * DB queries; a strict allowlist prevents path-traversal / NUL-byte attacks.
 */
const APP_SLUG_REGEX = /^[a-z0-9-]{2,32}$/

/**
 * Opaque token allowlist — URL-safe base64 + `.` (for JWT segments).
 * Min 1, max 2048 chars. Bound at the contract layer so a malicious caller
 * cannot ship 1 MB of "token" through the validator.
 */
const OPAQUE_TOKEN_REGEX = /^[A-Za-z0-9_\-.]{1,2048}$/

/**
 * Short-code allowlist — alphanumerics only.
 * Min 6, max 12 chars. Used for 2FA TOTP / email verification codes.
 */
const SHORT_CODE_REGEX = /^[a-zA-Z0-9]{6,12}$/

/**
 * Dangerous HTML primitive detector. Refines against the bodyHtml field of
 * email overrides. Rejects any payload that LOOKS like `<script>`,
 * `javascript:`, or `on*=` event handlers — pure-Zod allowlist, no DOMPurify
 * runtime dep. Sanitization at the server is still required (see JSDoc on
 * `EmailOverrideSchema.bodyHtml`).
 */
const HTML_DANGEROUS_PRIMITIVE = /<\s*script\b|javascript\s*:|\bon\w+\s*=/i

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
 */
const safeRedirectUri = z
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

/** Locales supported by user-facing emails. Mirror of `@ezstart/email-service`. */
export const SupportedLocaleSchema = z.enum(['en', 'fr', 'vi'])
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>

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
 * - `bodyHtml` is constrained to reject obvious XSS primitives
 *   (`<script>`, `javascript:`, `on*=`) at the contract layer, but the
 *   server still MUST run a proper HTML sanitizer (DOMPurify-equivalent)
 *   before persisting / sending — Zod's regex is a coarse filter, not a
 *   sanitizer. A tenant editing branded emails should NEVER be trusted to
 *   ship raw HTML through to recipients without server-side validation.
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
      message: 'bodyHtml must not contain <script>, javascript:, or on*= primitives',
    })
    .optional()
    .describe(
      'Full HTML body override (max 50 KB; <script>/javascript:/on*= rejected at contract — server MUST run a proper HTML sanitizer)'
    ),
})
export type EmailOverride = z.infer<typeof EmailOverrideSchema>

// ---------------------------------------------------------------------------
// User shape (returned by me, token exchange, refresh, verify)
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
// Login
// ---------------------------------------------------------------------------

/**
 * Login request — accepts email OR username in the `email` field.
 *
 * **Defense-in-depth note**: the contract enforces only basic length /
 * character bounds. The server MUST also:
 * - Rate-limit this endpoint (5 req/min/IP minimum, see
 *   `standard-saas-security.md` §7)
 * - Apply account lockout after N consecutive failures (cf. `standard-saas-security.md` §2)
 * - Use a constant-time password comparison (bcrypt etc.) — never short-
 *   circuit on user lookup.
 */
export const LoginRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email or username is required')
    .max(254)
    .describe('User email address or username'),
  password: z
    .string()
    .min(1)
    .max(128)
    .describe('User password (length validated server-side; bcrypt truncates at 72 bytes)'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri.optional().describe('OAuth redirect URI after authentication'),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

/**
 * Login response — when 2FA is NOT enabled the server returns a short-lived
 * authorization code that the client exchanges for tokens via the `/token`
 * endpoint. When 2FA IS enabled the server instead returns a temporary token
 * that must be combined with a TOTP via the 2FA verify endpoint.
 */
export const LoginAuthCodeResponseSchema = z.object({
  /**
   * Discriminator — explicit `false` (or absent) signals "no 2FA challenge,
   * proceed to code exchange". See C-1 in api-contracts hacker report:
   * `z.union` was vulnerable to payload-shaping bypass; the discriminated
   * union below enforces unambiguous branch selection.
   */
  requires2FA: z.literal(false).optional(),
  code: z
    .string()
    .min(1)
    .max(2048)
    .describe('Short-lived authorization code to exchange for tokens'),
  expires_at: z.string().describe('ISO timestamp at which the code expires'),
  message: z.string().max(500).describe('Human-readable status message'),
})
export type LoginAuthCodeResponse = z.infer<typeof LoginAuthCodeResponseSchema>

export const LoginTwoFactorPendingResponseSchema = z.object({
  requires2FA: z.literal(true).describe('Always true — signals a 2FA challenge is required'),
  tempToken: z
    .string()
    .min(1)
    .max(2048)
    .describe('Short-lived token to combine with a TOTP on the 2FA verify endpoint'),
  challengeMethods: z
    .array(z.enum(['totp', 'recovery']))
    .min(1)
    .optional()
    .describe('Allowed 2FA challenge methods (defaults to ["totp"] on the server)'),
  message: z.string().max(500).describe('Human-readable status message'),
})
export type LoginTwoFactorPendingResponse = z.infer<typeof LoginTwoFactorPendingResponseSchema>

/**
 * Discriminated union on `requires2FA` — rejects payloads matching both
 * branches at once (the `z.union` predecessor silently dropped one branch's
 * fields, enabling a 2FA bypass via response shaping — see C-1 in the
 * hacker report 2026-05-15).
 */
export const LoginResponseSchema = z.discriminatedUnion('requires2FA', [
  LoginAuthCodeResponseSchema,
  LoginTwoFactorPendingResponseSchema,
])
export type LoginResponse = z.infer<typeof LoginResponseSchema>

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/**
 * Register request.
 *
 * **Password policy** — the contract enforces a 12-character minimum (raised
 * from 8 on 2026-05-15 per `standard-saas-security.md` §2). Server SHOULD
 * also enforce zxcvbn score >= 3 and an HIBP (Have I Been Pwned) k-anonymity
 * check at runtime — these are intentionally NOT in the schema because they
 * require I/O. See `standard-saas-security.md` §2 ("password strength
 * enforcement").
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email().max(254).describe('User email address'),
  username: z
    .string()
    .regex(USERNAME_REGEX, 'username must match /^[a-zA-Z0-9_\\-.]{3,32}$/')
    .describe('Unique username (3-32 chars, alphanumerics + _ - .)'),
  password: z
    .string()
    .min(12, 'password must be at least 12 characters')
    .max(128)
    .describe('User password (12-128 characters; server must also enforce zxcvbn + HIBP check)'),
  firstName: z.string().max(100).optional().describe('User first name'),
  lastName: z.string().max(100).optional().describe('User last name'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri.optional().describe('OAuth redirect URI after registration'),
  promoCode: z.string().max(50).optional().describe('Optional promo code to apply at signup'),
  utmSource: z
    .string()
    .max(128)
    .optional()
    .describe('Optional marketing attribution source (utm_source)'),
  locale: SupportedLocaleSchema.optional()
    .default('en')
    .describe('Locale for user-facing emails (en, fr, vi)'),
  emailOverride: EmailOverrideSchema.optional().describe(
    'Optional per-send email branding overrides'
  ),
})
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

/** Register succeeds by emitting an auth code (same shape as login). */
export const RegisterResponseSchema = LoginAuthCodeResponseSchema
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>

// ---------------------------------------------------------------------------
// Quick signup (passwordless bootstrap)
// ---------------------------------------------------------------------------

export const QuickSignupRequestSchema = z.object({
  username: z
    .string()
    .regex(USERNAME_REGEX, 'username must match /^[a-zA-Z0-9_\\-.]{3,32}$/')
    .describe('Unique username (3-32 chars, alphanumerics + _ - .)'),
  email: z.string().email().max(254).describe('User email address'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  promoCode: z.string().max(50).optional().describe('Optional promo code to apply at signup'),
  utmSource: z
    .string()
    .max(128)
    .optional()
    .describe('Optional marketing attribution source (utm_source)'),
  locale: SupportedLocaleSchema.optional()
    .default('en')
    .describe('Locale for user-facing emails (en, fr, vi)'),
  emailOverride: EmailOverrideSchema.optional().describe(
    'Optional per-send email branding overrides'
  ),
})
export type QuickSignupRequest = z.infer<typeof QuickSignupRequestSchema>

// ---------------------------------------------------------------------------
// Forgot / reset / verify email
// ---------------------------------------------------------------------------

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email().max(254).describe('Email of the account to recover'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .optional()
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri.optional().describe('URL included in the reset email CTA'),
  locale: SupportedLocaleSchema.optional()
    .default('en')
    .describe('Locale for user-facing emails (en, fr, vi)'),
  emailOverride: EmailOverrideSchema.optional().describe(
    'Optional per-send email branding overrides'
  ),
})
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>

/**
 * Reset-password request — `newPassword` enforces the same 12-char minimum
 * as Register (2026-05-15). Server SHOULD also enforce zxcvbn + HIBP.
 */
export const ResetPasswordRequestSchema = z.object({
  token: z
    .string()
    .regex(OPAQUE_TOKEN_REGEX, 'token must be URL-safe (A-Z, a-z, 0-9, _, -, .)')
    .describe('Single-use reset token from the password reset email'),
  newPassword: z
    .string()
    .min(12, 'newPassword must be at least 12 characters')
    .max(128)
    .describe('New password (12-128 characters; server must also enforce zxcvbn + HIBP check)'),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>

export const VerifyEmailRequestSchema = z.object({
  token: z
    .string()
    .regex(OPAQUE_TOKEN_REGEX, 'token must be URL-safe (A-Z, a-z, 0-9, _, -, .)')
    .describe('Single-use email verification token'),
})
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>

export const SendVerificationRequestSchema = z.object({
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .optional()
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri.optional().describe('URL included in the verification email CTA'),
  locale: SupportedLocaleSchema.optional()
    .default('en')
    .describe('Locale for user-facing emails (en, fr, vi)'),
  emailOverride: EmailOverrideSchema.optional().describe(
    'Optional per-send email branding overrides'
  ),
})
export type SendVerificationRequest = z.infer<typeof SendVerificationRequestSchema>

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------

export const RefreshRequestSchema = z.object({
  /** Refresh token — omit if supplied via httpOnly cookie. */
  refreshToken: z
    .string()
    .min(1)
    .max(2048)
    .optional()
    .describe('Refresh token (omit when supplied via httpOnly cookie)'),
})
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>

/**
 * Refresh response — bounded TTL + non-empty tokens.
 *
 * Bounds rationale (C-3 hacker report, 2026-05-15):
 * - `accessToken` / `refreshToken`: `.min(1).max(2048)` — JWTs are typically
 *   500-1500 chars; 2048 is a comfortable ceiling that rejects megabyte-
 *   length tokens from a malicious / buggy server.
 * - `expiresIn`: `.int().positive().finite().max(86_400)` — 24h hard cap
 *   prevents `Infinity` / negative TTLs that would create immediate-refresh
 *   loops (DoS the refresh endpoint) or silent session death (`setTimeout`
 *   capped to ~25 days).
 */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1).max(2048).describe('New JWT access token'),
  refreshToken: z
    .string()
    .min(1)
    .max(2048)
    .describe('Rotated refresh token to use on next refresh'),
  expiresIn: z
    .number()
    .int()
    .positive()
    .finite()
    .max(86_400)
    .describe('Access token lifetime in seconds (1 .. 86400 / 24h)'),
  user: AuthUserSchema.describe('Authenticated user profile'),
})
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>

// ---------------------------------------------------------------------------
// Token exchange (auth code → access token)
// ---------------------------------------------------------------------------

export const TokenRequestSchema = z.object({
  code: z
    .string()
    .regex(OPAQUE_TOKEN_REGEX, 'code must be URL-safe (A-Z, a-z, 0-9, _, -, .)')
    .describe('Authorization code returned by the login endpoint'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri
    .optional()
    .describe('OAuth redirect URI (must match the one used at login)'),
})
export type TokenRequest = z.infer<typeof TokenRequestSchema>

/**
 * Token exchange response — same lifetime bounds as `RefreshResponseSchema`.
 */
export const TokenResponseSchema = z.object({
  access_token: z.string().min(1).max(2048).describe('JWT access token'),
  token_type: z.literal('Bearer').describe('OAuth token type (always "Bearer")'),
  expires_in: z
    .number()
    .int()
    .positive()
    .finite()
    .max(86_400)
    .describe('Access token lifetime in seconds (1 .. 86400 / 24h)'),
  user: AuthUserSchema.describe('Authenticated user profile'),
})
export type TokenResponse = z.infer<typeof TokenResponseSchema>

// ---------------------------------------------------------------------------
// Verify (token introspection)
// ---------------------------------------------------------------------------

export const VerifyRequestSchema = z.object({
  token: z
    .string()
    .regex(OPAQUE_TOKEN_REGEX, 'token must be URL-safe (A-Z, a-z, 0-9, _, -, .)')
    .describe('JWT access token to verify'),
  app: z
    .string()
    .regex(APP_SLUG_REGEX, 'app must match /^[a-z0-9-]{2,32}$/')
    .optional()
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
})
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>

/**
 * Verify (introspection) response.
 *
 * `payload.exp` is bounded to a positive int (`int().positive().finite()`).
 * No max because some JWTs legitimately expire decades out (long-lived
 * service tokens).
 *
 * Note: `payload` is a strict subset of the full JWT claims. RBAC claims
 * (`globalRoles`, `appRoles`, `twoFactorEnabled`, ...) are NOT included
 * here — fetch them via `/me` if needed. This is intentional: introspection
 * is a fast-path that should not depend on the full user record.
 */
export const VerifyResponseSchema = z.object({
  valid: z.boolean().describe('Whether the token is valid and not expired'),
  payload: z
    .object({
      userId: z.string().min(1).max(64).describe('User ID extracted from the token'),
      email: z.string().email().max(254).describe('User email extracted from the token'),
      username: z.string().min(1).max(64).describe('Username extracted from the token'),
      apps: z.array(z.string().max(100)).max(100).describe('Apps the user has access to'),
      exp: z
        .number()
        .int()
        .positive()
        .finite()
        .describe('Unix timestamp at which the token expires'),
    })
    .optional()
    .describe('Decoded token payload (present only when valid)'),
})
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>

// ---------------------------------------------------------------------------
// Re-exports for fixture / test consumers
// ---------------------------------------------------------------------------

/**
 * Re-exported short-code regex (alphanumeric, 6-12 chars) for downstream
 * use in 2FA TOTP / email verification code schemas (kept here so the
 * regex source lives in one place; consumers can build their own
 * `z.string().regex(SHORT_CODE_REGEX_SOURCE)` if needed).
 */
export const SHORT_CODE_REGEX_SOURCE = SHORT_CODE_REGEX.source
