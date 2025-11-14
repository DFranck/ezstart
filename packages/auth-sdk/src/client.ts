import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'
import type { AuthToken, AuthUser } from './types.js'

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
  async exchangeCode(code: string): Promise<AuthToken> {
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

    return {
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in: result.expires_in,
      user: result.user,
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
      throw new Error(result.error || 'Login failed')
    }

    return result.user
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
      const error: any = new Error(result.error || 'Failed to get user info')
      error.status = response.status
      throw error
    }

    return result.user
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
      return result.success && result.valid
    } catch (error) {
      return false
    }
  }

  // ✅ NEW: Logout and clear httpOnly cookie
  async logout(): Promise<void> {
    try {
      await fetch(`${this.config.baseURL}/logout`, {
        method: 'POST',
        credentials: 'include', // ✅ Required to clear httpOnly cookie
      })
    } catch (error) {
      // Logout can fail silently - we still clear local state
      console.error('Logout API call failed:', error)
    }
  }
}

// Helper function to create AuthClient with auto-configured URLs
export function createAuthClient(config: Omit<AuthClientConfig, 'baseURL'> & { baseURL?: string }) {
  return new AuthClient(config)
}
