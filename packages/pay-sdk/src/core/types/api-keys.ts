// ---------------------------------------------------------------------------
// API Keys (P6) — developer portal resources
// ---------------------------------------------------------------------------

/**
 * A single EZPay API key item as returned by `GET /api/keys`.
 *
 * Scoped to an ezauth {@link https://ezstart.dev Application} via the
 * `applicationId` + `appSlug` fields. The raw key value is never exposed — only
 * the opaque `keyPrefix` is safe to display.
 */
export interface PayApiKeyItem {
  id: string
  keyPrefix: string
  name: string
  applicationId: string
  appSlug: string
  type: 'publishable' | 'secret'
  env: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly'
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
  quotaMonthly: number | null
  usageThisMonth: number
}

/**
 * Body accepted by `POST /api/keys` when creating a new EZPay API key.
 */
export interface CreatePayApiKeyRequest {
  name: string
  applicationId: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
  expiresAt?: string | null
}

/**
 * Response payload returned by `POST /api/keys`. The `key` field is the raw
 * one-time value and MUST be surfaced to the user exactly once.
 */
export interface CreatePayApiKeyResponse {
  id: string
  key: string
  keyPrefix: string
  name: string
  type: 'publishable' | 'secret'
  env: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly'
  applicationId: string
  appSlug: string
}

/**
 * Usage snapshot for a single EZPay API key. Returned by
 * `GET /api/keys/:id/usage`.
 *
 * `quota.limit` and `quota.remaining` are `null` when no `quotaMonthly` is
 * configured on the key (unlimited plan).
 */
export interface PayApiKeyUsageResponse {
  currentMonth: {
    requestCount: number
    topEndpoints: Array<{ endpoint: string; count: number }>
  }
  daily: Array<{ date: string; requestCount: number }>
  quota: {
    limit: number | null
    used: number
    remaining: number | null
  }
}
