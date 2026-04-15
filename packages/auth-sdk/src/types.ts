/**
 * Auth types consumed by EZAuth clients and middleware.
 *
 * Wire-level shapes (login/register/token/verify request bodies, the public
 * `AuthUser` shape, email overrides) come from `@ezstart/api-contracts` — the
 * single source of truth shared with `apps/ezauth/api`. Types defined here
 * are SDK-specific extensions (extra RBAC fields the SDK expects on `AuthUser`,
 * `AuthToken`, `AuthCode`, `JWTPayload`) or thin aliases kept for backward
 * compatibility with existing consumers.
 */

import type {
  AuthUser as AuthUserContract,
  EmailOverride,
  LoginRequest as LoginRequestContract,
  RegisterRequest as RegisterRequestContract,
  SupportedLocale,
  TokenRequest as TokenRequestContract,
} from '@ezstart/api-contracts'

/**
 * Public user shape returned by EZAuth endpoints (`/me`, `/token`, `/refresh`).
 *
 * Extends the contract shape with SDK-/app-specific fields not yet part of the
 * wire contract (RBAC split, presence, onboarding state, promo). These are
 * all optional so consumers typing against the contract `AuthUser` remain
 * compatible.
 */
export interface AuthUser extends AuthUserContract {
  // RBAC - Role-Based Access Control
  /** Cross-app roles (only 'superadmin' allowed). */
  globalRoles?: string[]
  /** App-specific roles: `{ 'myapp': ['admin'], 'otherapp': ['beta-tester'] }`. */
  appRoles?: Record<string, string[]>

  // Promo
  /** Promo code from referral/campaign. */
  promoCode?: string

  // Password state
  /** False for quick-signup users who haven't set a password yet. */
  hasSetOwnPassword?: boolean

  // Presence
  /** ISO date string of last activity. */
  lastActiveAt?: string | null
}

export interface AuthToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

/** Login request body — re-exported from `@ezstart/api-contracts`. */
export type LoginRequest = LoginRequestContract

/**
 * Per-send email overrides forwarded to `@ezstart/email-service` templates.
 *
 * Alias of `EmailOverride` from `@ezstart/api-contracts` — kept under this
 * name for backward compatibility with existing auth-sdk consumers.
 */
export type EmailOverrideRequest = EmailOverride

/** Supported locales for user-facing emails — alias of `SupportedLocale`. */
export type SupportedEmailLocale = SupportedLocale

/**
 * Register request body.
 *
 * Same shape as `RegisterRequest` from `@ezstart/api-contracts`, but `locale`
 * stays optional here because consumers predate the contract's
 * `.default('en')` and rely on omitting the field. Server-side validation
 * (via the contract schema) applies the default regardless.
 */
export interface RegisterRequest extends Omit<RegisterRequestContract, 'locale'> {
  locale?: SupportedLocale
}

/** Token-exchange request body — re-exported from `@ezstart/api-contracts`. */
export type TokenRequest = TokenRequestContract

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
  iat?: number
  exp?: number
}
