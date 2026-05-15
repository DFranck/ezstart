/**
 * Auth request schemas — client → server payloads.
 *
 * Schemas validated on the SERVER (via `safeParse` in route handlers) against
 * incoming HTTP bodies. Companion to `./auth-responses.ts` for the
 * corresponding response shapes, and `./auth-shared.ts` for the primitives.
 *
 * @see ./auth-shared.ts
 * @see ./auth-responses.ts
 */

import { z } from 'zod'
import {
  APP_SLUG_REGEX,
  EmailOverrideSchema,
  NO_CONTROL_CHARS,
  OPAQUE_TOKEN_REGEX,
  SupportedLocaleSchema,
  USERNAME_REGEX,
  safeRedirectUri,
} from './auth-shared.js'

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
 *
 * **A14 fix (2026-05-15)** — the `email` field rejects control characters
 * (`\r`, `\n`, `\t`, `\0`, `\v`, `\f`) to defuse log-injection and SMTP
 * header smuggling primitives when the server logs the raw identifier.
 */
export const LoginRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email or username is required')
    .max(254)
    .regex(NO_CONTROL_CHARS, 'email/username must not contain control characters')
    .describe('User email address or username'),
  /**
   * Password for login. **Intentionally `min(1)` (not `min(12)` like
   * Register/Reset)** because hash comparison is server-side and bumping
   * the floor would lock out pre-2026 users with shorter passwords. Strength
   * enforcement happens on Register/Reset where the user actively sets the
   * password; here the contract just rejects the trivial empty case.
   *
   * The 128-char ceiling matches Register/Reset and protects against
   * resource exhaustion (bcrypt cost grows with input length up to 72 bytes
   * where it truncates).
   *
   * **Do not "fix" this to `min(12)` to "match Register".** That would
   * brick login for every user with an 8-char legacy password until they
   * reset — a credibility-destroying mass-lockout event.
   */
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
