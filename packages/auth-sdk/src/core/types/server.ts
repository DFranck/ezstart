/**
 * Server-side auth types (JWT payload, authorization code) — zero
 * dependencies, zero framework coupling.
 */

// ---------------------------------------------------------------------------
// Server-side types (JWT, auth code)
// ---------------------------------------------------------------------------

export interface AuthCode {
  code: string
  userId: string
  app: string
  redirect_uri?: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

export interface AuthCodeResponse {
  code: string
  expires_at: string
}

export interface JWTPayload {
  userId: string
  email: string
  username: string
  apps: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  permissions?: string[]
  features?: string[]
  /**
   * Email verification status of the user at the moment the token was issued.
   *
   * Optional for backward compatibility — JWTs signed before
   * `JWT-ISVERIFIED-CLAIM-001` (2026-05-01) do not carry this claim.
   * Consumers should treat `undefined` as "unknown" and fall back to
   * `user.isVerified` from `getMe()` / the auth store, or coerce to `false`
   * for verified-only feature gates.
   *
   * Once the new claim is everywhere (after the longest refresh token
   * lifetime — currently 30 days), this can stop being optional.
   */
  isVerified?: boolean
  /**
   * 2FA enrollment status of the user at the moment the token was issued.
   *
   * Optional for backward compatibility — JWTs signed before
   * `2FA_MANDATORY_ADMIN-001` (2026-05-01) do not carry this claim.
   * Consumers should treat `undefined` as "unknown" and fall back to
   * `user.twoFactorEnabled` from `getMe()` / the auth store, or coerce to
   * `false` for a strict 2FA gate. Once the new claim has propagated
   * through the longest refresh token lifetime (30 days), this can stop
   * being optional.
   */
  twoFactorEnabled?: boolean
  iat?: number
  exp?: number
}
