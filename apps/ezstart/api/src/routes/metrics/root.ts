/**
 * GET /api/metrics
 *
 * Aggregated metrics endpoint — uptime %, avg response time, error rate, check counts
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import type { Request, Response } from 'express'
import type { PipelineStage } from 'mongoose'
import { getHealthCheckModel } from '../../models/HealthCheck.js'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

interface PeriodBoundaries {
  label: string
  since: Date
}

interface ServiceAggregation {
  _id: string
  totalChecks: number
  healthyChecks: number
  avgResponseTime: number | null
}

function getPeriodBoundaries(): PeriodBoundaries[] {
  const now = Date.now()
  return [
    { label: '24h', since: new Date(now - 24 * 60 * 60 * 1000) },
    { label: '7d', since: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    { label: '30d', since: new Date(now - 30 * 24 * 60 * 60 * 1000) },
  ]
}

const getRootMetricsHandler = async (_: Request, res: Response) => {
  try {
    const HealthCheck = await getHealthCheckModel()
    const periods = getPeriodBoundaries()

    // Run one aggregate per period in parallel
    const periodResults = await Promise.all(
      periods.map(async ({ label, since }) => {
        const pipeline: PipelineStage[] = [
          { $match: { timestamp: { $gte: since } } },
          {
            $group: {
              _id: '$serviceId',
              totalChecks: { $sum: 1 },
              healthyChecks: {
                $sum: { $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0] },
              },
              avgResponseTime: { $avg: '$responseTime' },
            },
          },
        ]

        const results: ServiceAggregation[] = await HealthCheck.aggregate(pipeline)

        const services = results.map(row => ({
          serviceId: row._id,
          totalChecks: row.totalChecks,
          healthyChecks: row.healthyChecks,
          uptimePercent:
            row.totalChecks > 0
              ? Math.round((row.healthyChecks / row.totalChecks) * 10000) / 100
              : 0,
          errorRate:
            row.totalChecks > 0
              ? Math.round(((row.totalChecks - row.healthyChecks) / row.totalChecks) * 10000) / 100
              : 0,
          avgResponseTime: row.avgResponseTime !== null ? Math.round(row.avgResponseTime) : null,
        }))

        return { period: label, services }
      })
    )

    // Build a global summary from the 24h period
    const last24h = periodResults.find(p => p.period === '24h')
    const globalTotalChecks = last24h
      ? last24h.services.reduce((sum, s) => sum + s.totalChecks, 0)
      : 0
    const globalHealthyChecks = last24h
      ? last24h.services.reduce((sum, s) => sum + s.healthyChecks, 0)
      : 0

    sendSuccess(res, {
      generatedAt: new Date().toISOString(),
      summary: {
        period: '24h',
        totalChecks: globalTotalChecks,
        overallUptimePercent:
          globalTotalChecks > 0
            ? Math.round((globalHealthyChecks / globalTotalChecks) * 10000) / 100
            : 0,
        servicesMonitored: last24h ? last24h.services.length : 0,
      },
      periods: periodResults,
    })
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to compute metrics')
  }
}

router.get('/', getRootMetricsHandler)

export default router as ReturnType<typeof Router>
