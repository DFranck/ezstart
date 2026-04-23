/**
 * GET /api/history/aggregate
 *
 * Aggregated health-check metrics for charting on /monitoring/health.
 *
 * Returns time-bucketed latency p95, uptime %, and per-service error rate
 * over a given period (7d or 30d).
 *
 * Query params:
 * - period: '7d' | '30d' (default '7d')
 * - service: optional service id filter (e.g. 'ezauth-api')
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const aggregateQuerySchema = z.object({
  period: z.enum(['7d', '30d']).default('7d').describe('Time window for aggregation'),
  service: z.string().optional().describe('Optional service id filter'),
})

export interface AggregateBucket {
  timestamp: string
  p95: number | null
  uptimePercent: number
  totalChecks: number
  healthyChecks: number
  unhealthyChecks: number
}

export interface AggregateServiceStats {
  serviceId: string
  totalChecks: number
  errorCount: number
  errorRate: number
}

export interface AggregateResponse {
  period: '7d' | '30d'
  bucketUnit: 'hour' | 'day'
  buckets: AggregateBucket[]
  services: AggregateServiceStats[]
}

const PERIOD_HOURS: Record<'7d' | '30d', number> = {
  '7d': 24 * 7,
  '30d': 24 * 30,
}

/**
 * Returns ISO timestamp of the bucket start for the given sample.
 * - '7d' → hourly buckets (UTC hour floor)
 * - '30d' → daily buckets (UTC day floor)
 */
function bucketStart(ts: Date, unit: 'hour' | 'day'): Date {
  const d = new Date(ts)
  d.setUTCMinutes(0, 0, 0)
  if (unit === 'day') {
    d.setUTCHours(0, 0, 0, 0)
  }
  return d
}

/**
 * Nearest-rank percentile on a sorted ascending array of numbers.
 * Returns null for empty input.
 */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const rank = Math.ceil((p / 100) * sorted.length) - 1
  const index = Math.max(0, Math.min(rank, sorted.length - 1))
  const value = sorted[index]
  return typeof value === 'number' ? value : null
}

export const router: ReturnType<typeof Router> = Router()

const getAggregateHandler = async (req: Request, res: Response) => {
  try {
    const parsed = aggregateQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 'Invalid query parameters', 400)
    }
    const { period, service } = parsed.data

    const hours = PERIOD_HOURS[period]
    const bucketUnit: 'hour' | 'day' = period === '7d' ? 'hour' : 'day'
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    const HealthCheck = await getHealthCheckModel()

    const filter: Record<string, unknown> = { timestamp: { $gte: cutoffTime } }
    if (service) filter.serviceId = service

    const docs = (await HealthCheck.find(filter)
      .sort({ timestamp: 1 })
      .select('serviceId status responseTime timestamp')
      .lean()
      .exec()) as Array<{
      serviceId: string
      status: 'healthy' | 'unhealthy'
      responseTime: number | null
      timestamp: Date
    }>

    // Time-bucket aggregation
    const bucketsMap = new Map<
      string,
      {
        timestamp: string
        responseTimes: number[]
        totalChecks: number
        healthyChecks: number
        unhealthyChecks: number
      }
    >()

    // Per-service aggregation
    const serviceMap = new Map<string, { totalChecks: number; errorCount: number }>()

    for (const doc of docs) {
      const bStart = bucketStart(new Date(doc.timestamp), bucketUnit)
      const key = bStart.toISOString()

      let bucket = bucketsMap.get(key)
      if (!bucket) {
        bucket = {
          timestamp: key,
          responseTimes: [],
          totalChecks: 0,
          healthyChecks: 0,
          unhealthyChecks: 0,
        }
        bucketsMap.set(key, bucket)
      }
      bucket.totalChecks += 1
      if (doc.status === 'healthy') {
        bucket.healthyChecks += 1
        if (typeof doc.responseTime === 'number') {
          bucket.responseTimes.push(doc.responseTime)
        }
      } else {
        bucket.unhealthyChecks += 1
      }

      let svc = serviceMap.get(doc.serviceId)
      if (!svc) {
        svc = { totalChecks: 0, errorCount: 0 }
        serviceMap.set(doc.serviceId, svc)
      }
      svc.totalChecks += 1
      if (doc.status !== 'healthy') svc.errorCount += 1
    }

    const buckets: AggregateBucket[] = Array.from(bucketsMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(b => {
        const sorted = [...b.responseTimes].sort((a, b) => a - b)
        const p95 = percentile(sorted, 95)
        const uptimePercent =
          b.totalChecks > 0 ? Number(((b.healthyChecks / b.totalChecks) * 100).toFixed(2)) : 0
        return {
          timestamp: b.timestamp,
          p95: p95 !== null ? Math.round(p95) : null,
          uptimePercent,
          totalChecks: b.totalChecks,
          healthyChecks: b.healthyChecks,
          unhealthyChecks: b.unhealthyChecks,
        }
      })

    const services: AggregateServiceStats[] = Array.from(serviceMap.entries())
      .map(([serviceId, stats]) => ({
        serviceId,
        totalChecks: stats.totalChecks,
        errorCount: stats.errorCount,
        errorRate:
          stats.totalChecks > 0
            ? Number(((stats.errorCount / stats.totalChecks) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.errorRate - a.errorRate || a.serviceId.localeCompare(b.serviceId))

    const payload: AggregateResponse = {
      period,
      bucketUnit,
      buckets,
      services,
    }

    sendSuccess(res, payload)
  } catch (error) {
    logger.error('[History] Error aggregating health history:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to aggregate history')
  }
}

router.get('/aggregate', getAggregateHandler)

export default router as ReturnType<typeof Router>
