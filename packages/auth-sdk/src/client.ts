import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'
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
}

// Helper function to create AuthClient with auto-configured URLs
export function createAuthClient(config: Omit<AuthClientConfig, 'baseURL'> & { baseURL?: string }) {
  return new AuthClient(config)
}
