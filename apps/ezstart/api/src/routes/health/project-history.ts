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
} from '@ezstart/api-core'
import { PaginationQuerySchema } from '@ezstart/api-contracts'
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
  projectId: z.string().openapi({ description: 'Project identifier (e.g. ezauth, ezbill)' }),
})

// Note: previous schema accepted unbounded limit (default 100). Now uses
// canonical PaginationQuerySchema (limit 1-100, default 50). `offset` is
// extended in but unused by this handler (in-memory ring buffer).
const projectHistoryQuerySchema = PaginationQuerySchema.extend({
  hours: z.coerce.number().default(24).openapi({ description: 'Time range in hours' }),
})

const projectHistoryResponseSchema = z.object({
  projectId: z.string().describe('Project identifier (e.g. ezauth, ezbill)'),
  hours: z.number().describe('Time window covered by the response in hours'),
  services: z
    .array(
      z.object({
        serviceId: z.string().describe('Service identifier (e.g. ezauth-api, ezauth-web)'),
        totalChecks: z.number().describe('Total number of health checks in the window'),
        healthyChecks: z.number().describe('Number of healthy checks in the window'),
        uptimePercentage: z.number().describe('Uptime percentage over the window (0-100)'),
        avgResponseTime: z
          .number()
          .nullable()
          .describe('Average response time in ms (null when no checks)'),
        history: z
          .array(
            z.object({
              status: z.enum(['healthy', 'unhealthy']).describe('Health status at the checkpoint'),
              responseTime: z.number().nullable().describe('Response time in ms (null on failure)'),
              timestamp: z.string().describe('ISO timestamp of the check'),
            })
          )
          .describe('Recent health check data points (newest first)'),
      })
    )
    .describe('Per-service history aggregated for the project'),
})

// ========================================
// Route Handler
// ========================================

const getProjectHistoryHandler = (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const parsed = projectHistoryQuerySchema.safeParse(req.query)
    const hours = parsed.success ? parsed.data.hours : 24
    const limit = parsed.success ? parsed.data.limit : 50

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
