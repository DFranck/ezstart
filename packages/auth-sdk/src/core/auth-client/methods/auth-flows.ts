/**
 * Auth flow methods — token exchange, login, current-user, verify, logout,
 * refresh. Each function takes the shared {@link ClientContext} and mirrors
 * the corresponding `CoreAuthClient` method exactly.
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

import { AuthError } from '../../errors.js'
import type { AuthToken, AuthUser, RefreshResult } from '../../types.js'
import { type ClientContext, parseError, parseErrorCode, unwrapEnvelope } from '../context.js'

/**
 * Exchange an authorization code for tokens.
 * Returns the token response including the user and optional refresh token.
 *
 * When the login/authorize request committed to a PKCE flow (RFC 7636), pass
 * the original `codeVerifier` here — the server verifies
 * `BASE64URL(SHA256(verifier))` against the stored challenge. Omit it for
 * legacy (no-PKCE) codes.
 *
 * Pass `redirectUriOverride` to send a redirect_uri that DIFFERS from the
 * SDK-detected default (`{origin}/auth/callback`). RFC 6749 §4.1.3
 * mandates strict equality between the redirect_uri sent at code creation
 * (POST `/login`) and the one sent at token exchange (POST `/token`). The
 * backend enforces this (HAC-HIGH-4 anti-injection), so when the login layer
 * resolved a different destination (e.g. `/dashboard` for same-origin
 * first-party logins), pass that same value here. Falls back to
 * `ctx.redirectUri` (= `detectRedirectUri()` callback URL) when omitted.
 *
 * `/token` is a cookie-auth write — the SDK routes it through
 * `ctx.cookieWrite` so the double-submit CSRF token rides along.
 */
export async function exchangeCode(
  ctx: ClientContext,
  code: string,
  codeVerifier?: string,
  redirectUriOverride?: string
): Promise<AuthToken> {
  const response = await ctx.cookieWrite('/token', {
    method: 'POST',
    body: JSON.stringify({
      code,
      app: ctx.appName,
      redirect_uri: redirectUriOverride ?? ctx.redirectUri,
      // Only include when present — the server treats a missing verifier as
      // legacy unless the code was minted with a challenge (then it rejects).
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Token exchange failed'),
      response.status,
      parseErrorCode(result)
    )
  }

  const data = unwrapEnvelope<AuthToken>(result)
  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    user: data.user,
    refresh_token: data.refresh_token,
  }
}

/** Login with httpOnly cookie (direct, no redirect). */
export async function loginWithCookie(
  ctx: ClientContext,
  email: string,
  password: string
): Promise<AuthUser> {
  const response = await ctx.cookieWrite('/login-cookie', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      app: ctx.appName,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(parseError(result, 'Login failed'), response.status, parseErrorCode(result))
  }

  const data = unwrapEnvelope<{ user: AuthUser }>(result)
  return data.user
}

/** Get current user info (dual-mode: httpOnly cookie OR accessToken). */
export async function getCurrentUser(ctx: ClientContext, accessToken?: string): Promise<AuthUser> {
  // GET request — no CSRF needed (browsers don't send the cookie on
  // cross-origin GET that's not a fetch with credentials, and the server
  // skips the double-submit check on GET methods regardless).
  const response = await fetch(`${ctx.apiUrl}/me`, {
    headers: ctx.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    credentials: 'include',
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to get user info'),
      response.status,
      parseErrorCode(result)
    )
  }

  const data = unwrapEnvelope<{ user: AuthUser }>(result)
  return data.user
}

/** Verify token validity. */
export async function verifyToken(ctx: ClientContext, accessToken: string): Promise<boolean> {
  try {
    const response = await ctx.cookieWrite('/verify', {
      method: 'POST',
      body: JSON.stringify({
        token: accessToken,
        app: ctx.appName,
      }),
    })

    const result = await response.json()
    const data = unwrapEnvelope<{ success?: boolean; valid?: boolean }>(result)
    return data.success !== false && Boolean(data.valid)
  } catch {
    return false
  }
}

/** Logout and clear httpOnly cookie. */
export async function logout(ctx: ClientContext, refreshToken?: string): Promise<void> {
  try {
    await ctx.cookieWrite('/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // Logout can fail silently - we still clear local state
  }
}

/** Refresh tokens using a refresh token. */
export async function refreshTokens(
  ctx: ClientContext,
  refreshToken: string
): Promise<RefreshResult> {
  const response = await ctx.cookieWrite('/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Token refresh failed'),
      response.status,
      parseErrorCode(result)
    )
  }

  const data = unwrapEnvelope<RefreshResult>(result)
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    user: data.user,
  }
}
