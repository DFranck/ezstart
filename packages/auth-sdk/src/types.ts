// Local copy of essential EZAuth types for better deployment compatibility
// This avoids workspace dependency issues on Vercel/other deployment platforms

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

export interface LoginRequest {
  email: string
  password: string
  app: string
  redirect_uri?: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
  app: string
  redirect_uri?: string
}

export interface TokenRequest {
  code: string
  app: string
  redirect_uri?: string
}