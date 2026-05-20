/**
 * Dependency-free JWT expiry decoder used by the `<AuthProvider>` proactive
 * refresh scheduler.
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4). Behaviour unchanged:
 * decodes the `exp` claim (seconds → ms) and returns `null` on any malformed
 * token instead of throwing.
 *
 * @internal
 * @module @ezstart/auth-sdk/react/auth-provider/token-expiry
 */

/**
 * Decode JWT expiry (`exp` claim) without dependencies.
 * Returns the expiry timestamp in milliseconds, or `null` if decoding fails.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
