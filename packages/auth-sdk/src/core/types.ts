/**
 * Core auth types — zero dependencies, zero framework coupling.
 *
 * These types define the auth client interface and are usable in any
 * JavaScript environment (React, Vue, Svelte, Node, React Native).
 */

// ---------------------------------------------------------------------------
// Key scope
// ---------------------------------------------------------------------------

/**
 * Legacy auth scope — mixes env and ownership. Kept for backwards compat.
 * New code should derive scope from the key's appName + scope metadata.
 * @deprecated Use `ApiKeyScope` for permission and `key.appName` for ownership.
 */
export type AuthScope = 'test' | 'live' | 'admin' | 'first-party'

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
// Publishable key / Clerk-like config
// ---------------------------------------------------------------------------

/**
 * Configuration resolved from a publishable key via `GET /api/keys/config`.
 * Returned by the EZAuth API when a valid publishable key is provided.
 */
export interface PublishableKeyConfig {
  /** App name associated with this key. */
  appName: string
  /** Base URL of the auth API. */
  apiUrl: string
  /** Base URL of the auth web app (for login/register redirects). */
  webUrl: string
  /** Features enabled for this key's plan. */
  features: string[]
  /** Plan name (e.g. 'free', 'pro', 'business'). */
  plan: string
  /** Monthly quota (-1 means unlimited). */
  quotaMonthly: number
  /** Legacy key scope (read from DB). For new keys use type+env+scope metadata. */
  scope?: 'test' | 'live' | 'admin'
}

/**
 * High-level SDK configuration — Clerk-like API.
 *
 * Usage modes:
 * 1. `publishableKey` provided → fetches config from EZAuth API
 * 2. `mode: 'first-party'` → direct access (for ezauth web itself)
 * 3. Neither + localhost → dev mode (permissive)
 *
 * For advanced / manual configuration, use `AuthClientConfig` with `createCoreAuthClient`.
 */
export interface AuthSDKConfig {
  /**
   * Publishable key (e.g., `ez_pk_live_abc123...` or legacy `ezk_live_abc...`).
   * Read from `NEXT_PUBLIC_EZAUTH_KEY` env var if not provided.
   * Legacy `ezk_*` keys deprecated — rotate to `ez_pk_` prefix by 2026-07-21.
   */
  publishableKey?: string
  /**
   * Override the auth API URL (for self-hosted EZAuth).
   * When using a publishable key, this is auto-resolved from key config.
   */
  apiUrl?: string
  /**
   * Override the auth web URL (for login/register redirects).
   * When using a publishable key, this is auto-resolved from key config.
   */
  webUrl?: string
  /**
   * First-party mode — for ezauth web itself (no key needed, direct API access).
   */
  firstParty?: boolean
  /**
   * App name — required for first-party mode, auto-resolved from key otherwise.
   */
  appName?: string
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
  /** Application this key is scoped to (P6+). Optional for pre-P6 keys. */
  applicationId?: string
  /** Legacy scope value from DB. New keys use scope='admin'|'user'|'readonly' metadata. */
  scope: 'test' | 'live' | 'admin'
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
  /** Application this key was scoped to (P6+). */
  applicationId?: string
  /** Key type (optional, present on new keys created after P2a). */
  type?: 'publishable' | 'secret'
  /** Key environment (optional, present on new keys created after P2a). */
  env?: 'live' | 'test'
  /** Permission scope (optional, present on new keys created after P2a). */
  scope?: 'admin' | 'user' | 'readonly'
}

/** Body for the create-key mutation. */
export interface CreateApiKeyRequest {
  name: string
  /**
   * App scope (legacy — pre-P6). New callers should pass `applicationId`
   * instead; `appName` is kept for backwards compatibility and will be
   * removed in a future major.
   * @deprecated Use `applicationId`.
   */
  appName?: string
  /** Application this key will belong to (P6+). Preferred over `appName`. */
  applicationId?: string
  /** Key type: publishable (client-side safe) or secret (server-only). */
  type?: 'publishable' | 'secret'
  /** Environment: live (production) or test (sandbox). */
  env?: 'live' | 'test'
  /** Permission scope for the new key. */
  scope?: 'admin' | 'user' | 'readonly'
  expiresAt: string | null
}

// ---------------------------------------------------------------------------
// Applications (P6 — multi-tenant entity shared across services)
// ---------------------------------------------------------------------------

/**
 * Application tenant — source of truth lives in EZAuth DB; other services
 * (EZPay, etc.) reference it by `id`.
 */
export interface Application {
  id: string
  slug: string
  name: string
  description?: string
  ownerId: string
  metadata?: Record<string, unknown>
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

/** Body for `POST /applications`. */
export interface CreateApplicationRequest {
  slug: string
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

/** Body for `PATCH /applications/:id`. */
export interface UpdateApplicationRequest {
  name?: string
  description?: string
  metadata?: Record<string, unknown>
}

/** Response from `GET /applications/resolve?key=ez_pk_live_*`. */
export interface ApplicationResolveResponse {
  applicationId: string
  slug: string
  name: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
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
