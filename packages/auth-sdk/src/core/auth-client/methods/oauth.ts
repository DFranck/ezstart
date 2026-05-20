/**
 * OAuth provider (linked account) methods — list + disconnect. Each function
 * takes the shared {@link ClientContext} and mirrors the corresponding
 * `CoreAuthClient` method exactly.
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

import { AuthError } from '../../errors.js'
import type { ConnectedOAuthProvider } from '../../types.js'
import { type ClientContext, parseError, parseErrorCode, unwrapEnvelope } from '../context.js'

/**
 * List the OAuth providers currently linked to the authenticated user.
 *
 * @example
 * ```ts
 * const providers = await client.getOAuthProviders(accessToken)
 * // → [{ provider: 'google', email: 'me@gmail.com', connectedAt: '2026-...' }]
 * ```
 */
export async function getOAuthProviders(
  ctx: ClientContext,
  accessToken?: string
): Promise<ConnectedOAuthProvider[]> {
  const response = await fetch(`${ctx.apiUrl}/me/oauth-providers`, {
    headers: ctx.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    credentials: 'include',
  })

  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to load OAuth providers'),
      response.status,
      parseErrorCode(result)
    )
  }

  const data = unwrapEnvelope<{ providers: ConnectedOAuthProvider[] }>(result)
  return data.providers
}

/**
 * Disconnect (unlink) an OAuth provider from the authenticated user.
 *
 * Throws an `AuthError` with `status === 409` when the server refuses the
 * unlink because it would leave the account without any way to log in
 * (no password set + this was the last provider).
 *
 * @example
 * ```ts
 * await client.disconnectOAuthProvider('google', accessToken)
 * ```
 */
export async function disconnectOAuthProvider(
  ctx: ClientContext,
  provider: string,
  accessToken?: string
): Promise<void> {
  const response = await fetch(`${ctx.apiUrl}/me/oauth-providers/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
    headers: ctx.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    credentials: 'include',
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new AuthError(
      parseError(result as Record<string, unknown>, 'Failed to disconnect provider'),
      response.status
    )
  }
}
