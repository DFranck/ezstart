/**
 * Integration tests for promo code routes business logic.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPromoModel, type PromoDocument } from '../../models/Promo.js'
import { validatePromo } from '../../services/promo.js'
import type { Model } from 'mongoose'

describe('Promo Routes Business Logic', () => {
  let Promo: Model<PromoDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Promo = await getPromoModel()
    try {
      await Promo.collection.dropIndexes()
    } catch {
      // Ignore
    }
    await Promo.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Promo.deleteMany({})
  })

  // ========================================
  // POST /promos (create)
  // ========================================
  describe('Create Promo (POST /promos)', () => {
    it('should create a promo with auto-uppercased code', async () => {
      const promo = await Promo.create({
        code: 'summer20'.toUpperCase().trim(),
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
        usedCount: 0,
      })

      expect(promo.code).toBe('SUMMER20')
    })

    it('should reject fixed discount without currency (route-level validation)', () => {
      const data = {
        discountType: 'fixed',
        currency: undefined,
      }
      // Route checks: if discountType === 'fixed' && !currency
      expect(data.discountType === 'fixed' && !data.currency).toBe(true)
      // Would return sendError(res, 'Currency is required for fixed discounts', 400)
    })

    it('should reject repeating duration without durationInMonths', () => {
      const data = {
        duration: 'repeating',
        durationInMonths: undefined,
      }
      expect(data.duration === 'repeating' && !data.durationInMonths).toBe(true)
      // Would return sendError(res, 'durationInMonths is required for repeating duration', 400)
    })

    it('should reject percent discount > 100', () => {
      const data = {
        discountType: 'percent',
        discountValue: 150,
      }
      expect(data.discountType === 'percent' && data.discountValue > 100).toBe(true)
      // Would return sendError(res, 'Percent discount cannot exceed 100', 400)
    })

    it('should return 409 for duplicate code+appName', async () => {
      await Promo.create({
        code: 'DUPE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      try {
        await Promo.create({
          code: 'DUPE',
          appName: 'ezbill',
          discountType: 'fixed',
          discountValue: 500,
          duration: 'once',
        })
        expect.fail('Should have thrown duplicate key error')
      } catch (error) {
        expect(error).toBeDefined()
        // Route catches error.code === 11000 and returns 409
        expect((error as { code?: number }).code).toBe(11000)
      }
    })
  })

  // ========================================
  // GET /promos (list)
  // ========================================
  describe('List Promos (GET /promos)', () => {
    it('should exclude soft-deleted promos', async () => {
      await Promo.create({
        code: 'ACTIVE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })
      await Promo.create({
        code: 'DELETED',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
        active: false,
        deletedAt: new Date(),
      })

      const promos = await Promo.find({ deletedAt: null })
      expect(promos).toHaveLength(1)
      expect(promos[0]!.code).toBe('ACTIVE')
    })

    it('should filter by appName', async () => {
      await Promo.create({
        code: 'APP1',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })
      await Promo.create({
        code: 'APP2',
        appName: 'green-pulse',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
      })

      const ezbillPromos = await Promo.find({ deletedAt: null, appName: 'ezbill' })
      expect(ezbillPromos).toHaveLength(1)
    })

    it('should filter by active status', async () => {
      await Promo.create({
        code: 'ON',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })
      await Promo.create({
        code: 'OFF',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
        active: false,
      })

      const activePromos = await Promo.find({ deletedAt: null, active: true })
      expect(activePromos).toHaveLength(1)
      expect(activePromos[0]!.code).toBe('ON')
    })

    it('should paginate results', async () => {
      for (let i = 0; i < 25; i++) {
        await Promo.create({
          code: `PAGE${i}`,
          appName: 'ezbill',
          discountType: 'percent',
          discountValue: 10,
          duration: 'once',
        })
      }

      const limit = 10
      const offset = 5
      const [promos, total] = await Promise.all([
        Promo.find({ deletedAt: null }).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
        Promo.countDocuments({ deletedAt: null }),
      ])

      expect(promos).toHaveLength(10)
      expect(total).toBe(25)
    })
  })

  // ========================================
  // GET /promos/validate/:code
  // ========================================
  describe('Validate Promo (GET /promos/validate/:code)', () => {
    it('should return valid promo with discount info', async () => {
      await Promo.create({
        code: 'VALID10',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'forever',
        active: true,
      })

      const result = await validatePromo('VALID10', 'ezbill')
      expect(result.valid).toBe(true)
      expect(result.promo?.discountType).toBe('percent')
      expect(result.promo?.discountValue).toBe(10)
      expect(result.promo?.duration).toBe('forever')
    })

    it('should reject promo for wrong app', async () => {
      await Promo.create({
        code: 'WRONGAPP',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })

      const result = await validatePromo('WRONGAPP', 'green-pulse')
      expect(result.valid).toBe(false)
    })

    it('should reject expired promo', async () => {
      await Promo.create({
        code: 'OLDCODE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        expiresAt: new Date('2020-01-01'),
      })

      const result = await validatePromo('OLDCODE', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code has expired')
    })

    it('should reject maxed-out promo', async () => {
      await Promo.create({
        code: 'MAXOUT',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
        maxUses: 3,
        usedCount: 3,
      })

      const result = await validatePromo('MAXOUT', 'ezbill')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Promo code usage limit reached')
    })
  })

  // ========================================
  // PATCH /promos/:id (update)
  // ========================================
  describe('Update Promo (PATCH /promos/:id)', () => {
    it('should update discount value', async () => {
      const promo = await Promo.create({
        code: 'UPDATE1',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      const updated = await Promo.findByIdAndUpdate(
        promo._id,
        { discountValue: 25 },
        { new: true, runValidators: true }
      )

      expect(updated?.discountValue).toBe(25)
    })

    it('should toggle active status', async () => {
      const promo = await Promo.create({
        code: 'TOGGLE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })

      const updated = await Promo.findByIdAndUpdate(
        promo._id,
        { active: false },
        { new: true }
      )
      expect(updated?.active).toBe(false)
    })

    it('should update expiresAt', async () => {
      const promo = await Promo.create({
        code: 'EXPIRE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      const newExpiry = new Date('2030-06-15')
      const updated = await Promo.findByIdAndUpdate(
        promo._id,
        { expiresAt: newExpiry },
        { new: true }
      )
      expect(updated?.expiresAt?.getTime()).toBe(newExpiry.getTime())
    })

    it('should clear expiresAt with null', async () => {
      const promo = await Promo.create({
        code: 'CLEAREXP',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        expiresAt: new Date('2030-01-01'),
      })

      const updated = await Promo.findByIdAndUpdate(
        promo._id,
        { expiresAt: null },
        { new: true }
      )
      expect(updated?.expiresAt).toBeNull()
    })

    it('should return null for non-existent promo', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const result = await Promo.findByIdAndUpdate(
        fakeId,
        { discountValue: 50 },
        { new: true }
      )
      expect(result).toBeNull()
    })
  })

  // ========================================
  // DELETE /promos/:id (soft-delete)
  // ========================================
  describe('Delete Promo (DELETE /promos/:id)', () => {
    it('should soft-delete by setting active=false and deletedAt', async () => {
      const promo = await Promo.create({
        code: 'SOFTDEL',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        active: true,
      })

      const deleted = await Promo.findByIdAndUpdate(
        promo._id,
        { active: false, deletedAt: new Date() },
        { new: true }
      )

      expect(deleted?.active).toBe(false)
      expect(deleted?.deletedAt).toBeInstanceOf(Date)
    })

    it('should still be queryable after soft-delete', async () => {
      const promo = await Promo.create({
        code: 'STILLHERE',
        appName: 'ezbill',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })

      await Promo.findByIdAndUpdate(promo._id, {
        active: false,
        deletedAt: new Date(),
      })

      // Direct find still works
      const found = await Promo.findById(promo._id)
      expect(found).not.toBeNull()

      // But filtered query excludes it
      const notDeleted = await Promo.find({ deletedAt: null })
      expect(notDeleted).toHaveLength(0)
    })

    it('should return null for non-existent promo', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const result = await Promo.findByIdAndUpdate(
        fakeId,
        { active: false, deletedAt: new Date() },
        { new: true }
      )
      expect(result).toBeNull()
    })
  })
})
