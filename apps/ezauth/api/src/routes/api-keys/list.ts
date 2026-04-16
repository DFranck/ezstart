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
import { logger } from '@ezstart/logger/server'

export const listApiKeysRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApiKeysRegistry, router)

const apiKeyItemSchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  appName: z.string(),
  permissions: z.array(z.string()),
  status: z.enum(['active', 'revoked']),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
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

    const keys = await ApiKey.find({ userId })
      .select('-key')
      .sort({ createdAt: -1 })
      .lean()

    const data = keys.map(k => ({
      id: k._id.toString(),
      keyPrefix: k.keyPrefix,
      name: k.name,
      appName: k.appName,
      permissions: k.permissions,
      status: k.status,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
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
