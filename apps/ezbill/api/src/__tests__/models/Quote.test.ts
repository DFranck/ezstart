import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getQuoteModel, type QuoteDocument } from '../../models/billing/quote.js'
import type { Model } from 'mongoose'

describe('Quote Model', () => {
  let QuoteModel: Model<QuoteDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    QuoteModel = await getQuoteModel()

    // Drop all indexes and recreate to ensure correct compound index
    try {
      await QuoteModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await QuoteModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await QuoteModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid quote with required fields', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [
          {
            label: 'Web development quote',
            quantity: 10,
            price: 100,
          },
        ],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
        status: 'draft',
      })

      expect(quote).toBeDefined()
      expect(quote.userId).toBe('507f1f77bcf86cd799439011')
      expect(quote.clientId).toBe('507f1f77bcf86cd799439012')
      expect(quote.status).toBe('draft')
      expect(quote.deletedAt).toBeNull()
      expect(quote.createdAt).toBeDefined()
      expect(quote.updatedAt).toBeDefined()
    })

    it('should require userId', async () => {
      await expect(
        QuoteModel.create({
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          documentNumber: 'Q-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require clientId', async () => {
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          items: [],
          currency: 'USD',
          documentNumber: 'Q-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require items array', async () => {
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          currency: 'USD',
          documentNumber: 'Q-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require documentNumber', async () => {
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
        })
      ).rejects.toThrow()
    })
  })

  describe('Quote Status', () => {
    it('should default to draft status', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      expect(quote.status).toBe('draft')
    })

    it('should allow valid status values (draft, sent, accepted, rejected, converted)', async () => {
      const statuses = ['draft', 'sent', 'accepted', 'rejected', 'converted']

      for (const status of statuses) {
        const quote = await QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          exchangeRate: {
            from: 'USD',
            to: 'USD',
            rate: 1.0,
            source: 'default',
            fetchedAt: new Date(),
          },
          documentNumber: `Q-2025-000${statuses.indexOf(status) + 1}`,
          status,
        })

        expect(quote.status).toBe(status)
      }
    })

    it('should reject invalid status values', async () => {
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          exchangeRate: {
            from: 'USD',
            to: 'USD',
            rate: 1.0,
            source: 'default',
            fetchedAt: new Date(),
          },
          documentNumber: 'Q-2025-0001',
          status: 'invalid',
        })
      ).rejects.toThrow()
    })
  })

  describe('Quote Items', () => {
    it('should store line items correctly', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [
          {
            label: 'Web development',
            quantity: 10,
            price: 100,
          },
          {
            label: 'Design work',
            quantity: 5,
            price: 80,
          },
        ],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      expect(quote.items).toHaveLength(2)
      expect(quote.items[0].label).toBe('Web development')
      expect(quote.items[0].quantity).toBe(10)
      expect(quote.items[0].price).toBe(100)
    })
  })

  describe('Valid Until Date', () => {
    it('should default validUntil to 30 days from now', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      expect(quote.validUntil).toBeDefined()
      const validUntil = new Date(quote.validUntil)
      const now = new Date()
      const daysDiff = Math.round((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeGreaterThanOrEqual(29)
      expect(daysDiff).toBeLessThanOrEqual(31)
    })

    it('should allow custom validUntil', async () => {
      const customValidUntil = new Date('2025-12-31').toISOString()
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
        validUntil: customValidUntil,
      })

      expect(quote.validUntil).toBe(customValidUntil)
    })
  })

  describe('CRUD Operations', () => {
    it('should find quote by userId', async () => {
      await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      const quotes = await QuoteModel.find({ userId: '507f1f77bcf86cd799439011' })
      expect(quotes).toHaveLength(1)
    })

    it('should update quote', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
        status: 'draft',
      })

      const updated = await QuoteModel.findByIdAndUpdate(
        quote._id,
        { status: 'sent' },
        { new: true }
      )

      expect(updated?.status).toBe('sent')
    })

    it('should soft delete quote', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      const deleted = await QuoteModel.findByIdAndUpdate(
        quote._id,
        { deletedAt: new Date().toISOString() },
        { new: true }
      )

      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('should hard delete quote', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      await QuoteModel.findByIdAndDelete(quote._id)
      const found = await QuoteModel.findById(quote._id)
      expect(found).toBeNull()
    })
  })

  describe('Indexes', () => {
    it('should have compound unique index on documentNumber + userId', async () => {
      await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      // Same documentNumber but different userId should succeed
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439999',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          exchangeRate: {
            from: 'USD',
            to: 'USD',
            rate: 1.0,
            source: 'default',
            fetchedAt: new Date(),
          },
          documentNumber: 'Q-2025-0001',
        })
      ).resolves.toBeDefined()

      // Same documentNumber AND userId should fail
      await expect(
        QuoteModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          exchangeRate: {
            from: 'USD',
            to: 'USD',
            rate: 1.0,
            source: 'default',
            fetchedAt: new Date(),
          },
          documentNumber: 'Q-2025-0001',
        })
      ).rejects.toThrow()
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      expect(quote.createdAt).toBeDefined()
      expect(quote.updatedAt).toBeDefined()
    })

    it('should update updatedAt on modification', async () => {
      const quote = await QuoteModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [],
        currency: 'USD',
        exchangeRate: {
          from: 'USD',
          to: 'USD',
          rate: 1.0,
          source: 'default',
          fetchedAt: new Date(),
        },
        documentNumber: 'Q-2025-0001',
      })

      const originalUpdatedAt = quote.updatedAt

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await QuoteModel.findByIdAndUpdate(
        quote._id,
        { status: 'sent' },
        { new: true }
      )

      // @ts-expect-error - Mongoose returns Date but Quote type has string (ISO timestamp)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
