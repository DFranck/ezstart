/**
 * GET /api/admin/analytics/overview — auto-scoped pay analytics summary.
 *
 * Powers the "Overview" tab of `<PayAdminDashboard>`. Server-derives the
 * audience scope from the JWT (`attachDerivedScope`):
 *
 *   - superadmin → platform-wide stats (no filter)
 *   - admin       → restricted to apps the caller owns (via ezauth ownership)
 *   - regular     → empty / personal totals (singleton view)
 *
 * Response shape mirrors the ezauth analytics overview (KPIs + 30-day trend
 * + top apps) with pay-specific metrics: revenue, payment count, active
 * subscriptions, MRR proxy.
 */

import type { Request, Response, Router as ExpressRouter } from 'express'
import {
  attachDerivedScope,
  createRoleMiddleware,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
} from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { getPaymentModel } from '../../models/Payment.js'
import { listApplicationsByOwner } from '../../services/ezauth-client.js'

export const payAnalyticsOverviewRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(payAnalyticsOverviewRegistry, router)
const { requireAdmin } = createRoleMiddleware()

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const revenueByCurrencySchema = z.object({
  currency: z.string().describe('ISO 4217 currency code (uppercase).'),
  total: z.number().describe('Sum of completed payment amounts in this currency.'),
})

const revenueTrendPointSchema = z.object({
  date: z.string().describe('ISO date (YYYY-MM-DD) bucketing the day.'),
  total: z.number().describe('Total revenue (primary currency) for that day.'),
  currency: z.string().describe('Currency code for the trend (primary currency).'),
})

const topAppByRevenueSchema = z.object({
  appName: z.string().describe('Application slug (Payment.projectId).'),
  total: z.number().describe('Total completed revenue from this app.'),
  currency: z.string().describe('Currency code for the revenue total.'),
})

const payAnalyticsOverviewSchema = z.object({
  totalPayments: z
    .number()
    .int()
    .nonnegative()
    .describe('Total payments in the scope (all statuses).'),
  completedPayments: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of payments with status="completed" in the scope.'),
  failedPayments: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of payments with status="failed" in the scope.'),
  refundedPayments: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of payments with status="refunded" in the scope.'),
  activeSubscriptions: z
    .number()
    .int()
    .nonnegative()
    .describe('Active recurring subscriptions in the scope (subscription type, completed).'),
  revenueByCurrency: z
    .array(revenueByCurrencySchema)
    .describe('Total completed revenue grouped by currency.'),
  mrrByCurrency: z
    .array(revenueByCurrencySchema)
    .describe('Monthly recurring revenue grouped by currency (active monthly subs).'),
  revenueTrend: z
    .array(revenueTrendPointSchema)
    .describe('Daily revenue series for the last 30 days, ordered ascending by date.'),
  topAppsByRevenue: z
    .array(topAppByRevenueSchema)
    .describe('Top 5 apps by completed revenue, descending.'),
})

const payAnalyticsOverviewResponseSchema = z.object({
  success: z.literal(true),
  data: payAnalyticsOverviewSchema,
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

export type PayAnalyticsOverview = z.infer<typeof payAnalyticsOverviewSchema>
export type PayRevenueByCurrency = z.infer<typeof revenueByCurrencySchema>
export type PayRevenueTrendPoint = z.infer<typeof revenueTrendPointSchema>
export type PayTopAppByRevenue = z.infer<typeof topAppByRevenueSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TREND_DAYS = 30
const TOP_APPS_LIMIT = 5

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fillRevenueTrend(
  buckets: { date: string; total: number }[],
  days: number,
  currency: string
): PayRevenueTrendPoint[] {
  const map = new Map(buckets.map(b => [b.date, b]))
  const series: PayRevenueTrendPoint[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const key = toISODate(d)
    const found = map.get(key)
    series.push({
      date: key,
      total: Number.isFinite(found?.total) ? (found?.total ?? 0) : 0,
      currency,
    })
  }
  return series
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const payAnalyticsOverviewController = async (req: Request, res: Response) => {
  try {
    const derivedScope = req.derivedScope ?? 'mine'

    // Resolve the set of project slugs the caller is allowed to see.
    //   undefined → no filter (superadmin platform-wide)
    //   []        → empty result set (admin without owned apps OR regular user)
    //   [...]     → restrict aggregations to these slugs
    //
    // **P0 multi-tenancy fix (2026-05-01)** — when the caller authenticated
    // via an API key bound to a specific slug (`req.apiKeyAppSlug` set and
    // not `'*'`), short-circuit BEFORE calling `listApplicationsByOwner`.
    // The helper forwards a Bearer token to ezauth's owner-scoped
    // `/api/applications` endpoint, but on the API-key path no Bearer
    // exists, so the helper falls back to `EZPAY_SERVER_EZAUTH_KEY`
    // (platform superadmin S2S key) which resolves to the slugs OWNED BY
    // the platform server, not by the actual key owner. Result: cross-
    // tenant aggregation leak. Locking `scopedSlugs` to the bound slug
    // closes the leak. JWT cookie path is unchanged.
    let scopedSlugs: string[] | undefined
    if (derivedScope === 'myApps') {
      const apiKeyAppSlug = req.apiKeyAppSlug
      if (apiKeyAppSlug && apiKeyAppSlug !== '*') {
        scopedSlugs = [apiKeyAppSlug]
      } else {
        const bearerToken = extractBearerToken(req)
        const ownedApps = await listApplicationsByOwner({ bearerToken })
        scopedSlugs = ownedApps.map(a => a.slug)
      }
    } else if (derivedScope === 'mine') {
      // Singleton view — keeps the response shape stable for non-admin users
      // who somehow reach the endpoint (e.g., role demotion mid-session).
      scopedSlugs = []
    }

    // Short-circuit empty scopes — return a fully-zeroed snapshot.
    if (scopedSlugs && scopedSlugs.length === 0) {
      const empty: PayAnalyticsOverview = {
        totalPayments: 0,
        completedPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
        activeSubscriptions: 0,
        revenueByCurrency: [],
        mrrByCurrency: [],
        revenueTrend: fillRevenueTrend([], TREND_DAYS, 'EUR'),
        topAppsByRevenue: [],
      }
      return sendSuccess(res, empty)
    }

    const Payment = await getPaymentModel()

    const trendStart = new Date()
    trendStart.setUTCHours(0, 0, 0, 0)
    trendStart.setUTCDate(trendStart.getUTCDate() - (TREND_DAYS - 1))

    const baseScope: Record<string, unknown> = scopedSlugs
      ? { projectId: { $in: scopedSlugs } }
      : {}

    const completedFilter: Record<string, unknown> = { ...baseScope, status: 'completed' }
    const failedFilter: Record<string, unknown> = { ...baseScope, status: 'failed' }
    const refundedFilter: Record<string, unknown> = { ...baseScope, status: 'refunded' }
    const activeSubsFilter: Record<string, unknown> = {
      ...baseScope,
      type: 'subscription',
      status: 'completed',
      $or: [{ cancelAtPeriodEnd: { $ne: true } }, { cancelAtPeriodEnd: { $exists: false } }],
    }

    const [
      revenueByCurrencyRaw,
      totalPayments,
      completedPayments,
      failedPayments,
      refundedPayments,
      activeSubscriptions,
      mrrByCurrencyRaw,
      revenueTrendBuckets,
      topAppsAggregation,
    ] = await Promise.all([
      Payment.aggregate<{ currency: string; total: number }>([
        { $match: completedFilter },
        {
          $group: {
            _id: { $toUpper: '$currency' },
            total: { $sum: '$amount' },
          },
        },
        { $project: { _id: 0, currency: '$_id', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      Payment.countDocuments(baseScope),
      Payment.countDocuments(completedFilter),
      Payment.countDocuments(failedFilter),
      Payment.countDocuments(refundedFilter),
      Payment.countDocuments(activeSubsFilter),
      // MRR by currency: sum of active monthly subscription amounts grouped by currency.
      Payment.aggregate<{ currency: string; total: number }>([
        {
          $match: {
            ...activeSubsFilter,
            'metadata.interval': 'month',
          },
        },
        {
          $group: {
            _id: { $toUpper: '$currency' },
            total: { $sum: '$amount' },
          },
        },
        { $project: { _id: 0, currency: '$_id', total: 1 } },
        { $sort: { total: -1 } },
      ]),
      // Revenue trend (last 30 days, daily buckets, UTC).
      Payment.aggregate<{ date: string; total: number }>([
        {
          $match: {
            ...completedFilter,
            createdAt: { $gte: trendStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $project: { _id: 0, date: '$_id', total: 1 } },
        { $sort: { date: 1 } },
      ]),
      // Top apps by completed revenue.
      Payment.aggregate<{ appName: string; total: number; currency: string }>([
        { $match: completedFilter },
        {
          $group: {
            _id: { projectId: '$projectId', currency: { $toUpper: '$currency' } },
            total: { $sum: '$amount' },
          },
        },
        {
          $project: {
            _id: 0,
            appName: '$_id.projectId',
            currency: '$_id.currency',
            total: 1,
          },
        },
        { $sort: { total: -1 } },
        { $limit: TOP_APPS_LIMIT },
      ]),
    ])

    // Defensive: ensure every numeric field is a finite number (never NaN/null/undefined).
    // Coerce per-row totals so the SDK formatter never receives garbage.
    const revenueByCurrency = revenueByCurrencyRaw.map(r => ({
      currency: r.currency,
      total: Number.isFinite(r.total) ? r.total : 0,
    }))
    const mrrByCurrency = mrrByCurrencyRaw.map(r => ({
      currency: r.currency,
      total: Number.isFinite(r.total) ? r.total : 0,
    }))
    const topAppsByRevenue = topAppsAggregation.map(a => ({
      appName: a.appName,
      currency: a.currency,
      total: Number.isFinite(a.total) ? a.total : 0,
    }))

    // Primary currency for the trend = highest-revenue currency, fallback EUR.
    const primaryCurrency = revenueByCurrency[0]?.currency ?? 'EUR'

    const overview: PayAnalyticsOverview = {
      totalPayments,
      completedPayments,
      failedPayments,
      refundedPayments,
      activeSubscriptions,
      revenueByCurrency,
      mrrByCurrency,
      revenueTrend: fillRevenueTrend(revenueTrendBuckets, TREND_DAYS, primaryCurrency),
      topAppsByRevenue,
    }

    sendSuccess(res, overview)
  } catch (error: unknown) {
    logger.error('Error computing pay analytics overview:', error)
    sendError(res, 'Failed to compute pay analytics', 500)
  }
}

docRouter.get(
  '/admin/analytics/overview',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  attachDerivedScope,
  payAnalyticsOverviewController,
  {
    summary: 'Pay analytics overview (auto-scoped: superadmin = platform, admin = owned apps)',
    tags: ['Admin'],
    responseSchema: payAnalyticsOverviewResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: errorResponseSchema },
      403: { description: 'Forbidden — admin role required', schema: errorResponseSchema },
      500: { description: 'Server error', schema: errorResponseSchema },
    },
  }
)

export { payAnalyticsOverviewRegistry as registry, router }
export default router
