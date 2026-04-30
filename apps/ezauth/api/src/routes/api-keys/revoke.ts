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
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { logger } from '@ezstart/logger/server'

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
    const userId = req.userId!
    const { id } = req.params
    const ApiKey = await getApiKeyModel()

    const apiKey = await ApiKey.findOne({ _id: id, userId })
    if (!apiKey) {
      return sendError(res, 'API key not found', 404)
    }

    // Multi-tenancy: an admin-scoped API key bound to one Application slug
    // cannot revoke keys belonging to other Applications, even when the
    // owning user is the same. 404 to avoid existence leaks.
    if (req.apiKeyAppName && req.apiKeyAppName !== '*' && apiKey.appName !== req.apiKeyAppName) {
      return sendError(res, 'API key not found', 404)
    }

    if (apiKey.status === 'revoked') {
      return sendError(res, 'API key is already revoked', 400)
    }

    apiKey.status = 'revoked'
    apiKey.revokedAt = new Date()
    await apiKey.save()

    void AuditLogService.createFromRequest(req, {
      userId,
      action: 'api_key_revoked',
      appName: apiKey.appName,
      metadata: {
        apiKeyId: apiKey._id.toString(),
        keyPrefix: apiKey.keyPrefix,
      },
    })

    sendSuccess(res, { message: 'API key revoked' })
  } catch (error: unknown) {
    logger.error('Revoke API key error:', error)
    sendError(res, 'Failed to revoke API key', 500)
  }
}

docRouter.delete('/keys/:id', authJwtOrKey({ requireKeyScope: 'admin' }), revokeApiKeyController, {
  summary: 'Revoke an API key (soft delete)',
  tags: ['API Keys'],
  responseSchema: revokeApiKeyResponseSchema,
  extraResponses: {
    400: { description: 'Key already revoked', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'API key not found', schema: errorResponseSchema },
  },
})

export default router
