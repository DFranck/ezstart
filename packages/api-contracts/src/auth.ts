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

/** Locales supported by user-facing emails. Mirror of `@ezstart/email-service`. */
export const SupportedLocaleSchema = z.enum(['en', 'fr', 'vi'])
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>

/** Per-send email overrides forwarded to templating (optional branding). */
export const EmailOverrideSchema = z.object({
  subject: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  ctaLabel: z.string().optional(),
  outro: z.string().optional(),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  bodyHtml: z.string().optional(),
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
  _id: z.string(),
  email: z.string(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  isVerified: z.boolean(),
  apps: z.array(z.string()),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  managedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type AuthUser = z.infer<typeof AuthUserSchema>

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const LoginRequestSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1),
  app: z.string().min(1),
  redirect_uri: z.string().url().optional(),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

/**
 * Login response — when 2FA is NOT enabled the server returns a short-lived
 * authorization code that the client exchanges for tokens via the `/token`
 * endpoint. When 2FA IS enabled the server instead returns a temporary token
 * that must be combined with a TOTP via the 2FA verify endpoint.
 */
export const LoginAuthCodeResponseSchema = z.object({
  code: z.string(),
  expires_at: z.string(),
  message: z.string(),
})
export type LoginAuthCodeResponse = z.infer<typeof LoginAuthCodeResponseSchema>

export const LoginTwoFactorPendingResponseSchema = z.object({
  requires2FA: z.literal(true),
  tempToken: z.string(),
  message: z.string(),
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
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  app: z.string().min(1),
  redirect_uri: z.string().url().optional(),
  promoCode: z.string().optional(),
  locale: SupportedLocaleSchema.optional().default('en'),
  emailOverride: EmailOverrideSchema.optional(),
})
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

/** Register succeeds by emitting an auth code (same shape as login). */
export const RegisterResponseSchema = LoginAuthCodeResponseSchema
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>

// ---------------------------------------------------------------------------
// Quick signup (passwordless bootstrap)
// ---------------------------------------------------------------------------

export const QuickSignupRequestSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email(),
  app: z.string().min(1),
  promoCode: z.string().optional(),
  locale: SupportedLocaleSchema.optional().default('en'),
  emailOverride: EmailOverrideSchema.optional(),
})
export type QuickSignupRequest = z.infer<typeof QuickSignupRequestSchema>

// ---------------------------------------------------------------------------
// Forgot / reset / verify email
// ---------------------------------------------------------------------------

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  app: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  locale: SupportedLocaleSchema.optional().default('en'),
  emailOverride: EmailOverrideSchema.optional(),
})
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1),
})
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>

export const SendVerificationRequestSchema = z.object({
  app: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  locale: SupportedLocaleSchema.optional().default('en'),
  emailOverride: EmailOverrideSchema.optional(),
})
export type SendVerificationRequest = z.infer<typeof SendVerificationRequestSchema>

// ---------------------------------------------------------------------------
// Refresh access token
// ---------------------------------------------------------------------------

export const RefreshRequestSchema = z.object({
  /** Refresh token — omit if supplied via httpOnly cookie. */
  refreshToken: z.string().min(1).optional(),
})
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: AuthUserSchema,
})
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>

// ---------------------------------------------------------------------------
// Token exchange (auth code → access token)
// ---------------------------------------------------------------------------

export const TokenRequestSchema = z.object({
  code: z.string().min(1),
  app: z.string().min(1),
  redirect_uri: z.string().url().optional(),
})
export type TokenRequest = z.infer<typeof TokenRequestSchema>

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  user: AuthUserSchema,
})
export type TokenResponse = z.infer<typeof TokenResponseSchema>

// ---------------------------------------------------------------------------
// Verify (token introspection)
// ---------------------------------------------------------------------------

export const VerifyRequestSchema = z.object({
  token: z.string().min(1),
  app: z.string().optional(),
})
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>

export const VerifyResponseSchema = z.object({
  valid: z.boolean(),
  payload: z
    .object({
      userId: z.string(),
      email: z.string(),
      username: z.string(),
      apps: z.array(z.string()),
      exp: z.number(),
    })
    .optional(),
})
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>
