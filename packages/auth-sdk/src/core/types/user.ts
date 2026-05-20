/**
 * User, token, and request-body types — zero dependencies, zero framework
 * coupling.
 */

// ---------------------------------------------------------------------------
// User & tokens
// ---------------------------------------------------------------------------

/** Public user shape returned by auth endpoints. */
export interface AuthUser {
  _id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified?: boolean
  apps?: string[]
  roles?: string[]
  permissions?: string[]
  features?: string[]
  organizationId?: string
  managedBy?: string
  createdAt: string
  updatedAt: string
  // RBAC extensions
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  // Promo
  promoCode?: string
  // Password state
  hasSetOwnPassword?: boolean
  /**
   * When true, the user MUST reset their password on the next login. Set by an
   * admin (e.g. after a suspected leak) or after a force-rotation event. The
   * server-side login flow short-circuits the session in favor of a forced
   * password-reset prompt; the client uses this flag to surface a banner /
   * route guard until cleared.
   */
  mustChangePassword?: boolean
  /**
   * 2FA enrollment flag — `true` when the user has an enabled TOTP secret.
   * Optional + backward-compatible : pre-`2FA_MANDATORY_ADMIN-001` (2026-05-01)
   * payloads omit the field, consumers MUST treat `undefined` as "unknown"
   * and either coerce to `false` for a strict gate or fall back to a fresh
   * `/me` round trip.
   *
   * Used by `<RequireTwoFactor>` to block elevated-role users (admin /
   * superadmin) from rendering admin UI until they enroll 2FA. The backend
   * enforces the same gate authoritatively via the `requireTwoFactor()`
   * middleware on every `/api/admin/*` route — this client-side flag is
   * defense-in-depth, not the source of truth.
   */
  twoFactorEnabled?: boolean
  // Presence
  lastActiveAt?: string | null
}

/** Token response from login / token exchange. */
export interface AuthToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
  refresh_token?: string
}

/** Refresh result. */
export interface RefreshResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
  app: string
  redirect_uri?: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
  app: string
  redirect_uri?: string
  locale?: string
  promoCode?: string
  utmSource?: string
}

export interface TokenRequest {
  code: string
  app: string
  redirect_uri?: string
}

export interface QuickSignUpRequest {
  username: string
  email: string
  app: string
  locale?: string
  promoCode?: string
  utmSource?: string
  emailOverride?: EmailOverrideRequest
}

export interface QuickSignUpResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface EmailOverrideRequest {
  subject?: string
  from?: string
  replyTo?: string
  bodyHtml?: string
  [key: string]: unknown
}
