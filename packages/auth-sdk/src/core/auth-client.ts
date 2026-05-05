/**
 * Core auth client — framework-agnostic, zero `@ezstart/*` dependencies.
 *
 * Uses `fetch()` directly. All methods return typed promises.
 *
 * @example
 * ```ts
 * const client = createAuthClient({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   appName: 'myapp',
 * })
 * const user = await client.loginWithCookie('user@example.com', 'password')
 * ```
 */

import { getEzauthDefaultUrls } from './defaults.js'
import { AuthError } from './errors.js'
import type {
  AdminAnalyticsOverview,
  AuditLogFilters,
  AuditLogListResponse,
  AuthClientConfig,
  AuthSDKConfig,
  AuthToken,
  AuthUser,
  ConnectedOAuthProvider,
  PublishableKeyConfig,
  QuickSignUpRequest,
  QuickSignUpResult,
  RefreshResult,
} from './types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unwrap API envelope `{ data: T }` → `T`, or return the flat response.
 *
 * The wire shape is `Record<string, unknown>` because we receive raw JSON,
 * but the caller has already typed the expected payload via the generic.
 * `Record<string, unknown>` and a typed object overlap structurally, so we
 * cast through the generic itself rather than the unsafe `unknown` bridge.
 *
 * @internal
 */
function unwrapEnvelope<T>(body: Record<string, unknown>): T {
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as T
}

/** Parse an error from a response body. */
function parseError(body: Record<string, unknown>, fallback: string): string {
  // Handle structured envelope: { error: { message: "..." } }
  if (body.error && typeof body.error === 'object') {
    const errObj = body.error as Record<string, unknown>
    if (typeof errObj.message === 'string') return errObj.message
  }
  // Handle flat error string: { error: "..." }
  if (typeof body.error === 'string') return body.error
  // Handle nested data.error
  if (typeof (body.data as Record<string, unknown>)?.error === 'string') {
    return (body.data as Record<string, unknown>).error as string
  }
  // Handle top-level message
  if (typeof body.message === 'string') return body.message
  return fallback
}

// ---------------------------------------------------------------------------
// Auth Client class
// ---------------------------------------------------------------------------

export class CoreAuthClient {
  private apiUrl: string
  private appName: string
  private redirectUri: string | undefined
  private apiKey: string | undefined

  constructor(config: AuthClientConfig) {
    this.apiUrl = config.apiUrl
    this.appName = config.appName
    this.redirectUri = config.redirectUri
    this.apiKey = config.apiKey
  }

  /** Build base headers, injecting `X-API-Key` when configured. */
  private baseHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }
    return headers
  }

  /** Update the redirect URI (useful when it can only be resolved client-side). */
  setRedirectUri(uri: string): void {
    this.redirectUri = uri
  }

  /** Update the app name (used after async key config resolution). */
  setAppName(name: string): void {
    this.appName = name
  }

  /** Update the API URL (used after async key config resolution). */
  setApiUrl(url: string): void {
    this.apiUrl = url
  }

  /** Get the configured app name. */
  getAppName(): string {
    return this.appName
  }

  /** Get the configured API URL. */
  getApiUrl(): string {
    return this.apiUrl
  }

  // ── Auth flows ──────────────────────────────────────────────────────────

  /**
   * Exchange an authorization code for tokens.
   * Returns the token response including the user and optional refresh token.
   */
  async exchangeCode(code: string): Promise<AuthToken> {
    const response = await fetch(`${this.apiUrl}/token`, {
      method: 'POST',
      headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        code,
        app: this.appName,
        redirect_uri: this.redirectUri,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Token exchange failed'), response.status)
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
  async loginWithCookie(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${this.apiUrl}/login-cookie`, {
      method: 'POST',
      headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        app: this.appName,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Login failed'), response.status)
    }

    const data = unwrapEnvelope<{ user: AuthUser }>(result)
    return data.user
  }

  /** Get current user info (dual-mode: httpOnly cookie OR accessToken). */
  async getCurrentUser(accessToken?: string): Promise<AuthUser> {
    const response = await fetch(`${this.apiUrl}/me`, {
      headers: this.baseHeaders(
        accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      ),
      credentials: 'include',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to get user info'), response.status)
    }

    const data = unwrapEnvelope<{ user: AuthUser }>(result)
    return data.user
  }

  /** Verify token validity. */
  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/verify`, {
        method: 'POST',
        headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          token: accessToken,
          app: this.appName,
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
  async logout(refreshToken?: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/logout`, {
        method: 'POST',
        headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // Logout can fail silently - we still clear local state
    }
  }

  /** Update the current user's profile. */
  async updateProfile(
    data: { firstName?: string; lastName?: string; avatar?: string },
    accessToken?: string
  ): Promise<AuthUser> {
    const response = await fetch(`${this.apiUrl}/profile`, {
      method: 'PUT',
      headers: this.baseHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to update profile'), response.status)
    }

    const profileData = unwrapEnvelope<{ user: AuthUser }>(result)
    return profileData.user
  }

  /** Change (or create) the current user's password. */
  async changePassword(
    data: { currentPassword?: string; newPassword: string },
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(`${this.apiUrl}/change-password`, {
      method: 'PUT',
      headers: this.baseHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to change password'), response.status)
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
  async deleteAccount(
    data: { confirmation: string; password?: string },
    accessToken?: string
  ): Promise<{ scheduledDeletionAt: string; gracePeriodDays: number; message: string }> {
    const response = await fetch(`${this.apiUrl}/account`, {
      method: 'DELETE',
      headers: this.baseHeaders({
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to delete account'), response.status)
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
  async quickSignUp(data: QuickSignUpRequest): Promise<QuickSignUpResult> {
    const response = await fetch(`${this.apiUrl}/quick-signup`, {
      method: 'POST',
      headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Quick signup failed'), response.status)
    }

    const payload = unwrapEnvelope<QuickSignUpResult>(result)
    return {
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }
  }

  /**
   * List the OAuth providers currently linked to the authenticated user.
   *
   * @example
   * ```ts
   * const providers = await client.getOAuthProviders(accessToken)
   * // → [{ provider: 'google', email: 'me@gmail.com', connectedAt: '2026-...' }]
   * ```
   */
  async getOAuthProviders(accessToken?: string): Promise<ConnectedOAuthProvider[]> {
    const response = await fetch(`${this.apiUrl}/me/oauth-providers`, {
      headers: this.baseHeaders(
        accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      ),
      credentials: 'include',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to load OAuth providers'), response.status)
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
  async disconnectOAuthProvider(provider: string, accessToken?: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/me/oauth-providers/${encodeURIComponent(provider)}`,
      {
        method: 'DELETE',
        headers: this.baseHeaders(
          accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        ),
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new AuthError(
        parseError(result as Record<string, unknown>, 'Failed to disconnect provider'),
        response.status
      )
    }
  }

  /**
   * List the current user's audit log entries (paginated, filterable).
   * Defaults to the latest 20 entries across the free-tier 30-day retention
   * window.
   *
   * @example
   * ```ts
   * const { items, total } = await client.listAuditLog({ limit: 50 })
   * for (const entry of items) console.log(entry.action, entry.createdAt)
   * ```
   */
  async listAuditLog(
    filters: AuditLogFilters = {},
    accessToken?: string
  ): Promise<AuditLogListResponse> {
    const params = new URLSearchParams()
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))
    if (filters.offset !== undefined) params.set('offset', String(filters.offset))
    if (filters.action) params.set('action', filters.action)
    const query = params.toString()
    const url =
      query.length > 0 ? `${this.apiUrl}/me/audit-log?${query}` : `${this.apiUrl}/me/audit-log`

    const response = await fetch(url, {
      headers: this.baseHeaders(
        accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      ),
      credentials: 'include',
    })

    const result = await response.json()
    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to list audit log'), response.status)
    }
    return unwrapEnvelope<AuditLogListResponse>(result)
  }

  /**
   * Fetch the platform analytics overview (superadmin only).
   *
   * Returns user/app/key totals, MAU proxy, verified+2FA percentages, the
   * last-30-day signup trend (always 30 contiguous days, zero-filled), and
   * the top 5 apps by user count. The endpoint is gated by `requireAdmin` +
   * an explicit superadmin check on the API.
   *
   * @example
   * ```ts
   * const overview = await client.getAdminAnalyticsOverview(accessToken)
   * console.log(overview.totalUsers, overview.signupTrend.length) // → 30
   * ```
   */
  async getAdminAnalyticsOverview(accessToken?: string): Promise<AdminAnalyticsOverview> {
    // Admin endpoints live under `/api/admin`, NOT `/api/auth/admin`. The
    // configured `apiUrl` points at `/api/auth`, so we strip that suffix
    // before appending the admin path. Same logic as `normalizeApiBaseUrl`
    // but kept inline to avoid leaking the helper out of the module.
    let base = this.apiUrl
    if (base.endsWith('/api/auth')) base = base.slice(0, -'/api/auth'.length)
    if (base.endsWith('/')) base = base.slice(0, -1)

    const response = await fetch(`${base}/api/admin/analytics/overview`, {
      headers: this.baseHeaders(
        accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      ),
      credentials: 'include',
    })

    const result = await response.json()
    if (!response.ok) {
      throw new AuthError(parseError(result, 'Failed to fetch analytics overview'), response.status)
    }
    return unwrapEnvelope<AdminAnalyticsOverview>(result)
  }

  /** Refresh tokens using a refresh token. */
  async refreshTokens(refreshToken: string): Promise<RefreshResult> {
    const response = await fetch(`${this.apiUrl}/refresh`, {
      method: 'POST',
      headers: this.baseHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new AuthError(parseError(result, 'Token refresh failed'), response.status)
    }

    const data = unwrapEnvelope<RefreshResult>(result)
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: data.user,
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a standalone auth client.
 *
 * @example
 * ```ts
 * import { createCoreAuthClient } from '@ezstart/auth-sdk/core'
 *
 * const client = createCoreAuthClient({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   appName: 'myapp',
 * })
 * ```
 */
export function createCoreAuthClient(config: AuthClientConfig): CoreAuthClient {
  return new CoreAuthClient(config)
}

// ---------------------------------------------------------------------------
// Publishable key config fetching
// ---------------------------------------------------------------------------

/**
 * Normalize a URL to a bare base (no trailing `/api/auth`, no trailing slash).
 *
 * Accepts either convention the SDK can receive from consumers:
 * - Base URL:   `'https://api.example.com'`
 * - Auth URL:   `'https://api.example.com/api/auth'` (low-level `AuthClientConfig` shape)
 *
 * Returns: `'https://api.example.com'` in both cases.
 *
 * This avoids URL construction bugs like `/api/auth/api/keys/config` when a
 * consumer passes the auth URL to a function that expects the base.
 *
 * @internal
 */
function normalizeApiBaseUrl(input: string): string {
  let base = input
  if (base.endsWith('/api/auth')) {
    base = base.slice(0, -'/api/auth'.length)
  }
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  return base
}

/**
 * Fetch app configuration from EZAuth API using a publishable key.
 * The key acts as authentication — no user auth needed.
 *
 * Accepts either a bare base URL or an auth URL (with `/api/auth` suffix) —
 * the function normalizes internally to avoid double-prefixing the path.
 *
 * @example
 * ```ts
 * // Both of these resolve to GET https://api.ezauth.com/api/keys/config
 * await fetchKeyConfig('ez_pk_live_abc123', 'https://api.ezauth.com')
 * await fetchKeyConfig('ez_pk_live_abc123', 'https://api.ezauth.com/api/auth')
 * ```
 */
export async function fetchKeyConfig(
  publishableKey: string,
  apiBaseUrl: string
): Promise<PublishableKeyConfig> {
  const base = normalizeApiBaseUrl(apiBaseUrl)
  const response = await fetch(`${base}/api/keys/config?key=${encodeURIComponent(publishableKey)}`)
  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to fetch key config'),
      response.status,
      'KEY_CONFIG_ERROR'
    )
  }

  const data = unwrapEnvelope<PublishableKeyConfig>(result)
  return data
}

// ---------------------------------------------------------------------------
// SDK config resolver
// ---------------------------------------------------------------------------

/**
 * Default API URL for localhost development only.
 *
 * Agnostic convention: localhost dev envs commonly boot the auth API on a
 * well-known port, so defaulting to `http://localhost:6110` here keeps the
 * dev DX zero-config without coupling the SDK to any specific deployment.
 *
 * For any non-localhost environment (staging, production, self-hosted,
 * preview, etc.), the consumer MUST pass `apiUrl` explicitly (or a
 * `publishableKey` whose `/api/keys/config` response provides the URL).
 * The SDK intentionally does NOT ship hardcoded monorepo-specific fallbacks.
 */
const DEFAULT_LOCAL_API = 'http://localhost:6110'
/** Default Web URL for localhost development only. Same rationale as above. */
const DEFAULT_LOCAL_WEB = 'http://localhost:6111'

/**
 * Thrown when `resolveSDKConfig` is invoked outside localhost without any of
 * the signals that would let it resolve an API URL: no `firstParty`, no
 * `publishableKey`, no explicit `apiUrl`.
 *
 * Fail-fast, no silent fallback to a vendor-specific production URL.
 */
/**
 * Thrown when `firstParty: true` is used off-localhost without an explicit
 * `appName`. Defaulting to `'ezauth'` silently on a non-ezauth app would
 * cause every auth request to carry `app=ezauth`, which is a cross-tenant
 * leak (sessions, keys, quotas attributed to the wrong tenant).
 *
 * Localhost is intentionally permissive to preserve zero-config dev DX.
 */
const MISSING_FIRST_PARTY_APP_NAME_MESSAGE =
  'auth-sdk: first-party mode requires an explicit `appName` off-localhost. ' +
  'Defaulting to `"ezauth"` silently would leak cross-tenant requests.'

/**
 * Thrown when a resolved `webUrl` still points at localhost while the app
 * itself is running off-localhost. This usually means an env var such as
 * `NEXT_PUBLIC_EZAUTH_WEB_URL` is missing or empty in the target
 * environment — without this guard the user would be redirected to
 * `http://localhost:6111` at login/register time and the auth flow would
 * silently break in production.
 */
const WEB_URL_LOCALHOST_TRAP_MESSAGE =
  'auth-sdk: webUrl resolves to localhost but the app is not running on ' +
  'localhost. Set `NEXT_PUBLIC_EZAUTH_WEB_URL` (or an equivalent env var) ' +
  'or pass `webUrl` explicitly to your provider.'

/**
 * Assert that a `webUrl` is safe for the current environment. Throws when
 * the app runs off-localhost but `webUrl` still resolves to a localhost
 * host. Localhost apps may point anywhere (including other localhost
 * ports), so no check is applied when `isLocal` is true.
 *
 * Matches `http://localhost`, `https://localhost`, and the `.localhost`
 * TLD variants so multi-tenant dev URLs (e.g. `https://app.localhost`)
 * also trip the guard when used unintentionally in prod.
 */
function assertWebUrlNotLocalhostOffLocal(webUrl: string, isLocal: boolean): void {
  if (isLocal) return
  try {
    const parsed = new URL(webUrl)
    const host = parsed.hostname
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
    ) {
      throw new AuthError(WEB_URL_LOCALHOST_TRAP_MESSAGE, 0, 'CONFIG_ERROR')
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    // Malformed URL: fall back to string contains to avoid false negatives.
    if (webUrl.includes('localhost') || webUrl.includes('127.0.0.1')) {
      throw new AuthError(WEB_URL_LOCALHOST_TRAP_MESSAGE, 0, 'CONFIG_ERROR')
    }
  }
}

/**
 * Check if we are running on localhost.
 *
 * Covers:
 * - `localhost`
 * - `*.localhost` TLD (RFC 6761, used by Chrome for multi-tenant local dev)
 * - `127.0.0.1` (IPv4 loopback)
 * - `0.0.0.0` (unspecified IPv4, often bound in dev)
 * - `[::1]` / `::1` (IPv6 loopback, bracketed or bare)
 *
 * Returns `false` when `window` is undefined (SSR / Node). Consumers running
 * the SDK in a server-rendered context (Next.js SSR/RSC) MUST either:
 * - Pass an explicit `apiUrl` so `resolveSDKConfig` never needs to guess from
 *   hostname, OR
 * - Load the provider behind a `'use client'` boundary so this helper only
 *   ever evaluates in the browser.
 *
 * Without one of the above, `resolveSDKConfig` will throw a CONFIG_ERROR at
 * SSR time because no URL signals are available.
 */
function isLocalhost(): boolean {
  // Browser: authoritative — check hostname directly.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    return (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
    )
  }
  // SSR / Node: use env signals. `VERCEL_ENV` is always set on Vercel (dev
  // preview/production alike), while Next.js local dev only exposes
  // `NODE_ENV === 'development'`. If we are running under Next dev without
  // any Vercel deploy marker, we are on localhost — even though the window
  // global does not exist yet for this server render pass.
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VERCEL_ENV || process.env.RAILWAY_ENVIRONMENT) return false
    if (process.env.NODE_ENV === 'development') return true
  }
  return false
}

/**
 * Detect the redirect URI from the current browser URL.
 */
function detectRedirectUri(): string {
  if (typeof window === 'undefined') return '/auth/callback'
  const pathParts = window.location.pathname.split('/')
  const maybeLocale = pathParts[1]
  const hasLocalePrefix = maybeLocale !== undefined && /^[a-z]{2,3}$/.test(maybeLocale)
  const localePrefix = hasLocalePrefix ? `/${maybeLocale}` : ''
  return `${window.location.origin}${localePrefix}/auth/callback`
}

/**
 * Descriptor for the async publishable-key → app config fetch the caller must
 * perform when `resolveSDKConfig` returns a non-null `keyFetch`. The fetch is
 * intentionally NOT started here so that `resolveSDKConfig` is a pure function
 * safe to call from `useMemo` (React may recompute memoized values more than
 * once per dep change — firing the fetch from inside the memo would hammer
 * `/api/keys/config` and trip the 30 req/min rate limit).
 */
export interface PendingKeyFetch {
  /** The publishable key to resolve. */
  publishableKey: string
  /** Normalized API base (no `/api/auth` or trailing slash), ready for `fetchKeyConfig`. */
  apiBaseUrl: string
}

/**
 * Resolve the full SDK configuration into a CoreAuthClient config + web URL.
 *
 * Handles three modes:
 * 1. Publishable key → returns a `keyFetch` descriptor the caller must pass to
 *    `fetchKeyConfig()` inside an effect (NOT during render).
 * 2. First-party → immediate config from env/defaults
 * 3. Dev mode (no key + localhost) → permissive defaults
 *
 * **Pure function** — no side effects, safe to call from `useMemo`. The actual
 * network request is deferred to the caller's effect.
 *
 * @returns Resolved config with apiUrl, appName, webUrl, and an optional
 *          `keyFetch` descriptor the caller resolves asynchronously.
 */
export function resolveSDKConfig(sdkConfig: AuthSDKConfig): {
  clientConfig: AuthClientConfig
  webUrl: string
  /**
   * Descriptor the caller must pass to `fetchKeyConfig()` from an effect when
   * a publishable key was provided. `null` otherwise.
   */
  keyFetch: PendingKeyFetch | null
} {
  const key = sdkConfig.publishableKey
  const local = isLocalhost()

  // Normalize the consumer-supplied apiUrl (if any) to a bare base URL.
  // Accepts both `'http://host'` and `'http://host/api/auth'` conventions so
  // downstream URL construction never ends up with `/api/auth/api/auth` or
  // `/api/auth/api/keys/config` suffixes.
  const consumerBaseUrl = sdkConfig.apiUrl ? normalizeApiBaseUrl(sdkConfig.apiUrl) : undefined

  // Env-aware default URLs for the canonical EZAuth deployment. Picks
  // production / staging / local based on `DEPLOY_ENV` / `VERCEL_GIT_*` /
  // hostname (cf. `core/defaults.ts` `detectAuthEnvironment`). External
  // customers self-hosting against a different cloud override via the
  // `apiUrl` / `webUrl` props or the `NEXT_PUBLIC_EZAUTH_*_URL` env vars
  // — those win over these defaults. The defaults exist so the canonical
  // EZStart deployment needs ZERO env vars in any of its environments.
  const envDefaults = getEzauthDefaultUrls()
  const defaultApiBaseUrl = envDefaults.api
  const defaultWebUrl = sdkConfig.webUrl ?? envDefaults.web

  if (sdkConfig.firstParty) {
    // First-party mode: direct access, no key needed.
    //
    // Security guard: off-localhost, `appName` must be explicit. Defaulting
    // to `'ezauth'` on a non-ezauth first-party app would silently mislabel
    // every outbound request with the wrong tenant (cross-tenant leak).
    if (!local && sdkConfig.appName === undefined) {
      throw new AuthError(MISSING_FIRST_PARTY_APP_NAME_MESSAGE, 0, 'CONFIG_ERROR')
    }

    // First-party callers without an explicit `apiUrl` get the env-aware
    // default API base. Eliminates the need for `NEXT_PUBLIC_EZAUTH_API_URL`
    // when the consumer is the canonical EZStart auth provider.
    const apiBaseUrl = consumerBaseUrl ?? defaultApiBaseUrl
    const apiUrl = `${apiBaseUrl}/api/auth`
    const webUrl = defaultWebUrl
    const appName = sdkConfig.appName ?? 'ezauth'

    assertWebUrlNotLocalhostOffLocal(webUrl, local)

    return {
      clientConfig: {
        apiUrl,
        appName,
        redirectUri: detectRedirectUri(),
      },
      webUrl,
      keyFetch: null,
    }
  }

  if (key) {
    // Publishable key mode: create client with defaults, then async-update
    // from key config. Consumer-provided `apiUrl` wins; otherwise we use the
    // env-aware default so a consumer pointing at the canonical EZStart
    // cloud needs no env var to discover where `/keys/config` lives.
    const apiBaseUrl = consumerBaseUrl ?? defaultApiBaseUrl
    const apiUrl = `${apiBaseUrl}/api/auth`
    const webUrl = defaultWebUrl

    assertWebUrlNotLocalhostOffLocal(webUrl, local)

    // We create the client with placeholder appName; it will be updated after config fetch
    const clientConfig: AuthClientConfig = {
      apiUrl,
      appName: sdkConfig.appName ?? 'pending',
      apiKey: key,
      redirectUri: detectRedirectUri(),
    }

    // CRITICAL: return a descriptor, NOT a started promise. React may call
    // this function from `useMemo` multiple times (memos are not a semantic
    // guarantee of single execution). Starting the fetch here would hammer
    // `/api/keys/config` and trip the 30 req/min rate limit. The caller is
    // expected to invoke `fetchKeyConfig(publishableKey, apiBaseUrl)` from
    // an effect guarded against duplicate fires.
    return {
      clientConfig,
      webUrl,
      keyFetch: { publishableKey: key, apiBaseUrl },
    }
  }

  // Dev mode: no key, no first-party → permissive defaults. Off-localhost
  // we still resolve a sensible default API URL via the env-aware lookup
  // (no more fail-fast on bare `<AuthProvider>` mounts during static
  // prerender — the env-aware default covers the canonical deployment).
  const apiBaseUrl = consumerBaseUrl ?? (local ? DEFAULT_LOCAL_API : defaultApiBaseUrl)
  const apiUrl = `${apiBaseUrl}/api/auth`
  const webUrl = defaultWebUrl
  const appName = sdkConfig.appName ?? 'dev'

  assertWebUrlNotLocalhostOffLocal(webUrl, local)

  return {
    clientConfig: {
      apiUrl,
      appName,
      redirectUri: detectRedirectUri(),
    },
    webUrl,
    keyFetch: null,
  }
}
