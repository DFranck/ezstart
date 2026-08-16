import type { Request, Response } from 'express'
import {
  attachDerivedScope,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getApplicationModel } from '../../models/application.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getTotpSecretModel } from '../../models/totp-secret.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { requireAdmin, enforceAdminTwoFactor } from './require-admin.js'
import { requireSecretKeyOrJwt } from '../../middleware/require-secret-key-or-jwt.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const analyticsOverviewRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(analyticsOverviewRegistry, router)

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const signupTrendPointSchema = z.object({
  date: z.string().describe('ISO date (YYYY-MM-DD) bucketing the count.'),
  count: z.number().int().nonnegative().describe('Number of new users created on that day.'),
})

const topAppByUsersSchema = z.object({
  appName: z.string().describe('Application slug (or wildcard "*" platform marker).'),
  userCount: z.number().int().nonnegative().describe('Number of users registered to this app.'),
})

const analyticsOverviewSchema = z.object({
  totalUsers: z
    .number()
    .int()
    .nonnegative()
    .describe('Total non-soft-deleted users in the system.'),
  newUsersThisMonth: z
    .number()
    .int()
    .nonnegative()
    .describe('Users created since the first day of the current calendar month.'),
  activeUsersLast30Days: z
    .number()
    .int()
    .nonnegative()
    .describe('Users with `lastActiveAt` within the last 30 days (MAU proxy).'),
  verifiedUsersPct: z
    .number()
    .min(0)
    .max(100)
    .describe('Percentage of users with `isVerified=true` (0-100, one decimal).'),
  twoFactorEnabledPct: z
    .number()
    .min(0)
    .max(100)
    .describe('Percentage of users with at least one TOTP secret (0-100, one decimal).'),
  totalApplications: z
    .number()
    .int()
    .nonnegative()
    .describe('Total active (non-archived) Applications.'),
  totalApiKeys: z.number().int().nonnegative().describe('Total active (non-revoked) API keys.'),
  signupTrend: z
    .array(signupTrendPointSchema)
    .describe('Daily signup counts for the last 30 days, ordered ascending by date.'),
  topAppsByUsers: z
    .array(topAppByUsersSchema)
    .describe('Top 5 apps by registered user count, descending.'),
})

const analyticsOverviewResponseSchema = z.object({
  success: z.literal(true),
  data: analyticsOverviewSchema,
})

export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>
export type AnalyticsSignupTrendPoint = z.infer<typeof signupTrendPointSchema>
export type AnalyticsTopApp = z.infer<typeof topAppByUsersSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TREND_DAYS = 30
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const TOP_APPS_LIMIT = 5

/** Round to 1 decimal place, returns 0 when total === 0 (avoid NaN). */
function pct(numerator: number, total: number): number {
  if (total === 0) return 0
  return Math.round((numerator / total) * 1000) / 10
}

/** Format a Date as YYYY-MM-DD (UTC). */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Build a 30-day series filling missing days with `count: 0` so the chart
 * always renders a continuous timeline regardless of activity gaps.
 */
function fillSignupTrend(
  buckets: { date: string; count: number }[],
  days: number
): AnalyticsSignupTrendPoint[] {
  const map = new Map(buckets.map(b => [b.date, b.count]))
  const series: AnalyticsSignupTrendPoint[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const key = toISODate(d)
    series.push({ date: key, count: map.get(key) ?? 0 })
  }
  return series
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const analyticsOverviewController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!
    // Audience scope is server-derived from the JWT (`attachDerivedScope`).
    // - 'all'    → superadmin: platform-wide stats, no filter.
    // - 'myApps' → app-admin: stats restricted to apps the caller owns.
    // - 'mine'   → regular user: shouldn't reach here (gated by requireAdmin),
    //              return a singleton view to be safe.
    const derivedScope = req.derivedScope ?? 'mine'

    const [AuthUser, Application, ApiKey, TotpSecret] = await Promise.all([
      getAuthUserModel(),
      getApplicationModel(),
      getApiKeyModel(),
      getTotpSecretModel(),
    ])

    // Resolve scope filter — set of app slugs the caller is allowed to see.
    // - undefined → no app filter (superadmin platform-wide view).
    // - []        → empty result set (app-admin without owned apps OR `mine`).
    // - [...]     → restrict counts/aggregations to these slugs.
    let scopedAppSlugs: string[] | undefined
    let ownerFilter: Record<string, unknown> | undefined
    if (derivedScope === 'myApps') {
      const ownedApps = await Application.find({ ownerId: currentUser._id }).select('slug').lean()
      scopedAppSlugs = ownedApps.map(a => a.slug)
      ownerFilter = { ownerId: currentUser._id }
    } else if (derivedScope === 'mine') {
      // Singleton view — keeps the response shape stable for non-superadmins
      // who somehow reach the endpoint (e.g., role demotion mid-session).
      scopedAppSlugs = currentUser.apps ?? []
      ownerFilter = { ownerId: currentUser._id }
    }

    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_MS)
    const trendStart = new Date()
    trendStart.setUTCHours(0, 0, 0, 0)
    trendStart.setUTCDate(trendStart.getUTCDate() - (TREND_DAYS - 1))

    // Exclude soft-deleted users from EVERY count (deletedAt = null/missing).
    const liveUserFilter: Record<string, unknown> = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }

    // Apply scope filter to user-level queries when relevant.
    const scopedUserFilter: Record<string, unknown> = scopedAppSlugs
      ? { ...liveUserFilter, apps: { $in: scopedAppSlugs } }
      : liveUserFilter

    // Short-circuit when scope yields zero apps (no owned apps for an
    // app-admin) — return a fully-zeroed snapshot instead of running queries.
    if (scopedAppSlugs && scopedAppSlugs.length === 0) {
      const empty: AnalyticsOverview = {
        totalUsers: 0,
        newUsersThisMonth: 0,
        activeUsersLast30Days: 0,
        verifiedUsersPct: 0,
        twoFactorEnabledPct: 0,
        totalApplications: 0,
        totalApiKeys: 0,
        signupTrend: fillSignupTrend([], TREND_DAYS),
        topAppsByUsers: [],
      }
      return sendSuccess(res, empty)
    }

    const applicationCountFilter: Record<string, unknown> = ownerFilter
      ? { ...ownerFilter, status: 'active' }
      : { status: 'active' }

    const apiKeyCountFilter: Record<string, unknown> = scopedAppSlugs
      ? { status: 'active', appName: { $in: scopedAppSlugs } }
      : { status: 'active' }

    const [
      totalUsers,
      newUsersThisMonth,
      activeUsersLast30Days,
      verifiedUsers,
      totalApplications,
      totalApiKeys,
      twoFactorEnabledUsers,
      signupTrendBuckets,
      topAppsAggregation,
    ] = await Promise.all([
      AuthUser.countDocuments(scopedUserFilter),
      AuthUser.countDocuments({ ...scopedUserFilter, createdAt: { $gte: startOfMonth } }),
      AuthUser.countDocuments({ ...scopedUserFilter, lastActiveAt: { $gte: activeSince } }),
      AuthUser.countDocuments({ ...scopedUserFilter, isVerified: true }),
      Application.countDocuments(applicationCountFilter),
      ApiKey.countDocuments(apiKeyCountFilter),
      // 2FA adoption — when scoped, restrict to users in the scope's app set.
      scopedAppSlugs
        ? AuthUser.aggregate<{ count: number }>([
            { $match: scopedUserFilter },
            {
              $lookup: {
                from: 'totpsecrets',
                let: { userIdStr: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$userId', '$$userIdStr'] },
                      isEnabled: true,
                    },
                  },
                  { $limit: 1 },
                ],
                as: 'totp',
              },
            },
            { $match: { 'totp.0': { $exists: true } } },
            { $count: 'count' },
          ]).then(rows => rows[0]?.count ?? 0)
        : TotpSecret.countDocuments({ isEnabled: true }),
      // Signup trend (last 30 days, daily buckets, UTC)
      AuthUser.aggregate<{ date: string; count: number }>([
        {
          $match: {
            ...scopedUserFilter,
            createdAt: { $gte: trendStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
            },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: '$_id', count: 1 } },
        { $sort: { date: 1 } },
      ]),
      // Top apps by registered user count — when scoped, intersect with the
      // owned slug set to only surface apps the caller can see.
      AuthUser.aggregate<{ appName: string; userCount: number }>([
        { $match: scopedUserFilter },
        { $unwind: { path: '$apps', preserveNullAndEmptyArrays: false } },
        ...(scopedAppSlugs ? [{ $match: { apps: { $in: scopedAppSlugs } } }] : []),
        { $group: { _id: '$apps', userCount: { $sum: 1 } } },
        { $project: { _id: 0, appName: '$_id', userCount: 1 } },
        { $sort: { userCount: -1 } },
        { $limit: TOP_APPS_LIMIT },
      ]),
    ])

    const overview: AnalyticsOverview = {
      totalUsers,
      newUsersThisMonth,
      activeUsersLast30Days,
      verifiedUsersPct: pct(verifiedUsers, totalUsers),
      twoFactorEnabledPct: pct(twoFactorEnabledUsers, totalUsers),
      totalApplications,
      totalApiKeys,
      signupTrend: fillSignupTrend(signupTrendBuckets, TREND_DAYS),
      topAppsByUsers: topAppsAggregation,
    }

    sendSuccess(res, overview)
  } catch (error: unknown) {
    logger.error('Error computing admin analytics overview:', error)
    sendError(res, 'Failed to compute platform analytics', 500)
  }
}

docRouter.get(
  '/analytics/overview',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  requireSecretKeyOrJwt,
  enforceAdminTwoFactor,
  attachDerivedScope,
  analyticsOverviewController,
  {
    summary: 'Analytics overview (auto-scoped: superadmin = platform, admin = owned apps)',
    tags: ['Admin'],
    responseSchema: analyticsOverviewResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: {
        description:
          'Forbidden — admin role required, or publishable key rejected (secret S2S key or superadmin JWT required)',
        schema: adminErrorSchema,
      },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
