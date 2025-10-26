import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getReceiptModel, type ReceiptDocument } from '../../models/billing/receipt.js'
import type { Model } from 'mongoose'

describe('Receipt Model', () => {
  let ReceiptModel: Model<ReceiptDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ReceiptModel = await getReceiptModel()

    // Drop all indexes and recreate to ensure correct compound index
    try {
      await ReceiptModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await ReceiptModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ReceiptModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid receipt with required fields', async () => {
      const receipt = await ReceiptModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [
          {
            label: 'Payment received',
            quantity: 1,
            price: 1000,
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
        documentNumber: 'R-2025-0001',
        status: 'issued',
      })

      expect(receipt).toBeDefined()
      expect(receipt.userId).toBe('507f1f77bcf86cd799439011')
      expect(receipt.clientId).toBe('507f1f77bcf86cd799439012')
      expect(receipt.status).toBe('issued')
      expect(receipt.deletedAt).toBeNull()
      expect(receipt.createdAt).toBeDefined()
      expect(receipt.updatedAt).toBeDefined()
    })

    it('should require userId', async () => {
      await expect(
        ReceiptModel.create({
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          documentNumber: 'R-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require clientId', async () => {
      await expect(
        ReceiptModel.create({
          userId: '507f1f77bcf86cd799439011',
          items: [],
          currency: 'USD',
          documentNumber: 'R-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require items array', async () => {
      await expect(
        ReceiptModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          currency: 'USD',
          documentNumber: 'R-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require documentNumber', async () => {
      await expect(
        ReceiptModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
        })
      ).rejects.toThrow()
    })
  })

  describe('Receipt Status', () => {
    it('should default to issued status', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      expect(receipt.status).toBe('issued')
    })

    it('should allow valid status values (issued, refunded)', async () => {
      const statuses = ['issued', 'refunded']

      for (const status of statuses) {
        const receipt = await ReceiptModel.create({
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
          documentNumber: `R-2025-000${statuses.indexOf(status) + 1}`,
          status,
        })

        expect(receipt.status).toBe(status)
      }
    })

    it('should reject invalid status values', async () => {
      await expect(
        ReceiptModel.create({
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
          documentNumber: 'R-2025-0001',
          status: 'invalid',
        })
      ).rejects.toThrow()
    })
  })

  describe('Receipt Items', () => {
    it('should store line items correctly', async () => {
      const receipt = await ReceiptModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [
          {
            label: 'Payment for invoice INV-001',
            quantity: 1,
            price: 1000,
          },
          {
            label: 'Additional service',
            quantity: 1,
            price: 200,
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
        documentNumber: 'R-2025-0001',
      })

      expect(receipt.items).toHaveLength(2)
      expect(receipt.items[0].label).toBe('Payment for invoice INV-001')
      expect(receipt.items[0].quantity).toBe(1)
      expect(receipt.items[0].price).toBe(1000)
    })
  })

  describe('Invoice Reference', () => {
    it('should allow linking to an invoice', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
        invoiceId: '507f1f77bcf86cd799439999',
      })

      expect(receipt.invoiceId).toBe('507f1f77bcf86cd799439999')
    })

    it('should allow receipts without invoice reference', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      expect(receipt.invoiceId).toBeNull()
    })
  })

  describe('CRUD Operations', () => {
    it('should find receipt by userId', async () => {
      await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      const receipts = await ReceiptModel.find({ userId: '507f1f77bcf86cd799439011' })
      expect(receipts).toHaveLength(1)
    })

    it('should update receipt', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
        status: 'issued',
      })

      const updated = await ReceiptModel.findByIdAndUpdate(
        receipt._id,
        { status: 'refunded' },
        { new: true }
      )

      expect(updated?.status).toBe('refunded')
    })

    it('should soft delete receipt', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      const deleted = await ReceiptModel.findByIdAndUpdate(
        receipt._id,
        { deletedAt: new Date().toISOString() },
        { new: true }
      )

      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('should hard delete receipt', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      await ReceiptModel.findByIdAndDelete(receipt._id)
      const found = await ReceiptModel.findById(receipt._id)
      expect(found).toBeNull()
    })
  })

  describe('Indexes', () => {
    it('should have compound unique index on documentNumber + userId', async () => {
      await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      // Same documentNumber but different userId should succeed
      await expect(
        ReceiptModel.create({
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
          documentNumber: 'R-2025-0001',
        })
      ).resolves.toBeDefined()

      // Same documentNumber AND userId should fail
      await expect(
        ReceiptModel.create({
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
          documentNumber: 'R-2025-0001',
        })
      ).rejects.toThrow()
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      expect(receipt.createdAt).toBeDefined()
      expect(receipt.updatedAt).toBeDefined()
    })

    it('should update updatedAt on modification', async () => {
      const receipt = await ReceiptModel.create({
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
        documentNumber: 'R-2025-0001',
      })

      const originalUpdatedAt = receipt.updatedAt

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await ReceiptModel.findByIdAndUpdate(
        receipt._id,
        { status: 'refunded' },
        { new: true }
      )

      // @ts-expect-error - Mongoose returns Date but Receipt type has string (ISO timestamp)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
