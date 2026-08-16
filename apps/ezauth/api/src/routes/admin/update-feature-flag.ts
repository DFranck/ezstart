import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { FEATURE_FLAG_KEY_REGEX, getFeatureFlagModel } from '../../models/feature-flag.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { requireAdmin, enforceAdminTwoFactor } from './require-admin.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const updateFeatureFlagRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateFeatureFlagRegistry, router)

const updateFeatureFlagParamsSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(FEATURE_FLAG_KEY_REGEX, 'Invalid feature flag key format')
    .describe('Feature flag key (lowercase, dots, dashes)'),
})

const updateFeatureFlagBodySchema = z.object({
  enabled: z.boolean().describe('New enabled state'),
  scope: z.enum(['global', 'app']).optional().describe('Scope (defaults to "global" on create)'),
  appName: z.string().min(1).max(64).optional().describe('App slug when scope === "app"'),
  description: z.string().max(500).optional().describe('Optional human-readable description'),
})

const updateFeatureFlagResponseSchema = z.object({
  _id: z.string(),
  key: z.string(),
  enabled: z.boolean(),
  scope: z.enum(['global', 'app']),
  appName: z.string().optional(),
  description: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const updateFeatureFlagController = async (req: Request, res: Response) => {
  try {
    const parsedParams = updateFeatureFlagParamsSchema.safeParse(req.params)
    if (!parsedParams.success) {
      return sendValidationError(res, 'Invalid feature flag key', parsedParams.error.issues)
    }

    const parsedBody = updateFeatureFlagBodySchema.safeParse(req.body)
    if (!parsedBody.success) {
      return sendValidationError(res, 'Invalid request body', parsedBody.error.issues)
    }

    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin') === true
    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required', 403)
    }

    const { key } = parsedParams.data
    const { enabled, scope, appName, description } = parsedBody.data

    if (scope === 'app' && !appName) {
      return sendError(res, 'appName is required when scope === "app"', 400)
    }

    const FeatureFlag = await getFeatureFlagModel()
    const filter = {
      key,
      scope: scope ?? 'global',
      ...(appName ? { appName } : {}),
    }

    const update: Record<string, unknown> = {
      enabled,
      updatedBy: currentUser._id,
    }
    if (description !== undefined) update.description = description

    const flag = await FeatureFlag.findOneAndUpdate(
      filter,
      {
        $set: update,
        $setOnInsert: { key, scope: scope ?? 'global', ...(appName ? { appName } : {}) },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    logger.info(
      `Admin ${currentUser.email} ${enabled ? 'enabled' : 'disabled'} feature flag "${key}" (scope=${scope ?? 'global'}${appName ? `, app=${appName}` : ''})`
    )

    sendSuccess(res, {
      _id: flag._id.toString(),
      key: flag.key,
      enabled: flag.enabled,
      scope: flag.scope,
      appName: flag.appName,
      description: flag.description,
      updatedBy: flag.updatedBy,
      createdAt:
        flag.createdAt instanceof Date ? flag.createdAt.toISOString() : String(flag.createdAt),
      updatedAt:
        flag.updatedAt instanceof Date ? flag.updatedAt.toISOString() : String(flag.updatedAt),
    })
  } catch (error: unknown) {
    logger.error('Error updating feature flag:', error)
    sendError(res, 'Failed to update feature flag', 500)
  }
}

docRouter.patch(
  '/feature-flags/:key',
  verifyCookieCsrf,
  verifyTokenMiddleware,
  requireAdmin,
  enforceAdminTwoFactor,
  updateFeatureFlagController,
  {
    summary: 'Update / upsert a feature flag (admin)',
    tags: ['Admin'],
    bodySchema: updateFeatureFlagBodySchema,
    responseSchema: updateFeatureFlagResponseSchema,
    extraResponses: {
      400: { description: 'Bad request', schema: adminErrorSchema },
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
