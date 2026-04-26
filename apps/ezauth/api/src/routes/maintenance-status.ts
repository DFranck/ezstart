import type { Request, Response } from 'express'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess } from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { getMaintenanceModeModel } from '../models/maintenance-mode.js'

export const maintenanceStatusRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(maintenanceStatusRegistry, router)

const maintenanceStatusResponseSchema = z.object({
  enabled: z.boolean().describe('Whether the platform is currently in maintenance mode'),
  message: z.string().describe('Banner message to display to users'),
  startedAt: z.string().nullable().describe('ISO datetime when maintenance was enabled'),
  scheduledEnd: z
    .string()
    .nullable()
    .describe('Optional ISO datetime when maintenance is expected to end'),
})

/**
 * Default response when no singleton document exists yet — the platform
 * has never enabled maintenance mode. Read-only fallback, no DB write.
 */
const DEFAULT_STATUS = {
  enabled: false,
  message: '',
  startedAt: null,
  scheduledEnd: null,
} as const

/**
 * Public, unauthenticated endpoint exposing the platform's maintenance
 * status so consumer apps can render a `<MaintenanceBanner>` without
 * needing an API key or session.
 *
 * READ-ONLY by design — never writes to the DB. If no singleton document
 * exists yet, returns `{ enabled: false, message: '', ... }`. The admin
 * UI is responsible for creating/updating the singleton via the protected
 * `PUT /api/admin/maintenance-mode` endpoint.
 *
 * Tier 1 endpoint (per `standard-saas-cors.md`) — `Access-Control-Allow-Origin: *`
 * is applied globally by `createEzstartServer`.
 */
const maintenanceStatusController = async (_req: Request, res: Response) => {
  try {
    const MaintenanceMode = await getMaintenanceModeModel()
    const doc = await MaintenanceMode.findOne({ singleton: 'singleton' })
    if (!doc) {
      sendSuccess(res, DEFAULT_STATUS)
      return
    }
    sendSuccess(res, {
      enabled: doc.enabled,
      message: doc.message ?? '',
      startedAt: doc.startedAt instanceof Date ? doc.startedAt.toISOString() : null,
      scheduledEnd: doc.scheduledEnd instanceof Date ? doc.scheduledEnd.toISOString() : null,
    })
  } catch (error: unknown) {
    // Public endpoint must NEVER 500 — degrade gracefully so consumer apps
    // can keep functioning even if the maintenance singleton lookup fails.
    logger.error('Error fetching public maintenance status (returning defaults):', error)
    sendSuccess(res, DEFAULT_STATUS)
  }
}

docRouter.get('/maintenance-status', maintenanceStatusController, {
  summary: 'Get the platform maintenance status (public)',
  tags: ['Public'],
  responseSchema: maintenanceStatusResponseSchema,
})

export default router
