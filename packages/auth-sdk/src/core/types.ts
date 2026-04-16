/**
 * Core auth types — zero dependencies, zero framework coupling.
 *
 * These types define the auth client interface and are usable in any
 * JavaScript environment (React, Vue, Svelte, Node, React Native).
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Storage backend abstraction for token persistence. */
export interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

/** Configuration for `createAuthClient`. */
export interface AuthClientConfig {
  /** Base URL of the auth API (e.g. `https://api.example.com/api/auth`). */
  apiUrl: string
  /** App name sent in auth requests (e.g. `'myapp'`). */
  appName: string
  /** Redirect URI for OAuth code flow callback. */
  redirectUri?: string
  /** Optional API key for server-to-server authentication (sent as `X-API-Key` header). */
  apiKey?: string
  /** Optional custom storage for tokens (default: localStorage). */
  storage?: AuthStorage
  /** Storage key prefix (default: `'ezauth'`). */
  storageKey?: string
}

// ---------------------------------------------------------------------------
// Auth mode
// ---------------------------------------------------------------------------

/** Authentication transport mode. */
export type AuthMode = 'localStorage' | 'httpOnly' | 'jwt'

// ---------------------------------------------------------------------------
// User & tokens
// ---------------------------------------------------------------------------

/** Public user shape returned by auth endpoints. */
export interface AuthUser {
  _id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified?: boolean
  apps?: string[]
  roles?: string[]
  permissions?: string[]
  features?: string[]
  organizationId?: string
  managedBy?: string
  createdAt: string
  updatedAt: string
  // RBAC extensions
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  // Promo
  promoCode?: string
  // Password state
  hasSetOwnPassword?: boolean
  // Presence
  lastActiveAt?: string | null
}

/** Token response from login / token exchange. */
export interface AuthToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
  refresh_token?: string
}

/** Refresh result. */
export interface RefreshResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

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
  locale?: string
  promoCode?: string
}

export interface TokenRequest {
  code: string
  app: string
  redirect_uri?: string
}

export interface QuickSignUpRequest {
  username: string
  email: string
  app: string
  locale?: string
  promoCode?: string
  emailOverride?: EmailOverrideRequest
}

export interface QuickSignUpResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface EmailOverrideRequest {
  subject?: string
  from?: string
  replyTo?: string
  bodyHtml?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Server-side types (JWT, auth code)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API Keys (Developer Portal)
// ---------------------------------------------------------------------------

/** An API key as returned by the list endpoint. */
export interface ApiKeyItem {
  id: string
  keyPrefix: string
  name: string
  appName: string
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
  quotaMonthly: number | null
  usageThisMonth: number
}

/** Usage stats for a single API key. */
export interface ApiKeyUsageResponse {
  currentMonth: {
    requestCount: number
    topEndpoints: { endpoint: string; count: number }[]
  }
  daily: { date: string; requestCount: number }[]
  quota: {
    limit: number | null
    used: number
    remaining: number | null
  }
}

/** Response from create / rotate key endpoints. */
export interface CreateApiKeyResponse {
  id: string
  key: string
  keyPrefix: string
  name: string
}

/** Body for the create-key mutation. */
export interface CreateApiKeyRequest {
  name: string
  appName: string
  expiresAt: string | null
}

/** Plan info for billing display. */
export interface PlanInfo {
  id: string
  name: string
  /** Monthly price in cents. */
  price: number
  /** Null means unlimited. */
  quotaMonthly: number | null
  /** Null means unlimited. */
  maxKeys: number | null
  features: string[]
}
