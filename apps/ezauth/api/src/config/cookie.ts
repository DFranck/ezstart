/**
 * Cookie configuration — centralized to avoid duplication across
 * login-cookie, sso-exchange, token, logout, middleware/auth and refresh routes.
 *
 * Exports cookie names, TTLs and builder helpers that honour COOKIE_DOMAIN
 * in production (cross-subdomain SSO) and remain host-only in dev.
 */

import type { CookieOptions } from 'express'
import { env } from './env.js'

export const ACCESS_COOKIE_NAME = 'ezauth_token'
export const REFRESH_COOKIE_NAME = 'ezauth_refresh'

/** Access token TTL — mirrors JWT access-token lifetime (15 minutes). */
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000

/** Refresh token TTL — must match REFRESH_TOKEN_DAYS in auth.service (30 days). */
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** Path scope for the refresh cookie (only exposed on refresh endpoints). */
export const REFRESH_COOKIE_PATH = '/api/auth/refresh'

function getCookieDomain(): string | undefined {
  if (env.NODE_ENV !== 'production') return undefined
  return env.COOKIE_DOMAIN || '.ezstart.xyz'
}

/**
 * Cookie options for the short-lived access token (`ezauth_token`).
 * Scoped to `/` so every route on the domain can read it.
 */
export function buildAuthCookieOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
    domain: getCookieDomain(),
    ...overrides,
  }
}

/**
 * Cookie options used when clearing the access token cookie. Omits maxAge so
 * the browser removes the cookie immediately, but keeps domain/path/secure
 * flags identical to the ones used at creation (otherwise the clear is ignored).
 */
export function buildAuthCookieClearOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: getCookieDomain(),
    ...overrides,
  }
}

/**
 * Cookie options for the refresh token (`ezauth_refresh`).
 * Scoped to the refresh endpoint path so it's never sent on unrelated routes.
 */
export function buildRefreshCookieOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: REFRESH_COOKIE_PATH,
    domain: getCookieDomain(),
    ...overrides,
  }
}

/** Clear-options counterpart for the refresh cookie. */
export function buildRefreshCookieClearOptions(
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    domain: getCookieDomain(),
    ...overrides,
  }
}

/** Short (seconds) access token TTL exposed to clients in token responses. */
export const ACCESS_TOKEN_EXPIRES_SECONDS = Math.floor(ACCESS_TOKEN_MAX_AGE_MS / 1000)
