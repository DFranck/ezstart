import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'
import { logger } from '@ezstart/logger/server'

export const usageApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(usageApiKeyRegistry, router)

// ---------- Helpers ----------

/** Get the current month prefix (e.g. '2026-04'). */
function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Get a date string N days ago (e.g. '2026-03-17'). */
function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

// ---------- GET /keys/:id/usage ----------

const keyUsageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    currentMonth: z.object({
      requestCount: z.number(),
      topEndpoints: z.array(
        z.object({ endpoint: z.string(), count: z.number() })
      ),
    }),
    daily: z.array(
      z.object({ date: z.string(), requestCount: z.number() })
    ),
    quota: z.object({
      limit: z.number().nullable(),
      used: z.number(),
      remaining: z.number().nullable(),
    }),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const keyUsageController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ _id: id, userId }).lean()
    if (!apiKey) {
      return sendError(res, 'API key not found', 404)
    }

    const ApiKeyUsage = await getApiKeyUsageModel()
    const monthPrefix = getCurrentMonthPrefix()
    const thirtyDaysAgo = getDateDaysAgo(30)

    // Current month aggregate
    const monthlyAgg = await ApiKeyUsage.aggregate<{
      totalRequests: number
      endpointMap: Record<string, number>
    }>([
      {
        $match: {
          apiKeyId: id,
          date: { $regex: `^${monthPrefix}` },
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$requestCount' },
          endpointMaps: { $push: '$endpoints' },
        },
      },
      {
        $project: {
          totalRequests: 1,
          endpointMap: {
            $reduce: {
              input: '$endpointMaps',
              initialValue: {},
              in: { $mergeObjects: ['$$value', '$$this'] },
            },
          },
        },
      },
    ])

    const monthlyData = monthlyAgg[0]
    const totalRequests = monthlyData?.totalRequests ?? 0

    // Merge endpoint counts properly (the $mergeObjects above overwrites, so re-aggregate)
    const endpointAgg = await ApiKeyUsage.aggregate<{
      _id: string
      count: number
    }>([
      {
        $match: {
          apiKeyId: id,
          date: { $regex: `^${monthPrefix}` },
        },
      },
      { $project: { endpoints: { $objectToArray: '$endpoints' } } },
      { $unwind: '$endpoints' },
      {
        $group: {
          _id: '$endpoints.k',
          count: { $sum: '$endpoints.v' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    const topEndpoints = endpointAgg.map((e) => ({
      endpoint: e._id,
      count: e.count,
    }))

    // Daily breakdown (last 30 days)
    const dailyAgg = await ApiKeyUsage.aggregate<{
      _id: string
      requestCount: number
    }>([
      {
        $match: {
          apiKeyId: id,
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$date',
          requestCount: { $sum: '$requestCount' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const daily = dailyAgg.map((d) => ({
      date: d._id,
      requestCount: d.requestCount,
    }))

    const quota = apiKey.quotaMonthly
    const remaining = quota !== null && quota !== undefined ? Math.max(0, quota - totalRequests) : null

    sendSuccess(res, {
      currentMonth: {
        requestCount: totalRequests,
        topEndpoints,
      },
      daily,
      quota: {
        limit: quota ?? null,
        used: totalRequests,
        remaining,
      },
    })
  } catch (error: unknown) {
    logger.error('Get API key usage error:', error)
    sendError(res, 'Failed to get API key usage', 500)
  }
}

docRouter.get('/keys/:id/usage', verifyTokenMiddleware, keyUsageController, {
  summary: 'Get usage stats for a specific API key',
  tags: ['API Keys'],
  responseSchema: keyUsageResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

// ---------- GET /keys/usage/summary ----------

const usageSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalRequestsThisMonth: z.number(),
    keys: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        requestsThisMonth: z.number(),
        quota: z.number().nullable(),
      })
    ),
  }),
})

const usageSummaryController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const ApiKeyUsage = await getApiKeyUsageModel()
    const monthPrefix = getCurrentMonthPrefix()

    // Get all user's keys
    const keys = await ApiKey.find({ userId })
      .select('_id name quotaMonthly')
      .lean()

    const keyIds = keys.map((k) => k._id.toString())

    // Aggregate usage per key for current month
    const usageAgg = await ApiKeyUsage.aggregate<{
      _id: string
      total: number
    }>([
      {
        $match: {
          apiKeyId: { $in: keyIds },
          date: { $regex: `^${monthPrefix}` },
        },
      },
      {
        $group: {
          _id: '$apiKeyId',
          total: { $sum: '$requestCount' },
        },
      },
    ])

    const usageMap = new Map(usageAgg.map((u) => [u._id, u.total]))

    let totalRequestsThisMonth = 0
    const keySummaries = keys.map((k) => {
      const requests = usageMap.get(k._id.toString()) ?? 0
      totalRequestsThisMonth += requests
      return {
        id: k._id.toString(),
        name: k.name,
        requestsThisMonth: requests,
        quota: k.quotaMonthly ?? null,
      }
    })

    sendSuccess(res, {
      totalRequestsThisMonth,
      keys: keySummaries,
    })
  } catch (error: unknown) {
    logger.error('Get usage summary error:', error)
    sendError(res, 'Failed to get usage summary', 500)
  }
}

docRouter.get('/keys/usage/summary', verifyTokenMiddleware, usageSummaryController, {
  summary: 'Get aggregate usage across all user API keys',
  tags: ['API Keys'],
  responseSchema: usageSummaryResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

export default router
