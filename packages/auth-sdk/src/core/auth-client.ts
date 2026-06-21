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
 *
 * The HTTP method implementations are grouped by domain under
 * `./auth-client/methods/*.ts` (auth flows, profile, oauth, admin) and the
 * publishable-key / SDK config resolution lives in
 * `./auth-client/config-resolver.ts`. They are composed here behind the exact
 * same public surface (`CoreAuthClient` class shape + the re-exported
 * functions), so every existing import path keeps working unchanged.
 */

import type { ClientContext, CookieWriteInit } from './auth-client/context.js'
import { cookieWrite } from './auth-client/cookie-write.js'
import { createCsrfHelper, type CsrfHelper } from './auth-client/csrf.js'
import {
  exchangeCode,
  getCurrentUser,
  loginWithCookie,
  logout,
  refreshTokens,
  verifyToken,
} from './auth-client/methods/auth-flows.js'
import {
  changePassword,
  deleteAccount,
  quickSignUp,
  updateProfile,
} from './auth-client/methods/profile.js'
import { disconnectOAuthProvider, getOAuthProviders } from './auth-client/methods/oauth.js'
import { getAdminAnalyticsOverview, listAuditLog } from './auth-client/methods/admin.js'
import type {
  AdminAnalyticsOverview,
  AuditLogFilters,
  AuditLogListResponse,
  AuthClientConfig,
  AuthToken,
  AuthUser,
  ConnectedOAuthProvider,
  QuickSignUpRequest,
  QuickSignUpResult,
  RefreshResult,
} from './types.js'

// Publishable-key config fetching + SDK config resolution. Re-exported below
// so the public import path (`@ezstart/auth-sdk/core` → `fetchKeyConfig`,
// `resolveSDKConfig`, `PendingKeyFetch`) is preserved.
export {
  fetchKeyConfig,
  resolveSDKConfig,
  type PendingKeyFetch,
} from './auth-client/config-resolver.js'

// ---------------------------------------------------------------------------
// Auth Client class
// ---------------------------------------------------------------------------

export class CoreAuthClient {
  private apiUrl: string
  private appName: string
  private redirectUri: string | undefined
  private apiKey: string | undefined

  /**
   * Shared context passed to the domain-grouped method modules. Reads the
   * live class fields so `setApiUrl` / `setAppName` / `setRedirectUri`
   * mutations are observed by every method call.
   */
  private readonly ctx: ClientContext

  /**
   * CSRF token helper — fetches `GET /login-cookie/csrf` on demand, caches
   * the cookie value, dedupes concurrent prime calls, and invalidates on
   * 403 mismatch. cf. `auth-client/csrf.ts` for the full contract.
   */
  private readonly csrf: CsrfHelper

  constructor(config: AuthClientConfig) {
    this.apiUrl = config.apiUrl
    this.appName = config.appName
    this.redirectUri = config.redirectUri
    this.apiKey = config.apiKey

    // The context exposes the live class fields (read through getters so that
    // `setApiUrl` / `setAppName` / `setRedirectUri` mutations are observed by
    // in-flight method calls) plus a `baseHeaders` delegate. Object-literal
    // getters have their own `this`, so we read the instance fields through
    // arrow functions that close over the constructor's `this`.
    const baseHeaders = (extra?: Record<string, string>): Record<string, string> =>
      this.baseHeaders(extra)

    // The CSRF helper needs apiUrl + baseHeaders to call the priming
    // endpoint. We pass a minimal shim so the helper has no dependency on
    // the full ClientContext (cleaner test setup + tighter type surface).
    this.csrf = createCsrfHelper({
      get apiUrl(): string {
        return getApiUrl()
      },
      baseHeaders,
    })

    this.ctx = {
      get apiUrl(): string {
        return getApiUrl()
      },
      get appName(): string {
        return getAppName()
      },
      get redirectUri(): string | undefined {
        return getRedirectUri()
      },
      baseHeaders,
      primeCsrf: () => this.csrf.prime(),
      getCsrfToken: () => this.csrf.getToken(),
      invalidateCsrfToken: () => this.csrf.invalidate(),
      cookieWrite: (path, init) => this.cookieWrite(path, init),
    }
    const getApiUrl = (): string => this.apiUrl
    const getAppName = (): string => this.appName
    const getRedirectUri = (): string | undefined => this.redirectUri
  }

  /** Build base headers, injecting `X-API-Key` when configured. */
  private baseHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }
    return headers
  }

  /**
   * Centralized cookie-auth write. Delegates to the extracted helper in
   * `./auth-client/cookie-write.ts` (cf. that file for the full behaviour
   * contract). The instance method shape is preserved so the class surface
   * stays unchanged.
   */
  private cookieWrite(path: string, init: CookieWriteInit): Promise<Response> {
    return cookieWrite(this.cookieWriteDeps, path, init)
  }

  /**
   * Stable deps object reused across cookieWrite calls — built lazily on
   * first use so it observes the live `apiUrl` via the closure-captured
   * getter (`setApiUrl` mutations stay reflected mid-flight).
   */
  private get cookieWriteDeps(): {
    readonly apiUrl: string
    baseHeaders(extra?: Record<string, string>): Record<string, string>
    csrf: CsrfHelper
  } {
    if (!this._cookieWriteDeps) {
      const getApiUrl = (): string => this.apiUrl
      this._cookieWriteDeps = {
        get apiUrl(): string {
          return getApiUrl()
        },
        baseHeaders: extra => this.baseHeaders(extra),
        csrf: this.csrf,
      }
    }
    return this._cookieWriteDeps
  }
  private _cookieWriteDeps:
    | {
        readonly apiUrl: string
        baseHeaders(extra?: Record<string, string>): Record<string, string>
        csrf: CsrfHelper
      }
    | undefined

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

  /**
   * Prime the CSRF cookie. Called by the `<AuthProvider>` lifecycle hook on
   * mount + after refresh so the first cookie-auth write does not race the
   * priming round-trip.
   *
   * No-op when `document` is unavailable (SSR). Safe to call eagerly even
   * on Bearer-auth pages — the prime endpoint is idempotent and rate-limit-
   * friendly (one round-trip per Provider mount under normal conditions).
   */
  async primeCsrf(): Promise<void> {
    return this.csrf.prime()
  }

  // ── Auth flows ──────────────────────────────────────────────────────────

  /**
   * Exchange an authorization code for tokens.
   * Returns the token response including the user and optional refresh token.
   *
   * Pass `codeVerifier` to complete a PKCE flow (RFC 7636) — required when the
   * authorization request committed to a `code_challenge`.
   *
   * Pass `redirectUriOverride` when the login request used a redirect_uri
   * different from the SDK-detected `/auth/callback` default (e.g. same-origin
   * first-party flow that resolved straight to `/dashboard`). The backend
   * enforces RFC 6749 §4.1.3 strict equality between the redirect_uri sent at
   * login and at token exchange — mismatch yields "Invalid or expired
   * authorization code".
   */
  async exchangeCode(
    code: string,
    codeVerifier?: string,
    redirectUriOverride?: string
  ): Promise<AuthToken> {
    return exchangeCode(this.ctx, code, codeVerifier, redirectUriOverride)
  }

  /** Login with httpOnly cookie (direct, no redirect). */
  async loginWithCookie(email: string, password: string): Promise<AuthUser> {
    return loginWithCookie(this.ctx, email, password)
  }

  /** Get current user info (dual-mode: httpOnly cookie OR accessToken). */
  async getCurrentUser(accessToken?: string): Promise<AuthUser> {
    return getCurrentUser(this.ctx, accessToken)
  }

  /** Verify token validity. */
  async verifyToken(accessToken: string): Promise<boolean> {
    return verifyToken(this.ctx, accessToken)
  }

  /** Logout and clear httpOnly cookie. */
  async logout(refreshToken?: string): Promise<void> {
    return logout(this.ctx, refreshToken)
  }

  // ── Profile & account ─────────────────────────────────────────────────────

  /** Update the current user's profile. */
  async updateProfile(
    data: { firstName?: string; lastName?: string; avatar?: string },
    accessToken?: string
  ): Promise<AuthUser> {
    return updateProfile(this.ctx, data, accessToken)
  }

  /** Change (or create) the current user's password. */
  async changePassword(
    data: { currentPassword?: string; newPassword: string },
    accessToken?: string
  ): Promise<void> {
    return changePassword(this.ctx, data, accessToken)
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
    return deleteAccount(this.ctx, data, accessToken)
  }

  /** Quick sign up with just username and email (no password). */
  async quickSignUp(data: QuickSignUpRequest): Promise<QuickSignUpResult> {
    return quickSignUp(this.ctx, data)
  }

  // ── OAuth providers (linked accounts) ──────────────────────────────────────

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
    return getOAuthProviders(this.ctx, accessToken)
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
    return disconnectOAuthProvider(this.ctx, provider, accessToken)
  }

  // ── Audit log & admin ──────────────────────────────────────────────────────

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
    return listAuditLog(this.ctx, filters, accessToken)
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
    return getAdminAnalyticsOverview(this.ctx, accessToken)
  }

  /** Refresh tokens using a refresh token. */
  async refreshTokens(refreshToken: string): Promise<RefreshResult> {
    return refreshTokens(this.ctx, refreshToken)
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
