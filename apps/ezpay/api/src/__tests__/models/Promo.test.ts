import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPromoModel, type PromoDocument } from '../../models/Promo.js'
import type { Model } from 'mongoose'

describe('Promo Model', () => {
  let PromoModel: Model<PromoDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PromoModel = await getPromoModel()
    try {
      await PromoModel.collection.dropIndexes()
    } catch {
      // Ignore if collection doesn't exist yet
    }
    await PromoModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PromoModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid promo with required fields', async () => {
      const promo = await PromoModel.create({
        code: 'SUMMER20',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
      })

      expect(promo.code).toBe('SUMMER20')
      expect(promo.appName).toBe('ezbill')
      expect(promo.discountType).toBe('percent')
      expect(promo.discountValue).toBe(20)
      expect(promo.duration).toBe('once')
      expect(promo.usedCount).toBe(0)
      expect(promo.active).toBe(true)
      expect(promo.deletedAt).toBeNull()
    })

    it('should require code field', async () => {
      await expect(
        PromoModel.create({
          appName: 'ezbill',
          discountType: 'percent',
          discountValue: 20,
          duration: 'once',
        })
      ).rejects.toThrow()
    })

    it('should require appName field', async () => {
      await expect(
        PromoModel.create({
          code: 'TEST10',
          discountType: 'percent',
          discountValue: 10,
          duration: 'once',
        })
      ).rejects.toThrow()
    })

    it('should require discountType field', async () => {
      await expect(
        PromoModel.create({
          code: 'TEST10',
          appName: 'ezbill',
          discountValue: 10,
          duration: 'once',
        })
      ).rejects.toThrow()
    })

    it('should validate discountType enum', async () => {
      await expect(
        PromoModel.create({
          code: 'TEST10',
          appName: 'ezbill',
          discountType: 'invalid',
          discountValue: 10,
          duration: 'once',
        })
      ).rejects.toThrow()
    })

    it('should validate duration enum', async () => {
      await expect(
        PromoModel.create({
          code: 'TEST10',
          appName: 'ezbill',
          discountType: 'percent',
          discountValue: 10,
          duration: 'invalid',
        })
      ).rejects.toThrow()
    })

    it('should accept all valid duration values', async () => {
      for (const duration of ['once', 'repeating', 'forever']) {
        await PromoModel.deleteMany({})
        const promo = await PromoModel.create({
          code: `DUR_${duration.toUpperCase()}`,
          appName: 'ezbill',
          discountType: 'percent',
          discountValue: 10,
          duration,
        })
        expect(promo.duration).toBe(duration)
      }
    })

    it('should store fixed discount with currency', async () => {
      const promo = await PromoModel.create({
        code: 'FLAT5',
        appName: 'ezbill',
        discountType: 'fixed',
        discountValue: 500,
        currency: 'EUR',
        duration: 'once',
      })

      expect(promo.discountType).toBe('fixed')
      expect(promo.discountValue).toBe(500)
      expect(promo.currency).toBe('EUR')
    })
  })

  describe('Usage Limits', () => {
    it('should store maxUses', async () => {
      const promo = await PromoModel.create({
        code: 'LIMITED100',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 15,
        duration: 'once',
        maxUses: 100,
      })

      expect(promo.maxUses).toBe(100)
      expect(promo.usedCount).toBe(0)
    })

    it('should increment usedCount', async () => {
      const promo = await PromoModel.create({
        code: 'USAGE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        maxUses: 5,
      })

      await PromoModel.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } })
      const updated = await PromoModel.findById(promo._id)
      expect(updated?.usedCount).toBe(1)
    })

    it('should allow unlimited uses when maxUses is not set', async () => {
      const promo = await PromoModel.create({
        code: 'UNLIMITED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'forever',
      })

      expect(promo.maxUses).toBeUndefined()
    })
  })

  describe('Expiration', () => {
    it('should store expiresAt date', async () => {
      const futureDate = new Date('2030-01-01')
      const promo = await PromoModel.create({
        code: 'EXPIRING',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        expiresAt: futureDate,
      })

      expect(promo.expiresAt).toBeInstanceOf(Date)
      expect(promo.expiresAt!.getTime()).toBe(futureDate.getTime())
    })

    it('should allow promos without expiration', async () => {
      const promo = await PromoModel.create({
        code: 'NOEXPIRY',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'forever',
      })

      expect(promo.expiresAt).toBeUndefined()
    })
  })

  describe('Unique Constraints', () => {
    it('should enforce unique code+appName compound index', async () => {
      await PromoModel.create({
        code: 'UNIQUE1',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      await expect(
        PromoModel.create({
          code: 'UNIQUE1',
          appName: 'ezbill',
          discountType: 'fixed',
          discountValue: 500,
          duration: 'once',
        })
      ).rejects.toThrow()
    })

    it('should allow same code for different apps', async () => {
      await PromoModel.create({
        code: 'SHARED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      const promo2 = await PromoModel.create({
        code: 'SHARED',
        appName: 'green-pulse',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
      })

      expect(promo2.appName).toBe('green-pulse')
    })
  })

  describe('Soft Delete', () => {
    it('should soft-delete by setting deletedAt and active=false', async () => {
      const promo = await PromoModel.create({
        code: 'TODELETE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      const now = new Date()
      await PromoModel.findByIdAndUpdate(promo._id, {
        active: false,
        deletedAt: now,
      })

      const deleted = await PromoModel.findById(promo._id)
      expect(deleted?.active).toBe(false)
      expect(deleted?.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('Targeting', () => {
    it('should store targetPlanId', async () => {
      const promo = await PromoModel.create({
        code: 'PLANONLY',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 50,
        duration: 'once',
        targetPlanId: 'plan_abc123',
      })

      expect(promo.targetPlanId).toBe('plan_abc123')
    })

    it('should store targetUserId', async () => {
      const promo = await PromoModel.create({
        code: 'USERONLY',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 100,
        duration: 'once',
        targetUserId: 'user_abc123',
      })

      expect(promo.targetUserId).toBe('user_abc123')
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const promo = await PromoModel.create({
        code: 'TIMESTAMPS',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      expect(promo.createdAt).toBeInstanceOf(Date)
      expect(promo.updatedAt).toBeInstanceOf(Date)
    })
  })
})
