/**
 * GET /api/health-checks/:serviceId/history
 *
 * Get health check history with uptime statistics
 */

import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError } from '@ezstart/express-core'
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
  history: z.array(
    z.object({
      timestamp: z.string(),
      status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
      responseTime: z.number().nullable(),
    })
  ).describe('Historical health check results'),
  uptime: z.object({
    '24h': z.number(),
    '7d': z.number(),
    '30d': z.number(),
  }).describe('Uptime percentage for different time periods'),
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
      return res.status(404).json({ error: 'Service not found' })
    }

    const history = healthChecker.getHistory(config.name, Number(limit))
    const uptime24h = healthChecker.calculateUptime(config.name, 24)
    const uptime7d = healthChecker.calculateUptime(config.name, 24 * 7)
    const uptime30d = healthChecker.calculateUptime(config.name, 24 * 30)

    res.json({
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
    res.status(500).json({
      error: 'Failed to get health check history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
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
