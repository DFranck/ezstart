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

import { AuthError } from './errors.js'
import type {
  AuthClientConfig,
  AuthSDKConfig,
  AuthToken,
  AuthUser,
  EmailOverrideRequest,
  PublishableKeyConfig,
  QuickSignUpRequest,
  QuickSignUpResult,
  RefreshResult,
} from './types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unwrap API envelope `{ data: T }` → `T`, or return flat response. */
function unwrapEnvelope<T>(body: Record<string, unknown>): T {
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as unknown as T
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
      headers: this.baseHeaders(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
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
 * Fetch app configuration from EZAuth API using a publishable key.
 * The key acts as authentication — no user auth needed.
 *
 * @example
 * ```ts
 * const config = await fetchKeyConfig('ezk_live_abc123', 'https://api.ezauth.com')
 * ```
 */
export async function fetchKeyConfig(
  publishableKey: string,
  apiBaseUrl: string
): Promise<PublishableKeyConfig> {
  const response = await fetch(
    `${apiBaseUrl}/api/keys/config?key=${encodeURIComponent(publishableKey)}`
  )
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

/** Default EZAuth API URL for production keys. */
const EZAUTH_PRODUCTION_API = 'https://api-ezauth-production.up.railway.app'
/** Default EZAuth Web URL for production. */
const EZAUTH_PRODUCTION_WEB = 'https://ezauth.ezstart.xyz'
/** Default EZAuth API URL for localhost development. */
const EZAUTH_LOCAL_API = 'http://localhost:6110'
/** Default EZAuth Web URL for localhost development. */
const EZAUTH_LOCAL_WEB = 'http://localhost:6111'

/**
 * Check if we are running on localhost.
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
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
 * Resolve the full SDK configuration into a CoreAuthClient config + web URL.
 *
 * Handles three modes:
 * 1. Publishable key → needs async fetch (returns configPromise)
 * 2. First-party → immediate config from env/defaults
 * 3. Dev mode (no key + localhost) → permissive defaults
 *
 * @returns Resolved config with apiUrl, appName, webUrl, and optional configPromise
 */
export function resolveSDKConfig(sdkConfig: AuthSDKConfig): {
  clientConfig: AuthClientConfig
  webUrl: string
  /** If a publishable key is provided, this promise resolves the full config. */
  configPromise: Promise<PublishableKeyConfig> | null
} {
  const key = sdkConfig.publishableKey
  const local = isLocalhost()

  // Determine base URLs
  const defaultApiUrl = local ? `${EZAUTH_LOCAL_API}/api/auth` : `${EZAUTH_PRODUCTION_API}/api/auth`
  const defaultWebUrl = local ? EZAUTH_LOCAL_WEB : EZAUTH_PRODUCTION_WEB

  if (sdkConfig.firstParty) {
    // First-party mode: direct access, no key needed
    const apiUrl = sdkConfig.apiUrl
      ? `${sdkConfig.apiUrl}/api/auth`
      : defaultApiUrl
    const webUrl = sdkConfig.webUrl ?? defaultWebUrl
    const appName = sdkConfig.appName ?? 'ezauth'

    return {
      clientConfig: {
        apiUrl,
        appName,
        redirectUri: detectRedirectUri(),
      },
      webUrl,
      configPromise: null,
    }
  }

  if (key) {
    // Publishable key mode: create client with defaults, then async-update from key config
    const apiBaseUrl = sdkConfig.apiUrl
      ? sdkConfig.apiUrl
      : local
        ? EZAUTH_LOCAL_API
        : EZAUTH_PRODUCTION_API
    const apiUrl = `${apiBaseUrl}/api/auth`
    const webUrl = sdkConfig.webUrl ?? defaultWebUrl

    // We create the client with placeholder appName; it will be updated after config fetch
    const clientConfig: AuthClientConfig = {
      apiUrl,
      appName: sdkConfig.appName ?? 'pending',
      apiKey: key,
      redirectUri: detectRedirectUri(),
    }

    const configPromise = fetchKeyConfig(key, apiBaseUrl)

    return {
      clientConfig,
      webUrl,
      configPromise,
    }
  }

  // Dev mode: no key, no first-party → permissive localhost defaults
  const apiUrl = sdkConfig.apiUrl
    ? `${sdkConfig.apiUrl}/api/auth`
    : defaultApiUrl
  const webUrl = sdkConfig.webUrl ?? defaultWebUrl
  const appName = sdkConfig.appName ?? 'dev'

  return {
    clientConfig: {
      apiUrl,
      appName,
      redirectUri: detectRedirectUri(),
    },
    webUrl,
    configPromise: null,
  }
}
