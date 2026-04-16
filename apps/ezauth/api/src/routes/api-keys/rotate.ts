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
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import { logger } from '@ezstart/logger/server'

export const rotateApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(rotateApiKeyRegistry, router)

const rotateApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    key: z.string().openapi({ description: 'New full API key — only returned here' }),
    keyPrefix: z.string(),
    name: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const rotateApiKeyController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const ApiKey = await getApiKeyModel()

    const oldKey = await ApiKey.findOne({ _id: id, userId })
    if (!oldKey) {
      return sendError(res, 'API key not found', 404)
    }

    if (oldKey.status === 'revoked') {
      return sendError(res, 'Cannot rotate a revoked API key', 400)
    }

    // Revoke old key
    oldKey.status = 'revoked'
    oldKey.revokedAt = new Date()
    await oldKey.save()

    // Create new key with same config
    const rawKey = generateRawApiKey()
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const newKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: oldKey.name,
      userId,
      appName: oldKey.appName,
      permissions: oldKey.permissions,
      status: 'active',
      expiresAt: oldKey.expiresAt,
    })

    sendSuccess(res, {
      id: newKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: newKey.name,
    })
  } catch (error: unknown) {
    logger.error('Rotate API key error:', error)
    sendError(res, 'Failed to rotate API key', 500)
  }
}

docRouter.post('/keys/:id/rotate', verifyTokenMiddleware, rotateApiKeyController, {
  summary: 'Rotate an API key (revoke old + create new)',
  tags: ['API Keys'],
  responseSchema: rotateApiKeyResponseSchema,
  extraResponses: {
    400: { description: 'Key already revoked', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

export default router
