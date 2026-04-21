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
    it('should create a valid plan with required fields (applicationId + core)', async () => {
      const plan = await PlanModel.create({
        name: 'Pro',
        applicationId: 'app-ezbill',
        appName: 'ezbill',
        amount: 9.99,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
      })

      expect(plan.name).toBe('Pro')
      expect(plan.applicationId).toBe('app-ezbill')
      expect(plan.appName).toBe('ezbill')
      expect(plan.amount).toBe(9.99)
      expect(plan.currency).toBe('EUR')
      expect(plan.interval).toBe('month')
      expect(plan.intervalCount).toBe(1)
      expect(plan.active).toBe(true)
      expect(plan.sortOrder).toBe(0)
    })

    it('should allow plans without appName (post-migration state)', async () => {
      const plan = await PlanModel.create({
        name: 'Post-migration',
        applicationId: 'app-any',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })
      expect(plan.applicationId).toBe('app-any')
      expect(plan.appName).toBeUndefined()
    })

    it('should require name field', async () => {
      await expect(
        PlanModel.create({
          applicationId: 'app-1',
          amount: 9.99,
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should require applicationId field', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          appName: 'ezbill',
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
          applicationId: 'app-1',
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should validate interval enum', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          applicationId: 'app-1',
          amount: 9.99,
          interval: 'week',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should reject negative amounts', async () => {
      await expect(
        PlanModel.create({
          name: 'Pro',
          applicationId: 'app-1',
          amount: -5,
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow()
    })

    it('should allow zero amount (free plan)', async () => {
      const plan = await PlanModel.create({
        name: 'Free',
        applicationId: 'app-1',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })
      expect(plan.amount).toBe(0)
    })
  })

  describe('Metadata sub-schema', () => {
    it('should store grantsRoles, grantsFeatures and feePercent', async () => {
      const plan = await PlanModel.create({
        name: 'Metadata',
        applicationId: 'app-1',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
        metadata: {
          grantsRoles: ['admin'],
          grantsFeatures: ['export-csv'],
          feePercent: 2.5,
        },
      })

      expect(plan.metadata?.grantsRoles).toEqual(['admin'])
      expect(plan.metadata?.grantsFeatures).toEqual(['export-csv'])
      expect(plan.metadata?.feePercent).toBe(2.5)
    })

    it('should reject feePercent outside 0..100', async () => {
      await expect(
        PlanModel.create({
          name: 'Bad',
          applicationId: 'app-1',
          amount: 0,
          interval: 'month',
          intervalCount: 1,
          metadata: { feePercent: 150 },
        })
      ).rejects.toThrow()
    })
  })

  describe('Stripe linkage', () => {
    it('should store stripeProductId + stripePriceId', async () => {
      const plan = await PlanModel.create({
        name: 'Pro',
        applicationId: 'app-1',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        stripeProductId: 'prod_abc',
        stripePriceId: 'price_abc',
      })

      expect(plan.stripeProductId).toBe('prod_abc')
      expect(plan.stripePriceId).toBe('price_abc')
    })
  })

  describe('Soft Delete', () => {
    it('should soft-delete by setting deletedAt', async () => {
      const plan = await PlanModel.create({
        name: 'Old Plan',
        applicationId: 'app-1',
        amount: 5,
        interval: 'month',
        intervalCount: 1,
      })

      await PlanModel.findByIdAndUpdate(plan._id, {
        active: false,
        deletedAt: new Date(),
      })

      const deleted = await PlanModel.findById(plan._id)
      expect(deleted?.active).toBe(false)
      expect(deleted?.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('Queries', () => {
    it('should find plans by applicationId', async () => {
      await PlanModel.create({
        name: 'Free',
        applicationId: 'app-ezbill',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })
      await PlanModel.create({
        name: 'Pro',
        applicationId: 'app-ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
      })
      await PlanModel.create({
        name: 'Free',
        applicationId: 'app-green-pulse',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
      })

      const ezbillPlans = await PlanModel.find({ applicationId: 'app-ezbill' })
      expect(ezbillPlans).toHaveLength(2)
    })

    it('should sort by sortOrder', async () => {
      await PlanModel.create({
        name: 'Enterprise',
        applicationId: 'app-1',
        amount: 49.99,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 3,
      })
      await PlanModel.create({
        name: 'Free',
        applicationId: 'app-1',
        amount: 0,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 1,
      })
      await PlanModel.create({
        name: 'Pro',
        applicationId: 'app-1',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        sortOrder: 2,
      })

      const sorted = await PlanModel.find({ applicationId: 'app-1' }).sort({ sortOrder: 1 })
      expect(sorted[0]!.name).toBe('Free')
      expect(sorted[1]!.name).toBe('Pro')
      expect(sorted[2]!.name).toBe('Enterprise')
    })
  })
})
