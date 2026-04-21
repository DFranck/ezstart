/**
 * GET /api/keys/:id/usage — detailed usage stats for an EZPay API key.
 *
 * Auth: Bearer JWT + ownership. Returns current-month aggregates (request
 * count + top endpoints) plus the last 30 days daily breakdown and the
 * quota snapshot.
 *
 * @module apps/ezpay/api/src/routes/api-keys/usage
 */

import type { Request, Response } from 'express'
import { Router as ExpressRouter } from 'express'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { Types } from 'mongoose'
import { logger } from '@ezstart/logger/server'

import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'

export const usageApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(usageApiKeyRegistry, router)

/** Current month prefix `yyyy-mm`. */
function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Date string N days before today — `yyyy-mm-dd`. */
function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const keyUsageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    currentMonth: z.object({
      requestCount: z.number(),
      topEndpoints: z.array(z.object({ endpoint: z.string(), count: z.number() })),
    }),
    daily: z.array(z.object({ date: z.string(), requestCount: z.number() })),
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
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }
    const { id } = req.params
    // Guard malformed ObjectId → 404 (mirror ezauth applications/get.ts pattern)
    // to avoid CastError leaking as 500 and to not disclose id-format internals.
    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'API key not found', 404)
    }

    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ _id: id, userId }).lean()
    if (!apiKey) {
      return sendError(res, 'API key not found', 404)
    }

    const ApiKeyUsage = await getApiKeyUsageModel()
    const monthPrefix = getCurrentMonthPrefix()
    const thirtyDaysAgo = getDateDaysAgo(30)

    const monthlyAgg = await ApiKeyUsage.aggregate<{ totalRequests: number }>([
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
        },
      },
    ])

    const totalRequests = monthlyAgg[0]?.totalRequests ?? 0

    const endpointAgg = await ApiKeyUsage.aggregate<{ _id: string; count: number }>([
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

    const topEndpoints = endpointAgg.map(e => ({
      endpoint: e._id,
      count: e.count,
    }))

    const dailyAgg = await ApiKeyUsage.aggregate<{ _id: string; requestCount: number }>([
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

    const daily = dailyAgg.map(d => ({
      date: d._id,
      requestCount: d.requestCount,
    }))

    const quota = apiKey.quotaMonthly
    const remaining =
      quota !== null && quota !== undefined ? Math.max(0, quota - totalRequests) : null

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
    logger.error('Get EZPay API key usage error:', error)
    sendError(res, 'Failed to get API key usage', 500)
  }
}

docRouter.get('/keys/:id/usage', authMiddleware, populateUserFromToken, keyUsageController, {
  summary: 'Get usage stats for a specific EZPay API key',
  tags: ['API Keys'],
  responseSchema: keyUsageResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

export default router
