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
  /** App name slug associated with this key (e.g. `'green-pulse'`). */
  appName: string
  /**
   * Human-readable Application name (e.g. `'GreenPulse.AI'`). Optional —
   * absent for platform-wide keys (no bound Application) or for older API
   * deployments that predate this field. Consumers MUST fall back to a
   * prettified `appName` when missing.
   */
  appDisplayName?: string
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
  utmSource?: string
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
  utmSource?: string
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
 * White-label theme tokens persisted on an Application.
 *
 * All fields are optional — an Application can override as few or as many
 * design tokens as it wants. Unset tokens inherit the default EZAuth theme
 * (or the CSS preset keyed on `data-app="<slug>"`).
 *
 * Values are CSS color strings (hex, `oklch()`, `hsl()`, or `rgb()`). `logo`
 * is a full `https:` URL to the tenant's logo asset (not rendered yet by
 * the first iteration of the auth pages — reserved for THEME-LOGO-UPLOAD).
 */
export interface ApplicationTheme {
  primary?: string
  background?: string
  foreground?: string
  accent?: string
  logo?: string
}

/**
 * Application tenant — source of truth lives in EZAuth DB; other services
 * (EZPay, etc.) reference it by `id`.
 *
 * `theme` + `themeEnabled` back the EZAuth Pro white-label feature.
 * `themeEnabled` is shown as a toggle in the dashboard and gated on plan
 * activation — when `false`, SSR falls back to the default preset.
 */
export interface Application {
  id: string
  slug: string
  name: string
  description?: string
  ownerId: string
  metadata?: Record<string, unknown>
  status: 'active' | 'archived'
  theme?: ApplicationTheme | null
  themeEnabled?: boolean
  /**
   * Platform-owned flag (dogfood). `true` for the apps owned by the
   * platform operator — grants free access to paid features via the
   * server-side `hasFeature()` helper (see `@ezstart/auth-sdk/server`).
   *
   * Not exposed to the self-service dashboard — flipped via a superadmin
   * seed script or a future superadmin-only API route.
   */
  isPlatformOwned?: boolean
  /**
   * Composable email-verification gate (Clerk / Vercel pattern). When `true`,
   * the consumer signals that downstream features should require a verified
   * email. Login itself is never blocked.
   *
   * Use the matching `<RequireEmailVerified>` guard component or the
   * `requireEmailVerified` Express middleware to enforce the gate at the
   * point of use.
   *
   * @default false
   */
  requireEmailVerification?: boolean
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
  /**
   * Toggle the composable email-verification gate (Clerk / Vercel pattern).
   * When `true`, the consumer signals that downstream features should
   * require a verified email. Login itself is never blocked.
   */
  requireEmailVerification?: boolean
}

/**
 * Body for `PATCH /applications/:id/theme`.
 *
 * Either field may be sent on its own — callers can toggle `themeEnabled`
 * without touching the tokens, or update the tokens while leaving the
 * enable flag alone. Passing `theme: null` clears the saved tokens.
 */
export interface UpdateApplicationThemeRequest {
  theme?: ApplicationTheme | null
  themeEnabled?: boolean
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

// ---------------------------------------------------------------------------
// Audit log (user activity)
// ---------------------------------------------------------------------------

/**
 * Loggable user actions tracked by the audit log. New action types must be
 * appended here AND mirrored in the backend `AUDIT_LOG_ACTIONS` enum.
 */
export type AuditLogAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'email_change'
  | 'email_change_requested'
  | 'email_change_completed'
  | 'magic_link_requested'
  | 'magic_link_login'
  | 'oauth_link'
  | 'oauth_unlink'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_login_success'
  | '2fa_login_failed'
  | 'backup_code_used'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'profile_updated'
  | 'account_locked_brute_force'
  | 'two_factor_locked_brute_force'

/** Free-form metadata recorded alongside an audit log entry. */
export interface AuditLogMetadata {
  ip?: string | null
  userAgent?: string | null
  location?: string | null
  [key: string]: unknown
}

/** A single audit log entry as returned by `GET /me/audit-log`. */
export interface AuditLogEntry {
  id: string
  userId: string
  appName: string
  action: AuditLogAction
  metadata: AuditLogMetadata
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 TTL deadline. */
  expiresAt: string
}

/** Filters accepted by the audit log listing endpoint. */
export interface AuditLogFilters {
  /** Page size (1–100). Defaults to 20 server-side. */
  limit?: number
  /** Pagination offset. Defaults to 0 server-side. */
  offset?: number
  /** Optional action type filter. */
  action?: AuditLogAction
}

/** Paginated list shape returned by the audit log endpoint. */
export interface AuditLogListResponse {
  items: AuditLogEntry[]
  total: number
  limit: number
  offset: number
}

// ---------------------------------------------------------------------------
// Admin analytics (superadmin platform overview)
// ---------------------------------------------------------------------------

/** One bucket of the daily signup trend (last 30 days). */
export interface AdminAnalyticsSignupTrendPoint {
  /** ISO date `YYYY-MM-DD` (UTC). */
  date: string
  /** Number of new users created on this day. */
  count: number
}

/** Top app entry for the analytics overview. */
export interface AdminAnalyticsTopApp {
  /** Application slug or `'*'` wildcard for platform-scoped users. */
  appName: string
  /** Number of users registered to this app. */
  userCount: number
}

/**
 * Platform analytics overview returned by `GET /api/admin/analytics/overview`.
 * Superadmin only — see `getAdminAnalyticsOverview()` on the auth client.
 */
export interface AdminAnalyticsOverview {
  totalUsers: number
  newUsersThisMonth: number
  activeUsersLast30Days: number
  /** 0-100, one decimal place. */
  verifiedUsersPct: number
  /** 0-100, one decimal place. */
  twoFactorEnabledPct: number
  totalApplications: number
  totalApiKeys: number
  signupTrend: AdminAnalyticsSignupTrendPoint[]
  topAppsByUsers: AdminAnalyticsTopApp[]
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

// ---------------------------------------------------------------------------
// OAuth providers (linked accounts)
// ---------------------------------------------------------------------------

/** Identifier for any OAuth provider known to the platform. */
export type OAuthProviderId = 'google' | 'github' | 'facebook' | 'apple' | 'microsoft' | 'discord'

/**
 * One OAuth provider currently linked to the authenticated user.
 *
 * Returned by `GET /api/auth/me/oauth-providers`.
 */
export interface ConnectedOAuthProvider {
  /** Provider identifier (e.g. `'google'`). */
  provider: OAuthProviderId | string
  /** Email reported by the provider at link time. */
  email: string
  /** Display name surfaced by the provider, if available. */
  displayName?: string
  /** ISO timestamp of when the user linked the provider. */
  connectedAt: string
}

// ---------------------------------------------------------------------------
// Feature flags + maintenance mode (admin)
// ---------------------------------------------------------------------------

/** Audience scope of a feature flag — `'global'` (platform-wide) or `'app'`. */
export type FeatureFlagScope = 'global' | 'app'

/**
 * Runtime feature flag returned by `GET /api/admin/feature-flags`.
 */
export interface FeatureFlag {
  /** Mongo ObjectId of the flag document. */
  _id: string
  /** Stable identifier (lowercase, dot- or dash-separated). */
  key: string
  /** Whether the flag is currently active. */
  enabled: boolean
  /** Audience scope (`global` or `app`). */
  scope: FeatureFlagScope
  /** App slug when scope === 'app'. */
  appName?: string
  /** Optional human-readable description. */
  description?: string
  /** UserId of the last admin to flip the flag. */
  updatedBy?: string
  /** ISO creation timestamp. */
  createdAt: string
  /** ISO last-update timestamp. */
  updatedAt: string
}

/** Body accepted by `PATCH /api/admin/feature-flags/:key`. */
export interface UpdateFeatureFlagRequest {
  enabled: boolean
  scope?: FeatureFlagScope
  appName?: string
  description?: string
}

/**
 * Platform-wide maintenance-mode state returned by both the public
 * `/api/maintenance-status` endpoint and the admin `/api/admin/maintenance-mode`
 * endpoint.
 */
export interface MaintenanceMode {
  /** Whether maintenance mode is currently active. */
  enabled: boolean
  /** Banner message displayed to users (may be empty). */
  message: string
  /** ISO datetime when maintenance was enabled, or null if disabled. */
  startedAt: string | null
  /** Optional ISO datetime when maintenance is expected to end. */
  scheduledEnd: string | null
  /** UserId of the last admin to flip the toggle (admin endpoint only). */
  updatedBy?: string
  /** ISO last-update timestamp (admin endpoint only). */
  updatedAt?: string
}

/** Body accepted by `PUT /api/admin/maintenance-mode`. */
export interface UpdateMaintenanceModeRequest {
  enabled: boolean
  message?: string
  /** ISO datetime or `null` to clear the scheduled end. */
  scheduledEnd?: string | null
}
