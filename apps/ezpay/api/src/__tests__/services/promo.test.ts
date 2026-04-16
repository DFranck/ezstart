import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPromoModel, type PromoDocument } from '../../models/Promo.js'
import { validatePromo, calculateDiscount, incrementUsage } from '../../services/promo.js'
import type { Model } from 'mongoose'

describe('Promo Service', () => {
  let PromoModel: Model<PromoDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PromoModel = await getPromoModel()
    try {
      await PromoModel.collection.dropIndexes()
    } catch {
      // Ignore
    }
    await PromoModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PromoModel.deleteMany({})
  })

  describe('validatePromo', () => {
    it('should return valid for an active promo code', async () => {
      await PromoModel.create({
        code: 'VALID20',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
        active: true,
      })

      const result = await validatePromo('VALID20', 'ezbill')
      expect(result.valid).toBe(true)
      expect(result.promo).toBeDefined()
      expect(result.promo?.code).toBe('VALID20')
    })

    it('should be case-insensitive for code lookup', async () => {
      await PromoModel.create({
        code: 'CASELESS',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })

      const result = await validatePromo('caseless', 'ezbill')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for non-existent code', async () => {
      const result = await validatePromo('NONEXISTENT', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code not found')
    })

    it('should return invalid for wrong app', async () => {
      await PromoModel.create({
        code: 'APPONLY',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })

      const result = await validatePromo('APPONLY', 'green-pulse')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code not found')
    })

    it('should return invalid for inactive promo', async () => {
      await PromoModel.create({
        code: 'INACTIVE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: false,
      })

      const result = await validatePromo('INACTIVE', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code is no longer active')
    })

    it('should return invalid for expired promo', async () => {
      await PromoModel.create({
        code: 'EXPIRED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        expiresAt: new Date('2020-01-01'),
      })

      const result = await validatePromo('EXPIRED', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code has expired')
    })

    it('should return valid for non-expired promo', async () => {
      await PromoModel.create({
        code: 'FUTURE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        expiresAt: new Date('2030-12-31'),
      })

      const result = await validatePromo('FUTURE', 'ezbill')
      expect(result.valid).toBe(true)
    })

    it('should return invalid when usage limit reached', async () => {
      await PromoModel.create({
        code: 'MAXED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        maxUses: 5,
        usedCount: 5,
      })

      const result = await validatePromo('MAXED', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code usage limit reached')
    })

    it('should return valid when usage count is below limit', async () => {
      await PromoModel.create({
        code: 'REMAINING',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        maxUses: 10,
        usedCount: 9,
      })

      const result = await validatePromo('REMAINING', 'ezbill')
      expect(result.valid).toBe(true)
    })

    it('should return valid when no usage limit is set', async () => {
      await PromoModel.create({
        code: 'UNLIMITED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'forever',
        active: true,
        usedCount: 999,
      })

      const result = await validatePromo('UNLIMITED', 'ezbill')
      expect(result.valid).toBe(true)
    })
  })

  describe('calculateDiscount', () => {
    it('should calculate percent discount correctly', () => {
      const promo = {
        discountType: 'percent',
        discountValue: 20,
      } as PromoDocument

      const result = calculateDiscount(100, promo)
      expect(result.originalAmount).toBe(100)
      expect(result.discountApplied).toBe(20)
      expect(result.discountedAmount).toBe(80)
    })

    it('should calculate fixed discount correctly', () => {
      const promo = {
        discountType: 'fixed',
        discountValue: 500,
      } as PromoDocument

      const result = calculateDiscount(2000, promo)
      expect(result.originalAmount).toBe(2000)
      expect(result.discountApplied).toBe(500)
      expect(result.discountedAmount).toBe(1500)
    })

    it('should cap discount at the original amount (never negative)', () => {
      const promo = {
        discountType: 'fixed',
        discountValue: 5000,
      } as PromoDocument

      const result = calculateDiscount(100, promo)
      expect(result.discountApplied).toBe(100)
      expect(result.discountedAmount).toBe(0)
    })

    it('should handle 100% discount', () => {
      const promo = {
        discountType: 'percent',
        discountValue: 100,
      } as PromoDocument

      const result = calculateDiscount(50, promo)
      expect(result.discountApplied).toBe(50)
      expect(result.discountedAmount).toBe(0)
    })

    it('should round percent discount to nearest integer', () => {
      const promo = {
        discountType: 'percent',
        discountValue: 33,
      } as PromoDocument

      const result = calculateDiscount(100, promo)
      expect(result.discountApplied).toBe(33)
      expect(result.discountedAmount).toBe(67)
    })

    it('should handle small amounts with percent discount', () => {
      const promo = {
        discountType: 'percent',
        discountValue: 10,
      } as PromoDocument

      const result = calculateDiscount(1, promo)
      // Math.round(1 * 10/100) = Math.round(0.1) = 0
      expect(result.discountApplied).toBe(0)
      expect(result.discountedAmount).toBe(1)
    })
  })

  describe('incrementUsage', () => {
    it('should increment usedCount by 1', async () => {
      const promo = await PromoModel.create({
        code: 'INCREMENT',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        usedCount: 0,
      })

      await incrementUsage(String(promo._id))

      const updated = await PromoModel.findById(promo._id)
      expect(updated?.usedCount).toBe(1)
    })

    it('should increment from existing count', async () => {
      const promo = await PromoModel.create({
        code: 'MULTI',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        usedCount: 5,
      })

      await incrementUsage(String(promo._id))
      await incrementUsage(String(promo._id))

      const updated = await PromoModel.findById(promo._id)
      expect(updated?.usedCount).toBe(7)
    })
  })
})
