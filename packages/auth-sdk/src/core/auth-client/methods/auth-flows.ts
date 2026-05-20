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
 */
export async function exchangeCode(ctx: ClientContext, code: string): Promise<AuthToken> {
  const response = await fetch(`${ctx.apiUrl}/token`, {
    method: 'POST',
    headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({
      code,
      app: ctx.appName,
      redirect_uri: ctx.redirectUri,
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
  const response = await fetch(`${ctx.apiUrl}/login-cookie`, {
    method: 'POST',
    headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
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
    const response = await fetch(`${ctx.apiUrl}/verify`, {
      method: 'POST',
      headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
    await fetch(`${ctx.apiUrl}/logout`, {
      method: 'POST',
      headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
  const response = await fetch(`${ctx.apiUrl}/refresh`, {
    method: 'POST',
    headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
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
