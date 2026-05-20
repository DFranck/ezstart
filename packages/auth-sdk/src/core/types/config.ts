/**
 * Auth client + SDK configuration types — zero dependencies, zero framework
 * coupling. Usable in any JavaScript environment (React, Vue, Svelte, Node,
 * React Native).
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
// Environment
// ---------------------------------------------------------------------------

/**
 * EZStart deployment environments recognized by the SDK's env-aware default
 * URL resolution (`detectAuthEnvironment` / `EZAUTH_URLS_BY_ENV`).
 *
 * - `'production'` — canonical *.ezstart.xyz domains
 * - `'staging'`    — Vercel preview of the staging branch + Railway staging APIs
 * - `'local'`      — localhost dev (port 6110/6111)
 *
 * External customers self-hosting against a different cloud / domain still
 * override via the `apiUrl` / `webUrl` props or the `NEXT_PUBLIC_EZAUTH_*_URL`
 * env vars — those win over the env-aware defaults.
 */
export type AuthEnvironment = 'production' | 'staging' | 'local'
