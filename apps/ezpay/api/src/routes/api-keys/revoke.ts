/**
 * DELETE /api/keys/:id — soft-delete (revoke) an EZPay API key.
 *
 * Auth: Bearer JWT + ownership (key.userId === req.userId). Idempotency is
 * NOT granted — revoking an already-revoked key returns 400 so callers can
 * surface a clear error in the UI.
 *
 * @module apps/ezpay/api/src/routes/api-keys/revoke
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

export const revokeApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(revokeApiKeyRegistry, router)

const revokeApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ message: z.string() }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const revokeApiKeyController = async (req: Request, res: Response) => {
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

    const apiKey = await ApiKey.findOne({ _id: id, userId })
    if (!apiKey) {
      return sendError(res, 'API key not found', 404)
    }

    if (apiKey.status === 'revoked') {
      return sendError(res, 'API key is already revoked', 400)
    }

    apiKey.status = 'revoked'
    apiKey.revokedAt = new Date()
    await apiKey.save()

    sendSuccess(res, { message: 'API key revoked' })
  } catch (error: unknown) {
    logger.error('Revoke EZPay API key error:', error)
    sendError(res, 'Failed to revoke API key', 500)
  }
}

docRouter.delete('/keys/:id', authMiddleware, populateUserFromToken, revokeApiKeyController, {
  summary: 'Revoke an EZPay API key (soft delete)',
  tags: ['API Keys'],
  responseSchema: revokeApiKeyResponseSchema,
  extraResponses: {
    400: { description: 'Key already revoked', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

export default router
