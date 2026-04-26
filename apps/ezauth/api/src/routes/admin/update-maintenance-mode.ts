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
import {
  getMaintenanceModeModel,
  getOrCreateMaintenanceMode,
} from '../../models/maintenance-mode.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { requireAdmin } from './require-admin.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const updateMaintenanceModeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateMaintenanceModeRegistry, router)

const updateMaintenanceModeBodySchema = z.object({
  enabled: z.boolean().describe('Whether maintenance mode is active'),
  message: z.string().max(1000).optional().describe('Banner message shown to users'),
  scheduledEnd: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe('Optional ISO datetime when maintenance is expected to end'),
})

const updateMaintenanceModeResponseSchema = z.object({
  enabled: z.boolean(),
  message: z.string(),
  startedAt: z.string().nullable(),
  scheduledEnd: z.string().nullable(),
  updatedBy: z.string().optional(),
  updatedAt: z.string(),
})

const updateMaintenanceModeController = async (req: Request, res: Response) => {
  try {
    const parsed = updateMaintenanceModeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin') === true
    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required', 403)
    }

    const { enabled, message, scheduledEnd } = parsed.data

    const MaintenanceMode = await getMaintenanceModeModel()
    const existing = await getOrCreateMaintenanceMode()

    const wasEnabled = existing.enabled
    const willEnable = enabled === true

    const update: Record<string, unknown> = {
      enabled,
      updatedBy: currentUser._id,
    }
    if (message !== undefined) update.message = message
    if (scheduledEnd !== undefined) {
      update.scheduledEnd = scheduledEnd === null ? null : new Date(scheduledEnd)
    }

    // Set startedAt when enabling for the first time, reset when disabling.
    if (willEnable && !wasEnabled) {
      update.startedAt = new Date()
    } else if (!willEnable && wasEnabled) {
      update.startedAt = null
    }

    const doc = await MaintenanceMode.findOneAndUpdate(
      { singleton: 'singleton' },
      { $set: update },
      { new: true, upsert: true }
    )

    logger.info(
      `Admin ${currentUser.email} ${enabled ? 'ENABLED' : 'DISABLED'} maintenance mode (message="${doc.message}")`
    )

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
    logger.error('Error updating maintenance mode:', error)
    sendError(res, 'Failed to update maintenance mode', 500)
  }
}

docRouter.put(
  '/maintenance-mode',
  verifyCookieCsrf,
  verifyTokenMiddleware,
  requireAdmin,
  updateMaintenanceModeController,
  {
    summary: 'Update the maintenance-mode singleton (admin)',
    tags: ['Admin'],
    bodySchema: updateMaintenanceModeBodySchema,
    responseSchema: updateMaintenanceModeResponseSchema,
    extraResponses: {
      400: { description: 'Bad request', schema: adminErrorSchema },
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
