import type { AuthToken, AuthUser } from './types.js'

export interface AuthClientConfig {
  baseURL: string
  appName: string
  redirectUri: string
}

export class AuthClient {
  private config: AuthClientConfig

  constructor(config: AuthClientConfig) {
    this.config = config
  }

  // Redirect to EZAuth login page
  redirectToLogin(additionalParams?: Record<string, string>) {
    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      ...additionalParams,
    })

    const authUrl = `http://localhost:8080/login?${params.toString()}`
    window.location.href = authUrl
  }

  // Redirect to EZAuth register page
  redirectToRegister(additionalParams?: Record<string, string>) {
    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      ...additionalParams,
    })

    const authUrl = `http://localhost:8004/register?${params.toString()}`
    window.location.href = authUrl
  }

  // Exchange authorization code for access token
  async exchangeCode(code: string): Promise<AuthToken> {
    const response = await fetch(`${this.config.baseURL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  // Get current user info
  async getCurrentUser(accessToken: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseURL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get user info')
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
}
