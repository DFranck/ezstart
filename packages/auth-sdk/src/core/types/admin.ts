/**
 * Admin types — superadmin analytics overview, billing plan info, feature
 * flags, and maintenance mode. Zero dependencies, zero framework coupling.
 */

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
