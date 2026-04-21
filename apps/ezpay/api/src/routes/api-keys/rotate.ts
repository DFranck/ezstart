/**
 * POST /api/keys/:id/rotate — revoke an EZPay API key and issue a new one
 * with identical metadata (applicationId, appSlug, scope, type, env).
 *
 * Auth: Bearer JWT + ownership. The raw key is returned exactly once.
 *
 * @module apps/ezpay/api/src/routes/api-keys/rotate
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
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'

export const rotateApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(rotateApiKeyRegistry, router)

const rotateApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    key: z.string().openapi({ description: 'New raw API key — only returned here' }),
    keyPrefix: z.string(),
    name: z.string(),
    applicationId: z.string(),
    appSlug: z.string(),
    type: z.enum(['publishable', 'secret']),
    env: z.enum(['live', 'test']),
    scope: z.enum(['admin', 'user', 'readonly']),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const rotateApiKeyController = async (req: Request, res: Response) => {
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

    const oldKey = await ApiKey.findOne({ _id: id, userId })
    if (!oldKey) {
      return sendError(res, 'API key not found', 404)
    }

    if (oldKey.status === 'revoked') {
      return sendError(res, 'Cannot rotate a revoked API key', 400)
    }

    oldKey.status = 'revoked'
    oldKey.revokedAt = new Date()
    await oldKey.save()

    const rawKey = generateRawApiKey({ type: oldKey.type, env: oldKey.env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const newKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: oldKey.name,
      userId,
      applicationId: oldKey.applicationId,
      appSlug: oldKey.appSlug,
      type: oldKey.type,
      env: oldKey.env,
      scope: oldKey.scope,
      permissions: oldKey.permissions,
      status: 'active',
      expiresAt: oldKey.expiresAt,
      quotaMonthly: oldKey.quotaMonthly,
      createdBy: userId,
    })

    sendSuccess(res, {
      id: newKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: newKey.name,
      applicationId: newKey.applicationId,
      appSlug: newKey.appSlug,
      type: newKey.type,
      env: newKey.env,
      scope: newKey.scope,
    })
  } catch (error: unknown) {
    logger.error('Rotate EZPay API key error:', error)
    sendError(res, 'Failed to rotate API key', 500)
  }
}

docRouter.post('/keys/:id/rotate', authMiddleware, populateUserFromToken, rotateApiKeyController, {
  summary: 'Rotate an EZPay API key (revoke old + issue new with same scope)',
  tags: ['API Keys'],
  responseSchema: rotateApiKeyResponseSchema,
  extraResponses: {
    400: { description: 'Key already revoked', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

export default router
