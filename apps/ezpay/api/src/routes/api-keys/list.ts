/**
 * GET /api/keys — list the current user's EZPay API keys.
 *
 * Auth: Bearer JWT. Optional `?applicationId=` filter to scope the listing
 * to keys tied to a specific Application. The hashed `key` field is never
 * returned.
 *
 * @module apps/ezpay/api/src/routes/api-keys/list
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
import { logger } from '@ezstart/logger/server'

import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'

export const listApiKeysRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApiKeysRegistry, router)

const listApiKeysQuerySchema = z.object({
  applicationId: z.string().optional(),
})

const apiKeyItemSchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  applicationId: z.string(),
  appSlug: z.string(),
  type: z.enum(['publishable', 'secret']),
  env: z.enum(['live', 'test']),
  scope: z.enum(['admin', 'user', 'readonly']),
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
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const parsed = listApiKeysQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 'Invalid query parameters', 400)
    }

    const filter: Record<string, unknown> = { userId }
    if (parsed.data.applicationId) {
      filter.applicationId = parsed.data.applicationId
    }

    const ApiKey = await getApiKeyModel()
    const keys = await ApiKey.find(filter).select('-key').sort({ createdAt: -1 }).lean()

    const ApiKeyUsage = await getApiKeyUsageModel()
    const monthPrefix = new Date().toISOString().slice(0, 7)
    const keyIds = keys.map(k => k._id.toString())
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
    const usageMap = new Map(usageAgg.map(u => [u._id, u.total]))

    const data = keys.map(k => ({
      id: k._id.toString(),
      keyPrefix: k.keyPrefix,
      name: k.name,
      applicationId: k.applicationId,
      appSlug: k.appSlug,
      type: k.type,
      env: k.env,
      scope: k.scope,
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
    logger.error('List EZPay API keys error:', error)
    sendError(res, 'Failed to list API keys', 500)
  }
}

docRouter.get('/keys', authMiddleware, populateUserFromToken, listApiKeysController, {
  summary: 'List EZPay API keys for the current user',
  tags: ['API Keys'],
  responseSchema: listApiKeysResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

export default router
