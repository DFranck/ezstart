/**
 * OAuth provider (linked account) types — zero dependencies, zero framework
 * coupling.
 */

// ---------------------------------------------------------------------------
// OAuth providers (linked accounts)
// ---------------------------------------------------------------------------

/** Identifier for any OAuth provider known to the platform. */
export type OAuthProviderId = 'google' | 'github' | 'facebook' | 'apple' | 'microsoft' | 'discord'

/**
 * One OAuth provider currently linked to the authenticated user.
 *
 * Returned by `GET /api/auth/me/oauth-providers`.
 */
export interface ConnectedOAuthProvider {
  /** Provider identifier (e.g. `'google'`). */
  provider: OAuthProviderId | string
  /** Email reported by the provider at link time. */
  email: string
  /** Display name surfaced by the provider, if available. */
  displayName?: string
  /** ISO timestamp of when the user linked the provider. */
  connectedAt: string
}
