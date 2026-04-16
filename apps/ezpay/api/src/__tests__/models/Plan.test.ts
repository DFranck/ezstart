import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { Model } from 'mongoose'

describe('Plan Model', () => {
  let PlanModel: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PlanModel = await getPlanModel()
    try {
      await PlanModel.collection.dropIndexes()
    } catch {
      // Ignore if collection doesn't exist yet
    }
    await PlanModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PlanModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid plan with required fields', async () => {
      const plan = await PlanModel.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
      })

      expect(plan.name).toBe('Pro')
      expect(plan.appName).toBe('ezbill')
      expect(plan.amount).toBe(9.99)
      expect(plan.currency).toBe('EUR')
      expect(plan.interval).toBe('month')
      expect(plan.intervalCount).toBe(1)
      expect(plan.active).toBe(true)
      expect(plan.sortOrder).toBe(0)
    })

    it('should require name field', async () => {
      await expect(
        PlanModel.create({
          appName: 'ezbill',
          amount: 9.99,
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should require appName field', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          amount: 9.99,
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should require amount field', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          appName: 'ezbill',
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should validate interval enum', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          appName: 'ezbill',
          amount: 9.99,
          interval: 'week',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should accept month and year intervals', async () => {
      for (const interval of ['month', 'year']) {
        await PlanModel.deleteMany({})
        const plan = await PlanModel.create({
          name: `Plan_${interval}`,
          appName: 'ezbill',
          amount: 9.99,
          interval,
          intervalCount: 1,
        })
        expect(plan.interval).toBe(interval)
      }
    })

    it('should reject negative amounts', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          appName: 'ezbill',
          amount: -5,
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should allow zero amount (free plan)', async () => {
      const plan = await PlanModel.create({
        name: 'Free',
        appName: 'ezbill',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })

      expect(plan.amount).toBe(0)
    })
  })

  describe('Features', () => {
    it('should store features array', async () => {
      const plan = await PlanModel.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        features: ['unlimited-invoices', 'custom-branding', 'api-access'],
      })

      expect(plan.features).toHaveLength(3)
      expect(plan.features).toContain('unlimited-invoices')
    })

    it('should allow plans without features', async () => {
      const plan = await PlanModel.create({
        name: 'Basic',
        appName: 'ezbill',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })

      expect(plan.features).toEqual([])
    })
  })

  describe('Soft Delete', () => {
    it('should soft-delete by setting deletedAt', async () => {
      const plan = await PlanModel.create({
        name: 'Old Plan',
        appName: 'ezbill',
        amount: 5,
        interval: 'month',
        intervalCount: 1,
      })

      const now = new Date()
      await PlanModel.findByIdAndUpdate(plan._id, {
        active: false,
        deletedAt: now,
      })

      const deleted = await PlanModel.findById(plan._id)
      expect(deleted?.active).toBe(false)
      expect(deleted?.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('Stripe Integration', () => {
    it('should store stripePriceId', async () => {
      const plan = await PlanModel.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        stripePriceId: 'price_abc123',
      })

      expect(plan.stripePriceId).toBe('price_abc123')
    })
  })

  describe('Queries', () => {
    it('should find plans by appName', async () => {
      await PlanModel.create({
        name: 'Free',
        appName: 'ezbill',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })
      await PlanModel.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
      })
      await PlanModel.create({
        name: 'Free',
        appName: 'green-pulse',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })

      const ezbillPlans = await PlanModel.find({ appName: 'ezbill' })
      expect(ezbillPlans).toHaveLength(2)
    })

    it('should find active plans only', async () => {
      await PlanModel.create({
        name: 'Active',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        active: true,
      })
      await PlanModel.create({
        name: 'Inactive',
        appName: 'ezbill',
        amount: 4.99,
        interval: 'month',
        intervalCount: 1,
        active: false,
      })

      const activePlans = await PlanModel.find({ appName: 'ezbill', active: true })
      expect(activePlans).toHaveLength(1)
      expect(activePlans[0]!.name).toBe('Active')
    })

    it('should sort by sortOrder', async () => {
      await PlanModel.create({
        name: 'Enterprise',
        appName: 'ezbill',
        amount: 49.99,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 3,
      })
      await PlanModel.create({
        name: 'Free',
        appName: 'ezbill',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 1,
      })
      await PlanModel.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 2,
      })

      const sorted = await PlanModel.find({ appName: 'ezbill' }).sort({ sortOrder: 1 })
      expect(sorted[0]!.name).toBe('Free')
      expect(sorted[1]!.name).toBe('Pro')
      expect(sorted[2]!.name).toBe('Enterprise')
    })
  })
})
