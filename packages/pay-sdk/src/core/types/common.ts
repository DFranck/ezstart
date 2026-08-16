// Client Config — agnostic, no @ezstart/* deps
export interface PayClientConfig {
  /** Base API URL (e.g. "https://api.example.com/api") */
  apiUrl: string
  /**
   * Legacy app-slug identifier (e.g. `'ezbill'`). Kept for backward compatibility
   * with existing consumers. Prefer `applicationId` for new code — it resolves
   * to the Application document id in ezauth and unambiguously scopes requests
   * regardless of slug renames.
   *
   * @deprecated Use `applicationId` instead. This field will be removed once all
   * consumers migrate (target: 2026-07).
   */
  appName?: string
  /**
   * Ezauth Application id the client is scoped to. When provided, takes
   * precedence over `appName` in list/query operations. Typically populated
   * automatically by `<PayProvider publishableKey="…" />` via `/api/keys/config`.
   */
  applicationId?: string
  /** Explicit return URL for payment redirects. Falls back to window.location origin. */
  returnUrl?: string
  /** Optional API key for server-to-server authentication (sent as `X-API-Key` header). */
  apiKey?: string
  /** Optional callback to retrieve the current auth token dynamically.
   *  When provided, the token is sent as `Authorization: Bearer <token>` on every request. */
  getToken?: () => string | null | undefined
  /** Optional callback to refresh the auth token when a 401 is received.
   *  Should return the new access token, or null if refresh failed. */
  onTokenRefresh?: () => Promise<string | null>
  /** Optional callback invoked when token refresh fails (e.g. to trigger logout/redirect). */
  onAuthFailure?: () => void
}

/**
 * Response shape returned by `GET /api/keys/config?key=<publishableKey>`
 * (ezpay). Used by the React provider to auto-wire `applicationId` / `appSlug`
 * from a single public key.
 *
 * Fields marked optional are not strictly required for client-side wiring — the
 * `apiUrl` / `webUrl` come from the ezpay environment config and should only be
 * used for cross-checks.
 */
export interface ApplicationConfigResponse {
  applicationId: string
  appSlug: string
  apiUrl?: string
  webUrl?: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
}

/**
 * @deprecated Use `PayClientConfig` with `apiUrl` instead. Kept for backward compat.
 */
export interface LegacyPayClientConfig {
  baseURL?: string
  appName: string
  returnUrl?: string
  getToken?: () => string | null | undefined
  onTokenRefresh?: () => Promise<string | null>
  onAuthFailure?: () => void
}
