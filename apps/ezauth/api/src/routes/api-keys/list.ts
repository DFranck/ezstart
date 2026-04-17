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

export const listApiKeysRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApiKeysRegistry, router)

const apiKeyItemSchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  appName: z.string(),
  scope: z.enum(['app', 'platform']),
  permissions: z.array(z.string()),
  status: z.enum(['active', 'revoked']),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  quotaMonthly: z.number().nullable(),
  usageThisMonth: z.number(),
})

const listApiKeysResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(apiKeyItemSchema),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const listApiKeysController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const ApiKeyUsage = await getApiKeyUsageModel()

    const keys = await ApiKey.find({ userId })
      .select('-key')
      .sort({ createdAt: -1 })
      .lean()

    // Get current month usage per key
    const monthPrefix = new Date().toISOString().slice(0, 7)
    const keyIds = keys.map((k) => k._id.toString())
    const usageAgg = await ApiKeyUsage.aggregate<{ _id: string; total: number }>([
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

    const data = keys.map(k => ({
      id: k._id.toString(),
      keyPrefix: k.keyPrefix,
      name: k.name,
      appName: k.appName,
      scope: k.scope || 'app',
      permissions: k.permissions,
      status: k.status,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
      quotaMonthly: k.quotaMonthly ?? null,
      usageThisMonth: usageMap.get(k._id.toString()) ?? 0,
    }))

    sendSuccess(res, data)
  } catch (error: unknown) {
    logger.error('List API keys error:', error)
    sendError(res, 'Failed to list API keys', 500)
  }
}

docRouter.get('/keys', verifyTokenMiddleware, listApiKeysController, {
  summary: 'List API keys for current user',
  tags: ['API Keys'],
  responseSchema: listApiKeysResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

export default router
