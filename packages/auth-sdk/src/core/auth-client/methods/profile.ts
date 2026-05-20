/**
 * Profile + account methods — update profile, change password, delete account,
 * quick sign-up. Each function takes the shared {@link ClientContext} and
 * mirrors the corresponding `CoreAuthClient` method exactly.
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

import { AuthError } from '../../errors.js'
import type { AuthUser, QuickSignUpRequest, QuickSignUpResult } from '../../types.js'
import { type ClientContext, parseError, parseErrorCode, unwrapEnvelope } from '../context.js'

/** Update the current user's profile. */
export async function updateProfile(
  ctx: ClientContext,
  data: { firstName?: string; lastName?: string; avatar?: string },
  accessToken?: string
): Promise<AuthUser> {
  const response = await fetch(`${ctx.apiUrl}/profile`, {
    method: 'PUT',
    headers: ctx.baseHeaders({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to update profile'),
      response.status,
      parseErrorCode(result)
    )
  }

  const profileData = unwrapEnvelope<{ user: AuthUser }>(result)
  return profileData.user
}

/** Change (or create) the current user's password. */
export async function changePassword(
  ctx: ClientContext,
  data: { currentPassword?: string; newPassword: string },
  accessToken?: string
): Promise<void> {
  const response = await fetch(`${ctx.apiUrl}/change-password`, {
    method: 'PUT',
    headers: ctx.baseHeaders({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to change password'),
      response.status,
      parseErrorCode(result)
    )
  }
}

/**
 * Schedule the current user's account for soft-deletion (with grace period).
 *
 * The user must echo their email as `confirmation` (anti-misclick), and
 * provide their `password` when they have set their own password
 * (anti-exfiltration). The auth API revokes all refresh tokens on success,
 * so the consumer should call `logout()` immediately after.
 *
 * @example
 * ```ts
 * const result = await client.deleteAccount(
 *   { confirmation: user.email, password: 'my-password' },
 *   accessToken
 * )
 * console.log('Account purges at', result.scheduledDeletionAt)
 * await client.logout()
 * ```
 */
export async function deleteAccount(
  ctx: ClientContext,
  data: { confirmation: string; password?: string },
  accessToken?: string
): Promise<{ scheduledDeletionAt: string; gracePeriodDays: number; message: string }> {
  const response = await fetch(`${ctx.apiUrl}/account`, {
    method: 'DELETE',
    headers: ctx.baseHeaders({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to delete account'),
      response.status,
      parseErrorCode(result)
    )
  }

  const payload = unwrapEnvelope<{
    scheduledDeletionAt: string
    gracePeriodDays: number
    message: string
  }>(result)
  return {
    scheduledDeletionAt: payload.scheduledDeletionAt,
    gracePeriodDays: payload.gracePeriodDays,
    message: payload.message,
  }
}

/** Quick sign up with just username and email (no password). */
export async function quickSignUp(
  ctx: ClientContext,
  data: QuickSignUpRequest
): Promise<QuickSignUpResult> {
  const response = await fetch(`${ctx.apiUrl}/quick-signup`, {
    method: 'POST',
    headers: ctx.baseHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Quick signup failed'),
      response.status,
      parseErrorCode(result)
    )
  }

  const payload = unwrapEnvelope<QuickSignUpResult>(result)
  return {
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  }
}
