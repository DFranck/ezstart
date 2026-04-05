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

  // RBAC - Role-Based Access Control
  globalRoles?: string[] // Cross-app roles (only 'superadmin' allowed)
  appRoles?: Record<string, string[]> // App-specific roles: { 'green-pulse': ['admin'], 'ezbill': ['beta-tester'] }
  permissions?: string[] // ['theme:edit', 'users:manage', 'analytics:view']
  features?: string[] // ['beta-features', 'early-access', 'advanced-analytics']

  // Metadata
  organizationId?: string // For client managers
  managedBy?: string // User ID of manager (for clients)

  // Presence
  lastActiveAt?: string | null // ISO date string of last activity

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
  accessCode?: string // Beta access code from waitlist invitation
}

export interface TokenRequest {
  code: string
  app: string
  redirect_uri?: string
}

export interface AuthCode {
  code: string
  userId: string
  app: string
  redirect_uri?: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

export interface AuthCodeResponse {
  code: string
  expires_at: string
}

export interface JWTPayload {
  userId: string
  email: string
  username: string
  apps: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  permissions?: string[]
  features?: string[]
  iat?: number
  exp?: number
}
