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
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
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
  amount: z.number().describe('Sum of completed payment amounts in this currency.'),
})

const revenueTrendPointSchema = z.object({
  date: z.string().describe('ISO date (YYYY-MM-DD) bucketing the day.'),
  amount: z.number().describe('Total revenue (all currencies summed) for that day.'),
  count: z.number().int().nonnegative().describe('Number of completed payments that day.'),
})

const topAppByRevenueSchema = z.object({
  projectId: z.string().describe('Application slug (Payment.projectId).'),
  amount: z.number().describe('Total completed revenue from this app.'),
  count: z.number().int().nonnegative().describe('Number of completed payments from this app.'),
})

const payAnalyticsOverviewSchema = z.object({
  totalRevenueByCurrency: z
    .array(revenueByCurrencySchema)
    .describe('Total completed revenue grouped by currency.'),
  totalPayments: z
    .number()
    .int()
    .nonnegative()
    .describe('Total payments with status="completed" in the scope.'),
  activeSubscriptions: z
    .number()
    .int()
    .nonnegative()
    .describe('Active recurring subscriptions in the scope (subscription type, completed).'),
  mrrProxy: z
    .number()
    .nonnegative()
    .describe(
      'Monthly recurring revenue proxy: sum of active subscription amounts (single currency).'
    ),
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
  buckets: { date: string; amount: number; count: number }[],
  days: number
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
      amount: found?.amount ?? 0,
      count: found?.count ?? 0,
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
    let scopedSlugs: string[] | undefined
    if (derivedScope === 'myApps') {
      const bearerToken = extractBearerToken(req)
      const ownedApps = await listApplicationsByOwner({ bearerToken })
      scopedSlugs = ownedApps.map(a => a.slug)
    } else if (derivedScope === 'mine') {
      // Singleton view — keeps the response shape stable for non-admin users
      // who somehow reach the endpoint (e.g., role demotion mid-session).
      scopedSlugs = []
    }

    // Short-circuit empty scopes — return a fully-zeroed snapshot.
    if (scopedSlugs && scopedSlugs.length === 0) {
      const empty: PayAnalyticsOverview = {
        totalRevenueByCurrency: [],
        totalPayments: 0,
        activeSubscriptions: 0,
        mrrProxy: 0,
        revenueTrend: fillRevenueTrend([], TREND_DAYS),
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
    const activeSubsFilter: Record<string, unknown> = {
      ...baseScope,
      type: 'subscription',
      status: 'completed',
      $or: [{ cancelAtPeriodEnd: { $ne: true } }, { cancelAtPeriodEnd: { $exists: false } }],
    }

    const [
      revenueByCurrency,
      totalPayments,
      activeSubscriptions,
      mrrAggregation,
      revenueTrendBuckets,
      topAppsAggregation,
    ] = await Promise.all([
      Payment.aggregate<{ currency: string; amount: number }>([
        { $match: completedFilter },
        {
          $group: {
            _id: { $toUpper: '$currency' },
            amount: { $sum: '$amount' },
          },
        },
        { $project: { _id: 0, currency: '$_id', amount: 1 } },
        { $sort: { amount: -1 } },
      ]),
      Payment.countDocuments(completedFilter),
      Payment.countDocuments(activeSubsFilter),
      // MRR proxy: sum of active monthly subscription amounts.
      Payment.aggregate<{ amount: number }>([
        {
          $match: {
            ...activeSubsFilter,
            'metadata.interval': 'month',
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
          },
        },
        { $project: { _id: 0, amount: 1 } },
      ]),
      // Revenue trend (last 30 days, daily buckets, UTC).
      Payment.aggregate<{ date: string; amount: number; count: number }>([
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
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: '$_id', amount: 1, count: 1 } },
        { $sort: { date: 1 } },
      ]),
      // Top apps by completed revenue.
      Payment.aggregate<{ projectId: string; amount: number; count: number }>([
        { $match: completedFilter },
        {
          $group: {
            _id: '$projectId',
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, projectId: '$_id', amount: 1, count: 1 } },
        { $sort: { amount: -1 } },
        { $limit: TOP_APPS_LIMIT },
      ]),
    ])

    const overview: PayAnalyticsOverview = {
      totalRevenueByCurrency: revenueByCurrency,
      totalPayments,
      activeSubscriptions,
      mrrProxy: mrrAggregation[0]?.amount ?? 0,
      revenueTrend: fillRevenueTrend(revenueTrendBuckets, TREND_DAYS),
      topAppsByRevenue: topAppsAggregation,
    }

    sendSuccess(res, overview)
  } catch (error: unknown) {
    logger.error('Error computing pay analytics overview:', error)
    sendError(res, 'Failed to compute pay analytics', 500)
  }
}

docRouter.get(
  '/admin/analytics/overview',
  authMiddleware,
  populateUserFromToken,
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
