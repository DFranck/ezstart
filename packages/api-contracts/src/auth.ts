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
 * Validates a redirect URI, rejecting dangerous protocols (`javascript:`,
 * `data:`, `vbscript:`, `blob:`) that could be used for XSS or open-redirect
 * attacks. Only `http:` and `https:` are allowed.
 */
const safeRedirectUri = z
  .string()
  .url()
  .max(2048)
  .refine(
    val => {
      try {
        const { protocol } = new URL(val)
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'redirect_uri must use http or https protocol' }
  )

/** Locales supported by user-facing emails. Mirror of `@ezstart/email-service`. */
export const SupportedLocaleSchema = z.enum(['en', 'fr', 'vi'])
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>

/** Per-send email overrides forwarded to templating (optional branding). */
export const EmailOverrideSchema = z.object({
  subject: z.string().max(500).optional().describe('Email subject override'),
  heading: z.string().max(500).optional().describe('Email main heading override'),
  intro: z.string().max(2000).optional().describe('Email intro paragraph override'),
  ctaLabel: z.string().max(200).optional().describe('Call-to-action button label override'),
  outro: z.string().max(2000).optional().describe('Email outro paragraph override'),
  from: z.string().email().max(254).optional().describe('Sender email address override'),
  replyTo: z.string().email().max(254).optional().describe('Reply-To email address override'),
  bodyHtml: z.string().max(50_000).optional().describe('Full HTML body override'),
})
export type EmailOverride = z.infer<typeof EmailOverrideSchema>

// ---------------------------------------------------------------------------
// User shape (returned by me, token exchange, refresh, verify)
// ---------------------------------------------------------------------------

/**
 * Public user shape — never contains `passwordHash` or secrets.
 *
 * Extra fields may be added by concrete apps; the `.passthrough()` on the
 * response schemas (login/token) keeps client forward-compatibility.
 */
export const AuthUserSchema = z.object({
  _id: z.string().describe('MongoDB ObjectId of the user'),
  email: z.string().describe('User email address'),
  username: z.string().describe('Unique username'),
  firstName: z.string().optional().describe('User first name'),
  lastName: z.string().optional().describe('User last name'),
  avatar: z.string().optional().describe('URL of the user avatar image'),
  isVerified: z.boolean().describe('Whether the user email has been verified'),
  apps: z.array(z.string()).describe('Apps the user has access to'),
  roles: z.array(z.string()).optional().describe('RBAC roles assigned to the user'),
  permissions: z.array(z.string()).optional().describe('Granular permissions granted to the user'),
  features: z.array(z.string()).optional().describe('Feature flags enabled for the user'),
  organizationId: z.string().optional().describe('Organization this user belongs to'),
  managedBy: z.string().optional().describe('User ID of the manager account (if managed)'),
  createdAt: z.string().describe('ISO timestamp when the account was created'),
  updatedAt: z.string().describe('ISO timestamp of the last account update'),
})
export type AuthUser = z.infer<typeof AuthUserSchema>

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email or username is required')
    .max(254)
    .describe('User email address or username'),
  password: z.string().min(1).max(128).describe('User password'),
  app: z.string().min(1).max(100).describe('Target app identifier (ezauth, ezbill, etc.)'),
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
  code: z.string().describe('Short-lived authorization code to exchange for tokens'),
  expires_at: z.string().describe('ISO timestamp at which the code expires'),
  message: z.string().describe('Human-readable status message'),
})
export type LoginAuthCodeResponse = z.infer<typeof LoginAuthCodeResponseSchema>

export const LoginTwoFactorPendingResponseSchema = z.object({
  requires2FA: z.literal(true).describe('Always true — signals a 2FA challenge is required'),
  tempToken: z
    .string()
    .describe('Short-lived token to combine with a TOTP on the 2FA verify endpoint'),
  message: z.string().describe('Human-readable status message'),
})
export type LoginTwoFactorPendingResponse = z.infer<typeof LoginTwoFactorPendingResponseSchema>

export const LoginResponseSchema = z.union([
  LoginAuthCodeResponseSchema,
  LoginTwoFactorPendingResponseSchema,
])
export type LoginResponse = z.infer<typeof LoginResponseSchema>

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(254).describe('User email address'),
  username: z.string().min(1).max(50).describe('Unique username'),
  password: z.string().min(8).max(128).describe('User password (8-128 characters)'),
  firstName: z.string().max(100).optional().describe('User first name'),
  lastName: z.string().max(100).optional().describe('User last name'),
  app: z.string().min(1).max(100).describe('Target app identifier (ezauth, ezbill, etc.)'),
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
  username: z.string().min(1).max(50).describe('Unique username (max 50 characters)'),
  email: z.string().email().max(254).describe('User email address'),
  app: z.string().min(1).max(100).describe('Target app identifier (ezauth, ezbill, etc.)'),
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
  app: z.string().max(100).optional().describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri.optional().describe('URL included in the reset email CTA'),
  locale: SupportedLocaleSchema.optional()
    .default('en')
    .describe('Locale for user-facing emails (en, fr, vi)'),
  emailOverride: EmailOverrideSchema.optional().describe(
    'Optional per-send email branding overrides'
  ),
})
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>

export const ResetPasswordRequestSchema = z.object({
  token: z
    .string()
    .min(1)
    .max(2048)
    .describe('Single-use reset token from the password reset email'),
  newPassword: z.string().min(8).max(128).describe('New password (8-128 characters)'),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1).max(2048).describe('Single-use email verification token'),
})
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>

export const SendVerificationRequestSchema = z.object({
  app: z.string().max(100).optional().describe('Target app identifier (ezauth, ezbill, etc.)'),
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
    .max(4096)
    .optional()
    .describe('Refresh token (omit when supplied via httpOnly cookie)'),
})
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>

export const RefreshResponseSchema = z.object({
  accessToken: z.string().describe('New JWT access token'),
  refreshToken: z.string().describe('Rotated refresh token to use on next refresh'),
  expiresIn: z.number().describe('Access token lifetime in seconds'),
  user: AuthUserSchema.describe('Authenticated user profile'),
})
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>

// ---------------------------------------------------------------------------
// Token exchange (auth code → access token)
// ---------------------------------------------------------------------------

export const TokenRequestSchema = z.object({
  code: z.string().min(1).max(2048).describe('Authorization code returned by the login endpoint'),
  app: z.string().min(1).max(100).describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirect_uri: safeRedirectUri
    .optional()
    .describe('OAuth redirect URI (must match the one used at login)'),
})
export type TokenRequest = z.infer<typeof TokenRequestSchema>

export const TokenResponseSchema = z.object({
  access_token: z.string().describe('JWT access token'),
  token_type: z.literal('Bearer').describe('OAuth token type (always "Bearer")'),
  expires_in: z.number().describe('Access token lifetime in seconds'),
  user: AuthUserSchema.describe('Authenticated user profile'),
})
export type TokenResponse = z.infer<typeof TokenResponseSchema>

// ---------------------------------------------------------------------------
// Verify (token introspection)
// ---------------------------------------------------------------------------

export const VerifyRequestSchema = z.object({
  token: z.string().min(1).max(4096).describe('JWT access token to verify'),
  app: z.string().max(100).optional().describe('Target app identifier (ezauth, ezbill, etc.)'),
})
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>

export const VerifyResponseSchema = z.object({
  valid: z.boolean().describe('Whether the token is valid and not expired'),
  payload: z
    .object({
      userId: z.string().describe('User ID extracted from the token'),
      email: z.string().describe('User email extracted from the token'),
      username: z.string().describe('Username extracted from the token'),
      apps: z.array(z.string()).describe('Apps the user has access to'),
      exp: z.number().describe('Unix timestamp at which the token expires'),
    })
    .optional()
    .describe('Decoded token payload (present only when valid)'),
})
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>
