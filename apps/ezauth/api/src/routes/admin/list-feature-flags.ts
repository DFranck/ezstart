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
import { logger } from '@ezstart/logger/server'
import { getFeatureFlagModel } from '../../models/feature-flag.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin, enforceAdminTwoFactor } from './require-admin.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const listFeatureFlagsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listFeatureFlagsRegistry, router)

const featureFlagItemSchema = z.object({
  _id: z.string().describe('Mongo ObjectId of the flag document'),
  key: z.string().describe('Stable feature flag identifier'),
  enabled: z.boolean().describe('Whether the flag is currently active'),
  scope: z.enum(['global', 'app']).describe('Audience scope of the flag'),
  appName: z.string().optional().describe('App slug when scope === "app"'),
  description: z.string().optional().describe('Human-readable description'),
  updatedBy: z.string().optional().describe('Last admin to flip the flag'),
  createdAt: z.string().describe('ISO creation date'),
  updatedAt: z.string().describe('ISO last-update date'),
})

const listFeatureFlagsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(featureFlagItemSchema),
})

const listFeatureFlagsController = async (_req: Request, res: Response) => {
  try {
    const FeatureFlag = await getFeatureFlagModel()
    const flags = await FeatureFlag.find({}).sort({ scope: 1, key: 1 }).lean()

    const data = flags.map(flag => ({
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
    }))

    sendSuccess(res, data)
  } catch (error: unknown) {
    logger.error('Error listing feature flags:', error)
    sendError(res, 'Failed to list feature flags', 500)
  }
}

docRouter.get(
  '/feature-flags',
  verifyTokenMiddleware,
  requireAdmin,
  enforceAdminTwoFactor,
  listFeatureFlagsController,
  {
    summary: 'List all feature flags (admin)',
    tags: ['Admin'],
    responseSchema: listFeatureFlagsResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
