import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import type { AddressInfo } from 'net'
import { setupTestDatabase } from '@ezstart/test-utils'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import aggregateRouter from '../../routes/history/aggregate.js'
import type { AggregateResponse } from '../../routes/history/aggregate.js'
import type { Model } from 'mongoose'
import type { IHealthCheck } from '../../models/HealthCheck.js'

interface EnvelopeOk<T> {
  success: true
  data: T
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return (await res.json()) as T
}

describe('GET /history/aggregate', () => {
  let HealthCheckModel: Model<IHealthCheck>
  let app: Express
  let baseUrl: string
  let server: ReturnType<Express['listen']>

  beforeAll(async () => {
    await setupTestDatabase()
    HealthCheckModel = await getHealthCheckModel()

    try {
      await HealthCheckModel.collection.dropIndexes()
    } catch {
      // ignore
    }
    await HealthCheckModel.createIndexes()

    app = express()
    app.use('/history', aggregateRouter)

    await new Promise<void>(resolve => {
      server = app.listen(0, () => resolve())
    })
    const addr = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  beforeEach(async () => {
    await HealthCheckModel.deleteMany({})
  })

  it('returns empty buckets and services when no data exists', async () => {
    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=7d`
    )

    expect(body.success).toBe(true)
    expect(body.data.period).toBe('7d')
    expect(body.data.bucketUnit).toBe('hour')
    expect(body.data.buckets).toEqual([])
    expect(body.data.services).toEqual([])
  })

  it('aggregates buckets hourly for period=7d with correct p95 and uptime', async () => {
    const base = new Date()
    base.setUTCMinutes(0, 0, 0)

    const samples: IHealthCheck[] = []
    // Bucket A: 3 healthy (100,200,300), 1 unhealthy → uptime 75%, p95 = 300
    for (const rt of [100, 200, 300]) {
      samples.push({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: rt,
        timestamp: new Date(base.getTime() + 5_000 * samples.length),
      })
    }
    samples.push({
      serviceId: 'ezauth-api',
      status: 'unhealthy',
      responseTime: null,
      timestamp: new Date(base.getTime() + 5_000 * samples.length),
    })

    // Bucket B: 1 hour later, 2 healthy, 0 unhealthy
    const bucketB = new Date(base.getTime() + 60 * 60 * 1000)
    for (const rt of [50, 150]) {
      samples.push({
        serviceId: 'ezpay-api',
        status: 'healthy',
        responseTime: rt,
        timestamp: new Date(bucketB.getTime() + 2_000 * samples.length),
      })
    }

    await HealthCheckModel.insertMany(samples)

    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=7d`
    )

    expect(body.success).toBe(true)
    expect(body.data.buckets.length).toBeGreaterThanOrEqual(2)

    const firstBucket = body.data.buckets[0]
    expect(firstBucket).toBeDefined()
    if (!firstBucket) throw new Error('missing first bucket')
    expect(firstBucket.totalChecks).toBe(4)
    expect(firstBucket.healthyChecks).toBe(3)
    expect(firstBucket.unhealthyChecks).toBe(1)
    expect(firstBucket.uptimePercent).toBe(75)
    expect(firstBucket.p95).toBe(300)

    const secondBucket = body.data.buckets[1]
    expect(secondBucket).toBeDefined()
    if (!secondBucket) throw new Error('missing second bucket')
    expect(secondBucket.totalChecks).toBe(2)
    expect(secondBucket.uptimePercent).toBe(100)
    expect(secondBucket.p95).toBe(150)
  })

  it('computes per-service error rates across the whole period', async () => {
    const base = new Date()

    await HealthCheckModel.insertMany([
      { serviceId: 'ezauth-api', status: 'healthy', responseTime: 100, timestamp: base },
      { serviceId: 'ezauth-api', status: 'unhealthy', responseTime: null, timestamp: base },
      { serviceId: 'ezpay-api', status: 'healthy', responseTime: 50, timestamp: base },
      { serviceId: 'ezpay-api', status: 'healthy', responseTime: 60, timestamp: base },
      { serviceId: 'ezpay-api', status: 'healthy', responseTime: 70, timestamp: base },
    ])

    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=7d`
    )

    expect(body.data.services).toHaveLength(2)
    const ezauth = body.data.services.find(s => s.serviceId === 'ezauth-api')
    const ezpay = body.data.services.find(s => s.serviceId === 'ezpay-api')
    expect(ezauth?.errorRate).toBe(50)
    expect(ezauth?.errorCount).toBe(1)
    expect(ezpay?.errorRate).toBe(0)
    expect(ezpay?.totalChecks).toBe(3)
  })

  it('uses daily bucket unit for period=30d', async () => {
    const now = new Date()

    await HealthCheckModel.insertMany([
      { serviceId: 'ezauth-api', status: 'healthy', responseTime: 100, timestamp: now },
    ])

    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=30d`
    )

    expect(body.success).toBe(true)
    expect(body.data.period).toBe('30d')
    expect(body.data.bucketUnit).toBe('day')
  })

  it('filters by service query param', async () => {
    const now = new Date()

    await HealthCheckModel.insertMany([
      { serviceId: 'ezauth-api', status: 'healthy', responseTime: 100, timestamp: now },
      { serviceId: 'ezpay-api', status: 'unhealthy', responseTime: null, timestamp: now },
    ])

    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=7d&service=ezauth-api`
    )

    expect(body.data.services).toHaveLength(1)
    expect(body.data.services[0]?.serviceId).toBe('ezauth-api')
    expect(body.data.services[0]?.errorRate).toBe(0)
  })

  it('rejects invalid period', async () => {
    const res = await fetch(`${baseUrl}/history/aggregate?period=invalid`)
    expect(res.status).toBe(400)
  })

  it('excludes samples older than the period cutoff', async () => {
    const now = new Date()
    const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago

    await HealthCheckModel.insertMany([
      { serviceId: 'ezauth-api', status: 'healthy', responseTime: 100, timestamp: oldDate },
      { serviceId: 'ezauth-api', status: 'healthy', responseTime: 200, timestamp: now },
    ])

    const body = await fetchJson<EnvelopeOk<AggregateResponse>>(
      `${baseUrl}/history/aggregate?period=7d`
    )

    const totalChecks = body.data.buckets.reduce((sum, b) => sum + b.totalChecks, 0)
    expect(totalChecks).toBe(1)
  })
})
