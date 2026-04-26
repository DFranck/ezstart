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
import { getOrCreateMaintenanceMode } from '../../models/maintenance-mode.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const getMaintenanceModeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getMaintenanceModeRegistry, router)

const maintenanceModeResponseSchema = z.object({
  enabled: z.boolean(),
  message: z.string(),
  startedAt: z.string().nullable(),
  scheduledEnd: z.string().nullable(),
  updatedBy: z.string().optional(),
  updatedAt: z.string(),
})

const getMaintenanceModeController = async (_req: Request, res: Response) => {
  try {
    const doc = await getOrCreateMaintenanceMode()
    sendSuccess(res, {
      enabled: doc.enabled,
      message: doc.message,
      startedAt: doc.startedAt instanceof Date ? doc.startedAt.toISOString() : null,
      scheduledEnd: doc.scheduledEnd instanceof Date ? doc.scheduledEnd.toISOString() : null,
      updatedBy: doc.updatedBy,
      updatedAt:
        doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    })
  } catch (error: unknown) {
    logger.error('Error fetching maintenance mode:', error)
    sendError(res, 'Failed to fetch maintenance mode', 500)
  }
}

docRouter.get(
  '/maintenance-mode',
  verifyTokenMiddleware,
  requireAdmin,
  getMaintenanceModeController,
  {
    summary: 'Get the maintenance-mode singleton (admin)',
    tags: ['Admin'],
    responseSchema: maintenanceModeResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
