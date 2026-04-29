/**
 * DELETE /api/applications/:id — archive an Application (soft delete).
 *
 * Sets `status='archived'`. If the Application still has active API keys
 * pointing to it, the request fails with 409 — unless `?cascade=true` is
 * passed, in which case those keys are revoked in batch in the same
 * operation.
 *
 * Owner OR superadmin only. Non-owners receive 404 to avoid tenant leaks.
 */

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
import { Types } from 'mongoose'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApplicationModel } from '../../models/application.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'

export const archiveApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(archiveApplicationRegistry, router)

const archiveResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
    revokedKeys: z.number(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const archiveApplicationController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const cascade = req.query.cascade === 'true'

    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Application not found', 404)
    }

    const Application = await getApplicationModel()
    // `includeArchived: true` opts out of the archive pre-find guard so we
    // can detect an already-archived Application and return a clean 400
    // ("already archived") instead of collapsing both branches to 404.
    const app = await Application.findOne({ _id: id }, null, { includeArchived: true })
    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    if (app.ownerId !== userId) {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        return sendError(res, 'Application not found', 404)
      }
    }

    if (app.status === 'archived') {
      return sendError(res, 'Application is already archived', 400)
    }

    const ApiKey = await getApiKeyModel()
    const activeKeysCount = await ApiKey.countDocuments({
      applicationId: app._id,
      status: 'active',
    })

    let revokedKeys = 0
    if (activeKeysCount > 0) {
      if (!cascade) {
        return sendError(
          res,
          `Application has ${activeKeysCount} active API key(s). Revoke them first or pass \`?cascade=true\`.`,
          409
        )
      }

      const result = await ApiKey.updateMany(
        { applicationId: app._id, status: 'active' },
        { $set: { status: 'revoked', revokedAt: new Date() } }
      )
      revokedKeys = result.modifiedCount
    }

    app.status = 'archived'
    await app.save()

    return sendSuccess(res, {
      message: 'Application archived',
      revokedKeys,
    })
  } catch (error: unknown) {
    logger.error('Archive application error:', error)
    return sendError(res, 'Failed to archive application', 500)
  }
}

docRouter.delete('/applications/:id', verifyTokenMiddleware, archiveApplicationController, {
  summary: 'Archive an Application (soft delete, optional cascade revokes keys)',
  tags: ['Applications'],
  responseSchema: archiveResponseSchema,
  extraResponses: {
    400: { description: 'Application already archived', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'Application not found', schema: errorResponseSchema },
    409: {
      description: 'Active API keys exist — pass `?cascade=true` to revoke them',
      schema: errorResponseSchema,
    },
  },
})

export default router
