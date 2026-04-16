/**
 * GET /api/health-checks/:serviceId/history
 *
 * Get health check history with uptime statistics
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const healthChecker = new HealthChecker()

// ========================================
// Zod Schemas
// ========================================

const serviceIdParamSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
})

const historyQuerySchema = z.object({
  limit: z.coerce.number().default(50).describe('Number of history entries to return'),
})

const historyResponseSchema = z.object({
  id: z.string().describe('Unique identifier of the service'),
  name: z.string().describe('Human-readable name of the service'),
  history: z
    .array(
      z.object({
        timestamp: z.string().describe('ISO timestamp of the health check'),
        status: z
          .enum(['healthy', 'degraded', 'unhealthy', 'unknown'])
          .describe('Health status at this point'),
        responseTime: z.number().nullable().describe('Response time in ms'),
      })
    )
    .describe('Historical health check results'),
  uptime: z
    .object({
      '24h': z.number().describe('Uptime percentage over last 24 hours'),
      '7d': z.number().describe('Uptime percentage over last 7 days'),
      '30d': z.number().describe('Uptime percentage over last 30 days'),
    })
    .describe('Uptime percentage for different time periods'),
})

// ========================================
// Route Handler
// ========================================

const getServiceHistoryHandler = (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const { limit = '50' } = req.query

    const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

    if (!config) {
      return sendError(res, 'Service not found', 404)
    }

    const history = healthChecker.getHistory(config.name, Number(limit))
    const uptime24h = healthChecker.calculateUptime(config.name, 24)
    const uptime7d = healthChecker.calculateUptime(config.name, 24 * 7)
    const uptime30d = healthChecker.calculateUptime(config.name, 24 * 30)

    sendSuccess(res, {
      id: serviceId,
      name: config.name,
      history,
      uptime: {
        '24h': uptime24h,
        '7d': uptime7d,
        '30d': uptime30d,
      },
    })
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get health check history')
  }
}

// ========================================
// Route Registration
// ========================================

docRouter.get('/:serviceId/history', getServiceHistoryHandler, {
  summary: 'Get health check history with uptime statistics',
  tags: ['Health Checks'],
  paramsSchema: serviceIdParamSchema,
  querySchema: historyQuerySchema,
  responseSchema: historyResponseSchema,
})

export default router as ReturnType<typeof Router>
