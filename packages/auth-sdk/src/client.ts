import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import type { AuthToken, AuthUser } from './types.js'
import type { AuthMode } from './store.js'

export interface AuthClientConfig {
  baseURL?: string
  appName: string
  redirectUri: string
}

// Helper to get the correct URLs based on environment
function getEZAuthUrls() {
  // Detect environment (local, development, production)
  const env = getCurrentEnvironment()

  return {
    apiBaseURL: `${getApiUrl('ezauth', env)}/api/auth`,
    webBaseURL: getWebUrl('ezauth', env),
  }
}

/**
 * Auto-detect the appropriate auth mode based on environment and domain
 *
 * Logic:
 * - localhost → localStorage (httpOnly doesn't work in dev)
 * - same root domain → httpOnly (secure, XSS-protected)
 * - cross-domain → jwt (Authorization header for different domains)
 *
 * @example
 * ```ts
 * // localhost:3000 → 'localStorage'
 * // ezstart.xyz → ezauth-api.ezstart.xyz → 'httpOnly' (same domain)
 * // ai-greenpulse.com → ezauth-api.ezstart.xyz → 'jwt' (cross-domain)
 * ```
 */
export function detectAuthMode(): AuthMode {
  // SSR: default to httpOnly (will be corrected on client)
  if (typeof window === 'undefined') return 'httpOnly'

  const currentHost = window.location.hostname
  const env = getCurrentEnvironment()

  // 1. Development (localhost) → localStorage
  if (env === 'local' || currentHost === 'localhost' || currentHost.startsWith('127.0.0.1')) {
    return 'localStorage'
  }

  // 2. Production → check if same domain
  const apiUrl = getApiUrl('ezauth', env)
  const apiHost = new URL(apiUrl).hostname

  // Extract root domain (ezstart.xyz from www.ezstart.xyz)
  const getRootDomain = (hostname: string) => {
    const parts = hostname.split('.')
    if (parts.length <= 2) return hostname // Already root domain
    return parts.slice(-2).join('.') // Last 2 parts (domain.tld)
  }

  const currentRootDomain = getRootDomain(currentHost)
  const apiRootDomain = getRootDomain(apiHost)

  // 3. Same root domain → httpOnly (secure cookies)
  if (currentRootDomain === apiRootDomain) {
    return 'httpOnly'
  }

  // 4. Cross-domain → JWT in Authorization header
  return 'jwt'
}

export class AuthClient {
  private config: AuthClientConfig
  private urls: ReturnType<typeof getEZAuthUrls>

  constructor(config: AuthClientConfig) {
    this.urls = getEZAuthUrls()
    this.config = {
      ...config,
      baseURL: config.baseURL || this.urls.apiBaseURL,
    }
  }

  // Redirect to EZAuth login page
  redirectToLogin(additionalParams?: Record<string, string>) {
    // Save current URL for post-login redirect
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search + window.location.hash
      localStorage.setItem('ezauth_redirect_after_login', currentUrl)
    }

    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      ...additionalParams,
    })

    const authUrl = `${this.urls.webBaseURL}/login?${params.toString()}`
    window.location.href = authUrl
  }

  // Redirect to EZAuth register page
  redirectToRegister(additionalParams?: Record<string, string>) {
    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      ...additionalParams,
    })

    const authUrl = `${this.urls.webBaseURL}/register?${params.toString()}`
    window.location.href = authUrl
  }

  // Exchange authorization code for access token
  async exchangeCode(code: string): Promise<AuthToken & { refresh_token?: string }> {
    const response = await fetch(`${this.config.baseURL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ✅ Support httpOnly cookies
      body: JSON.stringify({
        code,
        app: this.config.appName,
        redirect_uri: this.config.redirectUri,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Token exchange failed')
    }

    // Support both wrapped { success, data } and flat response formats
    const data = result.data ?? result
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      user: data.user,
      refresh_token: data.refresh_token,
    }
  }

  // ✅ NEW: Login with httpOnly cookie (direct, no redirect)
  async loginWithCookie(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseURL}/login-cookie`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ✅ Required for httpOnly cookies
      body: JSON.stringify({
        email,
        password,
        app: this.config.appName,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result.error || (result.data as Record<string, unknown>)?.error || 'Login failed'
      )
    }

    const loginData = result.data ?? result
    return loginData.user
  }

  // Get current user info (dual-mode: httpOnly cookie OR accessToken)
  async getCurrentUser(accessToken?: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseURL}/me`, {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
      credentials: 'include', // ✅ Support httpOnly cookies
    })

    const result = await response.json()

    if (!response.ok) {
      const error = Object.assign(new Error(result.error || 'Failed to get user info'), {
        status: response.status,
      })
      throw error
    }

    const meData = result.data ?? result
    return meData.user
  }

  // Verify token validity
  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ✅ Support httpOnly cookies
        body: JSON.stringify({
          token: accessToken,
          app: this.config.appName,
        }),
      })

      const result = await response.json()
      const verifyData = result.data ?? result
      return verifyData.success !== false && verifyData.valid
    } catch (error) {
      return false
    }
  }

  // ✅ NEW: Logout and clear httpOnly cookie
  async logout(refreshToken?: string): Promise<void> {
    try {
      await fetch(`${this.config.baseURL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ✅ Required to clear httpOnly cookie
        body: JSON.stringify({ refreshToken }),
      })
    } catch (error) {
      // Logout can fail silently - we still clear local state
      logger.error(
        'Logout API call failed:',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  /**
   * Update the current user's profile (firstName, lastName, avatar).
   * Requires authentication (token or httpOnly cookie).
   */
  async updateProfile(
    data: { firstName?: string; lastName?: string; avatar?: string },
    accessToken?: string
  ): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseURL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.data?.error || 'Failed to update profile')
    }

    const profileData = result.data ?? result
    return profileData.user
  }

  /**
   * Change (or create) the current user's password.
   * If the user has no password (OAuth-only), currentPassword can be omitted.
   */
  async changePassword(
    data: { currentPassword?: string; newPassword: string },
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(`${this.config.baseURL}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.data?.error || 'Failed to change password')
    }
  }

  /**
   * Quick sign up with just username and email (no password).
   * The API will auto-generate a password and send a verification email.
   * @stub This method requires a corresponding API endpoint to be implemented.
   */
  async quickSignUp(data: {
    username: string
    email: string
    app: string
    promoCode?: string
    emailSubject?: string
    emailBody?: string
  }): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const response = await fetch(`${this.config.baseURL}/quick-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.data?.error || 'Quick signup failed')
    }

    const payload = result.data ?? result
    return {
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }
  }

  /**
   * Refresh tokens using a refresh token.
   * Returns new access token, refresh token, and user info.
   */
  async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; user: AuthUser }> {
    const response = await fetch(`${this.config.baseURL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    })

    const result = await response.json()

    if (!response.ok) {
      const error = Object.assign(
        new Error(result.error || result.data?.error || 'Token refresh failed'),
        { status: response.status }
      )
      throw error
    }

    const data = result.data ?? result
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: data.user,
    }
  }

  /**
   * Create a cross-domain SSO handoff URL.
   *
   * If `targetUrl` is on the same origin as the current page, returns it unchanged (fast path).
   * Otherwise requests a short-lived one-time code from ezauth, and returns the
   * ezauth SSO callback URL that will exchange the code for httpOnly cookies on
   * `.ezstart.xyz` before redirecting the user to the final destination.
   *
   * @param targetUrl Absolute URL the user should land on (e.g. ezauth settings).
   * @param app       App name requesting the handoff (usually the current consumer app).
   */
  async createSsoHandoff({ targetUrl, app }: { targetUrl: string; app: string }): Promise<string> {
    // Same-domain fast path: no handoff needed
    if (typeof window !== 'undefined') {
      const sameOriginTarget = new URL(targetUrl)
      if (sameOriginTarget.origin === window.location.origin) {
        return targetUrl
      }
    }

    // Request a short-lived handoff code from ezauth
    const response = await callApi<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
      appName: 'ezauth',
      method: 'POST',
      body: { app, redirectUri: targetUrl },
    })

    if (!response.ok || !response.data) {
      throw new Error(response.error || 'Failed to initiate SSO handoff')
    }

    // Build the ezauth callback URL — preserve the target's locale so the
    // callback page is rendered in the same language.
    const target = new URL(targetUrl)
    const locale = target.pathname.split('/')[1] || 'en'
    const callbackPath = `/${locale}/auth/sso-callback`
    const next = target.pathname + target.search

    const callbackUrl = new URL(callbackPath, target.origin)
    callbackUrl.searchParams.set('code', response.data.code)
    callbackUrl.searchParams.set('next', next)
    return callbackUrl.toString()
  }
}

// Helper function to create AuthClient with auto-configured URLs
export function createAuthClient(config: Omit<AuthClientConfig, 'baseURL'> & { baseURL?: string }) {
  return new AuthClient(config)
}
