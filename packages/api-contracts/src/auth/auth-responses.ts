/**
 * Auth response schemas — server → client payloads.
 *
 * Schemas validated on the CLIENT (via `safeParse` after parsing the
 * fetch response) against server responses. Companion to
 * `./auth-requests.ts` and `./auth-shared.ts`.
 *
 * @see ./auth-shared.ts
 * @see ./auth-requests.ts
 */

import { z } from 'zod'
import { AuthUserSchema } from './auth-shared.js'

// ---------------------------------------------------------------------------
// Login response (discriminated union: auth-code branch vs 2FA pending branch)
// ---------------------------------------------------------------------------

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
// Register response (alias to auth-code branch)
// ---------------------------------------------------------------------------

/** Register succeeds by emitting an auth code (same shape as login). */
export const RegisterResponseSchema = LoginAuthCodeResponseSchema
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>

// ---------------------------------------------------------------------------
// Refresh response
// ---------------------------------------------------------------------------

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
// Token exchange response
// ---------------------------------------------------------------------------

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
// Verify (introspection) response
// ---------------------------------------------------------------------------

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
