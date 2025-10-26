import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { setupTestDatabase, cleanDatabase } from '@ezstart/test-utils'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Model } from 'mongoose'
import type { IHealthCheck } from '../../models/HealthCheck.js'

describe('HealthCheck Model', () => {
  let HealthCheckModel: Model<IHealthCheck>

  beforeAll(async () => {
    await setupTestDatabase()
    HealthCheckModel = await getHealthCheckModel()

    // Drop existing indexes and recreate them
    try {
      await HealthCheckModel.collection.dropIndexes()
    } catch (error) {
      // Ignore if collection doesn't exist
    }
    await HealthCheckModel.createIndexes()
  })

  beforeEach(async () => {
    // Clean using the model's connection (not global mongoose.connection)
    await HealthCheckModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a health check with all required fields', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 150,
        timestamp: new Date(),
      })

      expect(healthCheck.serviceId).toBe('ezauth-api')
      expect(healthCheck.status).toBe('healthy')
      expect(healthCheck.responseTime).toBe(150)
      expect(healthCheck.timestamp).toBeInstanceOf(Date)
    })

    it('should require serviceId field', async () => {
      const healthCheck = new HealthCheckModel({
        status: 'healthy',
        timestamp: new Date(),
      })

      await expect(healthCheck.validate()).rejects.toThrow()
    })

    it('should require status field', async () => {
      const healthCheck = new HealthCheckModel({
        serviceId: 'ezauth-api',
        timestamp: new Date(),
      })

      await expect(healthCheck.validate()).rejects.toThrow()
    })

    it('should validate status enum (healthy, unhealthy)', async () => {
      const invalidHealthCheck = new HealthCheckModel({
        serviceId: 'ezauth-api',
        status: 'invalid-status',
        timestamp: new Date(),
      })

      await expect(invalidHealthCheck.validate()).rejects.toThrow()
    })

    it('should allow "healthy" status', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: new Date(),
      })

      expect(healthCheck.status).toBe('healthy')
    })

    it('should allow "unhealthy" status', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Service unavailable',
      })

      expect(healthCheck.status).toBe('unhealthy')
      expect(healthCheck.error).toBe('Service unavailable')
    })
  })

  describe('Default Values', () => {
    it('should set default timestamp to current date', async () => {
      const before = Date.now()
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
      })
      const after = Date.now()

      const timestamp = healthCheck.timestamp.getTime()
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('should set responseTime to null by default', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
      })

      expect(healthCheck.responseTime).toBeNull()
    })

    it('should set error to null by default', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
      })

      expect(healthCheck.error).toBeNull()
    })
  })

  describe('Optional Fields', () => {
    it('should store responseTime when provided', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 250,
      })

      expect(healthCheck.responseTime).toBe(250)
    })

    it('should store error message for unhealthy services', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'unhealthy',
        error: 'Connection timeout',
      })

      expect(healthCheck.error).toBe('Connection timeout')
    })

    it('should store metadata with statusCode and statusText', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'unhealthy',
        metadata: {
          statusCode: 500,
          statusText: 'Internal Server Error',
        },
      })

      expect(healthCheck.metadata?.statusCode).toBe(500)
      expect(healthCheck.metadata?.statusText).toBe('Internal Server Error')
    })

    it('should store partial metadata (statusCode only)', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'unhealthy',
        metadata: {
          statusCode: 404,
        },
      })

      expect(healthCheck.metadata?.statusCode).toBe(404)
      expect(healthCheck.metadata?.statusText).toBeUndefined()
    })
  })

  describe('CRUD Operations', () => {
    it('should create a new health check', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezbill-api',
        status: 'healthy',
        responseTime: 100,
      })

      expect(healthCheck._id).toBeDefined()
      expect(healthCheck.serviceId).toBe('ezbill-api')
    })

    it('should find health check by serviceId', async () => {
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 120,
      })

      const found = await HealthCheckModel.findOne({ serviceId: 'ezauth-api' })

      // @ts-expect-error - Mongoose type inference issue
      expect(found).toBeDefined()
      // @ts-expect-error - Mongoose type inference issue
      expect(found.serviceId).toBe('ezauth-api')
    })

    it('should find all health checks for a service', async () => {
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: new Date('2025-01-01'),
      })
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'unhealthy',
        timestamp: new Date('2025-01-02'),
      })
      await HealthCheckModel.create({
        serviceId: 'ezbill-api',
        status: 'healthy',
        timestamp: new Date('2025-01-01'),
      })

      const checks = await HealthCheckModel.find({ serviceId: 'ezauth-api' })

      expect(checks).toHaveLength(2)
    })

    it('should update health check status', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
      })

      healthCheck.status = 'unhealthy'
      healthCheck.error = 'Connection lost'
      await healthCheck.save()

      const updated = await HealthCheckModel.findById(healthCheck._id)

      // @ts-expect-error - Mongoose type inference issue
      expect(updated?.status).toBe('unhealthy')
      // @ts-expect-error - Mongoose type inference issue
      expect(updated?.error).toBe('Connection lost')
    })

    it('should delete health check', async () => {
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
      })

      await HealthCheckModel.deleteOne({ _id: healthCheck._id })

      const found = await HealthCheckModel.findById(healthCheck._id)
      expect(found).toBeNull()
    })
  })

  describe('Queries', () => {
    beforeEach(async () => {
      // Create test data
      const services = ['ezauth-api', 'ezbill-api', 'tower-defense-api']
      const statuses: Array<'healthy' | 'unhealthy'> = ['healthy', 'unhealthy']

      for (const service of services) {
        for (const status of statuses) {
          await HealthCheckModel.create({
            serviceId: service,
            status,
            responseTime: Math.floor(Math.random() * 500),
            timestamp: new Date(),
          })
        }
      }
    })

    it('should find all healthy services', async () => {
      const healthy = await HealthCheckModel.find({ status: 'healthy' })

      expect(healthy.length).toBeGreaterThan(0)
      healthy.forEach(check => {
        expect(check.status).toBe('healthy')
      })
    })

    it('should find all unhealthy services', async () => {
      const unhealthy = await HealthCheckModel.find({ status: 'unhealthy' })

      expect(unhealthy.length).toBeGreaterThan(0)
      unhealthy.forEach(check => {
        expect(check.status).toBe('unhealthy')
      })
    })

    it('should find recent checks sorted by timestamp (descending)', async () => {
      const checks = await HealthCheckModel.find({ serviceId: 'ezauth-api' }).sort({
        timestamp: -1,
      })

      expect(checks).toHaveLength(2)
      if (checks.length >= 2) {
        expect(checks[0].timestamp.getTime()).toBeGreaterThanOrEqual(
          checks[1].timestamp.getTime()
        )
      }
    })

    it('should find checks with response time above threshold', async () => {
      await HealthCheckModel.create({
        serviceId: 'slow-api',
        status: 'healthy',
        responseTime: 1000,
      })

      const slowChecks = await HealthCheckModel.find({ responseTime: { $gt: 500 } })

      expect(slowChecks.length).toBeGreaterThan(0)
      slowChecks.forEach(check => {
        expect(check.responseTime).toBeGreaterThan(500)
      })
    })

    it('should count checks by service', async () => {
      const count = await HealthCheckModel.countDocuments({ serviceId: 'ezauth-api' })

      expect(count).toBeGreaterThan(0)
    })
  })

  describe('Compound Index (serviceId + timestamp)', () => {
    it('should efficiently query by serviceId and sort by timestamp', async () => {
      const timestamps = [
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T11:00:00Z'),
        new Date('2025-01-01T12:00:00Z'),
      ]

      for (const timestamp of timestamps) {
        await HealthCheckModel.create({
          serviceId: 'ezauth-api',
          status: 'healthy',
          timestamp,
        })
      }

      const checks = await HealthCheckModel.find({ serviceId: 'ezauth-api' })
        .sort({ timestamp: -1 })
        .limit(2)

      expect(checks).toHaveLength(2)
      expect(checks[0].timestamp.getTime()).toBeGreaterThan(checks[1].timestamp.getTime())
    })
  })

  describe('Timestamps', () => {
    it('should store custom timestamp', async () => {
      const customTimestamp = new Date('2025-01-15T14:30:00Z')
      const healthCheck = await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: customTimestamp,
      })

      expect(healthCheck.timestamp.toISOString()).toBe(customTimestamp.toISOString())
    })

    it('should allow querying by timestamp range', async () => {
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: new Date('2025-01-01'),
      })
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: new Date('2025-01-15'),
      })
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        timestamp: new Date('2025-01-31'),
      })

      const checks = await HealthCheckModel.find({
        timestamp: {
          $gte: new Date('2025-01-10'),
          $lte: new Date('2025-01-20'),
        },
      })

      expect(checks).toHaveLength(1)
      expect(checks[0].timestamp.getDate()).toBe(15)
    })
  })

  describe('Real-world Monitoring Scenarios', () => {
    it('should track service health over time', async () => {
      const service = 'ezauth-api'
      const checks = [
        { status: 'healthy' as const, responseTime: 100, timestamp: new Date('2025-01-01T00:00:00Z') },
        { status: 'healthy' as const, responseTime: 120, timestamp: new Date('2025-01-01T01:00:00Z') },
        { status: 'unhealthy' as const, responseTime: null, error: 'Timeout', timestamp: new Date('2025-01-01T02:00:00Z') },
        { status: 'healthy' as const, responseTime: 150, timestamp: new Date('2025-01-01T03:00:00Z') },
      ]

      for (const check of checks) {
        await HealthCheckModel.create({
          serviceId: service,
          ...check,
        })
      }

      const history = await HealthCheckModel.find({ serviceId: service }).sort({ timestamp: 1 })

      expect(history).toHaveLength(4)
      expect(history[2].status).toBe('unhealthy')
      expect(history[2].error).toBe('Timeout')
    })

    it('should calculate average response time for healthy services', async () => {
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 100,
      })
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 200,
      })
      await HealthCheckModel.create({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: 300,
      })

      const checks = await HealthCheckModel.find({
        serviceId: 'ezauth-api',
        status: 'healthy',
        responseTime: { $ne: null },
      })

      const avgResponseTime =
        checks.reduce((sum, check) => sum + (check.responseTime || 0), 0) / checks.length

      expect(avgResponseTime).toBe(200)
    })

    it('should identify services with consecutive failures', async () => {
      const service = 'problematic-api'
      for (let i = 0; i < 5; i++) {
        await HealthCheckModel.create({
          serviceId: service,
          status: 'unhealthy',
          error: 'Connection refused',
          timestamp: new Date(Date.now() + i * 60000), // 1 minute apart
        })
      }

      const failures = await HealthCheckModel.find({
        serviceId: service,
        status: 'unhealthy',
      }).sort({ timestamp: -1 })

      expect(failures).toHaveLength(5)
      expect(failures.every(f => f.status === 'unhealthy')).toBe(true)
    })

    it('should support monitoring multiple services simultaneously', async () => {
      const services = ['ezauth-api', 'ezbill-api', 'tower-defense-api']

      for (const service of services) {
        await HealthCheckModel.create({
          serviceId: service,
          status: 'healthy',
          responseTime: 100,
        })
      }

      const allServices = await HealthCheckModel.distinct('serviceId')

      expect(allServices).toHaveLength(services.length)
      services.forEach(service => {
        expect(allServices).toContain(service)
      })
    })
  })
})
