import axios, { AxiosInstance } from 'axios'

export interface AuthUser {
  _id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified: boolean
  apps: string[]
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

export interface AuthClientConfig {
  baseURL?: string
  appName: string
  redirectUri?: string
}

export class AuthClient {
  private api: AxiosInstance
  private config: AuthClientConfig

  constructor(config: AuthClientConfig) {
    this.config = config
    this.api = axios.create({
      baseURL: config.baseURL || 'http://localhost:9999/api/auth',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Get login URL (redirect to centralized auth)
  getLoginUrl(options: { redirectUri?: string } = {}): string {
    const authBaseUrl = this.config.baseURL?.replace('/api/auth', '') || 'http://localhost:9999'
    const redirectUri = options.redirectUri || this.config.redirectUri || `${window.location.origin}/auth/callback`
    
    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: redirectUri,
      response_type: 'code'
    })

    return `${authBaseUrl}/login?${params.toString()}`
  }

  // Exchange authorization code for token
  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<AuthToken> {
    const response = await this.api.post('/token', {
      code,
      app: this.config.appName,
      redirect_uri: redirectUri || this.config.redirectUri
    })

    if (!response.data.success) {
      throw new Error(response.data.error || 'Token exchange failed')
    }

    const token = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      user: response.data.user
    }

    // Store token in localStorage
    this.setToken(token.access_token)
    
    return token
  }

  // Verify token
  async verifyToken(token?: string): Promise<{ valid: boolean; payload?: any }> {
    const authToken = token || this.getToken()
    if (!authToken) {
      return { valid: false }
    }

    try {
      const response = await this.api.post('/verify', {
        token: authToken,
        app: this.config.appName
      })

      return {
        valid: response.data.valid,
        payload: response.data.payload
      }
    } catch (error) {
      return { valid: false }
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await this.api.get('/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data.success ? response.data.user : null
    } catch (error) {
      return null
    }
  }

  // Token management
  setToken(token: string): void {
    localStorage.setItem(`ezauth_token_${this.config.appName}`, token)
  }

  getToken(): string | null {
    return localStorage.getItem(`ezauth_token_${this.config.appName}`)
  }

  removeToken(): void {
    localStorage.removeItem(`ezauth_token_${this.config.appName}`)
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false

    // Basic JWT expiration check (decode without verification)
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        this.removeToken()
        return false
      }
      
      const payload = JSON.parse(atob(parts[1]!))
      const isExpired = Date.now() >= payload.exp * 1000
      
      if (isExpired) {
        this.removeToken()
        return false
      }
      
      return true
    } catch {
      this.removeToken()
      return false
    }
  }

  // Login redirect
  login(options: { redirectUri?: string } = {}): void {
    const loginUrl = this.getLoginUrl(options)
    window.location.href = loginUrl
  }

  // Logout
  logout(): void {
    this.removeToken()
    // Optionally redirect to login
  }
}