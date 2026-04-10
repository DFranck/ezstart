/**
 * GET /api/health-checks/history/project/:projectId
 *
 * Get aggregated health check history for all services of a project
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
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

const projectIdParamSchema = z.object({
  projectId: z.string().describe('Project identifier (e.g. ezauth, ezbill)'),
})

const projectHistoryQuerySchema = z.object({
  hours: z.coerce.number().default(24).describe('Time range in hours'),
  limit: z.coerce.number().default(100).describe('Number of history entries per service'),
})

const projectHistoryResponseSchema = z.object({
  projectId: z.string(),
  hours: z.number(),
  services: z.array(
    z.object({
      serviceId: z.string(),
      totalChecks: z.number(),
      healthyChecks: z.number(),
      uptimePercentage: z.number(),
      avgResponseTime: z.number().nullable(),
      history: z.array(
        z.object({
          status: z.enum(['healthy', 'unhealthy']),
          responseTime: z.number().nullable(),
          timestamp: z.string(),
        })
      ),
    })
  ),
})

// ========================================
// Route Handler
// ========================================

const getProjectHistoryHandler = (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const hours = Number(req.query.hours) || 24
    const limit = Number(req.query.limit) || 100

    // Find all services for this project (e.g. ezauth-api, ezauth-web)
    const serviceIds = Object.keys(MONITORED_SERVICES).filter(id => id.startsWith(`${projectId}-`))

    if (serviceIds.length === 0) {
      return sendError(res, `No services found for project: ${projectId}`, 404)
    }

    const services = serviceIds.map(serviceId => {
      const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]
      const history = healthChecker.getHistory(config.name, limit)

      const totalChecks = history.length
      const healthyChecks = history.filter(h => h.status === 'healthy').length
      const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

      const responseTimes = history
        .map(h => h.responseTime)
        .filter((rt): rt is number => rt !== null)
      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : null

      return {
        serviceId,
        totalChecks,
        healthyChecks,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        avgResponseTime,
        history: history.map(h => ({
          status: h.status as 'healthy' | 'unhealthy',
          responseTime: h.responseTime,
          timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : String(h.timestamp),
        })),
      }
    })

    sendSuccess(res, {
      projectId,
      hours,
      services,
    })
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get project history')
  }
}

// ========================================
// Route Registration
// ========================================

docRouter.get('/history/project/:projectId', getProjectHistoryHandler, {
  summary: 'Get aggregated health check history for a project',
  tags: ['Health Checks'],
  paramsSchema: projectIdParamSchema,
  querySchema: projectHistoryQuerySchema,
  responseSchema: projectHistoryResponseSchema,
})

export default router as ReturnType<typeof Router>
