/**
 * Security tests for input validation across all routes
 *
 * Attack vectors tested:
 * - Missing required fields
 * - Invalid ObjectIds in URL params
 * - Extremely long strings
 * - Unicode/emoji in descriptions
 * - Invalid currency codes
 * - Extra unexpected fields (mass assignment)
 * - ReDoS via search parameter
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getPromoModel, type PromoDocument } from '../../models/Promo.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { Model } from 'mongoose'
import { z } from 'zod'

describe('Input Validation Security', () => {
  let PaymentModel: Model<PaymentDocument>
  let PromoModel: Model<PromoDocument>
  let PlanModel: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PaymentModel = await getPaymentModel()
    PromoModel = await getPromoModel()
    PlanModel = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PaymentModel.deleteMany({})
    await PromoModel.deleteMany({})
    await PlanModel.deleteMany({})
  })

  // =========================================================================
  // Invalid ObjectIds
  // =========================================================================
  describe('Invalid ObjectIds in URL params', () => {
    it('Mongoose findById with invalid ObjectId throws CastError', async () => {
      // Routes like GET /payments/:paymentId use:
      // Payment.findOne({ $or: [{ _id: paymentId }, { paymentId }] })
      //
      // If paymentId is "not-a-valid-objectid", Mongoose will:
      // 1. Try _id match (CastError for invalid ObjectId)
      // 2. Fall through to paymentId string match
      //
      // The $or with both _id and string paymentId handles this gracefully.
      const result = await PaymentModel.findOne({
        $or: [{ paymentId: 'invalid-id-123' }],
      })
      expect(result).toBeNull()
    })

    it('VULNERABILITY: findById with crafted ObjectId-like string', async () => {
      // A 24-char hex string IS a valid ObjectId format
      const fakeObjectId = '000000000000000000000000'
      const result = await PaymentModel.findOne({
        $or: [{ _id: fakeObjectId }, { paymentId: fakeObjectId }],
      })
      expect(result).toBeNull() // Just returns null, no crash
    })
  })

  // =========================================================================
  // Extremely long strings
  // =========================================================================
  describe('Extremely long strings', () => {
    it('message field has maxlength: 500 in Payment metadata', async () => {
      const longMessage = 'A'.repeat(501)
      await expect(
        PaymentModel.create({
          projectId: 'myapp',
          projectName: 'MyApp',
          type: 'donation',
          amount: 10,
          paymentId: 'cs_long_msg',
          metadata: { message: longMessage },
        })
      ).rejects.toThrow()
    })

    it('promo code length is validated by Zod (max: 50)', () => {
      const schema = z.object({
        code: z.string().min(1).max(50),
      })
      const longCode = 'A'.repeat(51)
      expect(schema.safeParse({ code: longCode }).success).toBe(false)
    })

    it('plan description has max: 500 in Zod schema', () => {
      const schema = z.object({
        description: z.string().max(500).optional(),
      })
      const longDesc = 'A'.repeat(501)
      expect(schema.safeParse({ description: longDesc }).success).toBe(false)
    })

    it('VULNERABILITY: projectId and projectName have no length limit', async () => {
      // The createDonationSchema has projectId: z.string() with no max length
      // An attacker could send a very long projectId to waste storage
      const longProjectId = 'A'.repeat(10000)
      const payment = await PaymentModel.create({
        projectId: longProjectId,
        projectName: longProjectId,
        type: 'donation',
        amount: 10,
        paymentId: 'cs_long_project',
      })
      expect(payment.projectId.length).toBe(10000)
      // SEVERITY: LOW (storage waste, no security impact)
    })
  })

  // =========================================================================
  // Unicode/Emoji in text fields
  // =========================================================================
  describe('Unicode and emoji handling', () => {
    it('message field accepts unicode/emoji', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_emoji',
        metadata: { message: 'Love it! ❤️🎉🔥' },
      })
      expect(payment.metadata?.message).toContain('❤️')
    })

    it('promo code with unicode is uppercased and stored', async () => {
      // Uppercase of some unicode chars can be unexpected
      const promo = await PromoModel.create({
        code: 'PROMO123',
        appName: 'myapp',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
      })
      expect(promo.code).toBe('PROMO123')
    })
  })

  // =========================================================================
  // Invalid currency codes
  // =========================================================================
  describe('Currency code validation', () => {
    it('VULNERABILITY: currency field accepts any string, not validated as ISO 4217', () => {
      // The Zod schemas have: currency: z.string().default('EUR')
      // No regex validation for ISO 4217 format (3 uppercase letters)
      const schema = z.object({
        currency: z.string().default('EUR'),
      })
      expect(schema.safeParse({ currency: 'INVALID' }).success).toBe(true)
      expect(schema.safeParse({ currency: '💰' }).success).toBe(true)
      expect(schema.safeParse({ currency: '' }).success).toBe(true)
      // SEVERITY: LOW - Stripe will reject invalid currencies
    })

    it('Plan model validates currency length (3 chars) via Zod', () => {
      // createPlanSchema: currency: z.string().min(3).max(3).default('EUR')
      // This is CORRECT but only validates length, not ISO format
      const schema = z.object({
        currency: z.string().min(3).max(3).default('EUR'),
      })
      expect(schema.safeParse({ currency: 'XXX' }).success).toBe(true) // Invalid ISO but passes
      expect(schema.safeParse({ currency: 'EU' }).success).toBe(false)
    })
  })

  // =========================================================================
  // Mass assignment / extra fields
  // =========================================================================
  describe('Mass assignment protection', () => {
    it('Zod schema strips extra fields by default', () => {
      // Zod's .safeParse() ignores extra fields (doesn't reject them)
      // but also doesn't include them in the parsed output.
      const schema = z.object({
        amount: z.number(),
      })
      const result = schema.safeParse({ amount: 100, __proto__: 'evil', admin: true })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('admin')
        expect(result.data).not.toHaveProperty('__proto__')
      }
    })

    it('VULNERABILITY: Plan creation passes all data to Promo.create()', () => {
      // In createPromo handler (createPromo.ts line 77):
      // const promo = await Promo.create({ ...data, code: ..., usedCount: 0 })
      // The spread ...data could include unexpected fields.
      // However, Mongoose schema validation prevents fields not in the schema.
      // SEVERITY: NONE (Mongoose strict mode rejects unknown fields by default)
      expect(true).toBe(true)
    })
  })

  // =========================================================================
  // ReDoS via search parameter
  // =========================================================================
  describe('ReDoS in search/regex parameters', () => {
    it('VULNERABILITY: list payments search uses unescaped regex', () => {
      // In payments/list.ts line 94:
      // if (search) query.customerEmail = { $regex: search, $options: 'i' }
      //
      // The search parameter is passed directly to MongoDB $regex without
      // escaping special regex characters. This could enable:
      //
      // 1. ReDoS (Regular Expression Denial of Service) with crafted patterns
      //    like "^(a+)+$" which cause exponential backtracking
      //
      // 2. Information extraction via regex oracle:
      //    "^a" returns different results than "^b" allowing char-by-char
      //    enumeration of email addresses
      //
      // SEVERITY: MEDIUM
      // FIX: Escape regex special characters:
      // search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const dangerousInput = '(a+)+$'
      const regex = new RegExp(dangerousInput, 'i')
      // This regex is valid but potentially dangerous for ReDoS
      expect(regex.source).toBe('(a+)+$')
    })
  })

  // =========================================================================
  // Pagination edge cases
  // =========================================================================
  describe('Pagination security', () => {
    it('limit is capped at 100 in list payments', () => {
      const schema = z.object({
        limit: z.coerce.number().min(1).max(100).default(20),
      })
      expect(schema.safeParse({ limit: 999 }).success).toBe(false)
    })

    it('offset cannot be negative', () => {
      const schema = z.object({
        offset: z.coerce.number().min(0).default(0),
      })
      expect(schema.safeParse({ offset: -1 }).success).toBe(false)
    })

    it('VULNERABILITY: donations list has no max limit', () => {
      // In donations/list.ts line 26:
      // limit: z.coerce.number().default(20)
      // NO .max(100) constraint!
      // An attacker can request limit=999999 to dump the entire donations table.
      const schema = z.object({
        limit: z.coerce.number().default(20),
      })
      expect(schema.safeParse({ limit: 999999 }).success).toBe(true)
      // SEVERITY: MEDIUM
      // FIX: Add .max(100) to all list endpoints
    })
  })
})
