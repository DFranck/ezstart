import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getInvoiceModel, type InvoiceDocument } from '../../models/billing/invoice.js'
import type { Model } from 'mongoose'

describe('Invoice Model', () => {
  let InvoiceModel: Model<InvoiceDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    InvoiceModel = await getInvoiceModel()

    // Drop all indexes and recreate to ensure correct compound index
    try {
      await InvoiceModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await InvoiceModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await InvoiceModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid invoice with required fields', async () => {
      const invoice = await InvoiceModel.create({
        userId: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439012',
        items: [
          {
            label: 'Web development',
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
        documentNumber: 'INV-2025-0001',
        status: 'draft',
      })

      expect(invoice).toBeDefined()
      expect(invoice.userId).toBe('507f1f77bcf86cd799439011')
      expect(invoice.clientId).toBe('507f1f77bcf86cd799439012')
      expect(invoice.status).toBe('draft')
      expect(invoice.deletedAt).toBeNull()
      expect(invoice.createdAt).toBeDefined()
      expect(invoice.updatedAt).toBeDefined()
    })

    it('should require userId', async () => {
      await expect(
        InvoiceModel.create({
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
          documentNumber: 'INV-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require clientId', async () => {
      await expect(
        InvoiceModel.create({
          userId: '507f1f77bcf86cd799439011',
          items: [],
          currency: 'USD',
          documentNumber: 'INV-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require items array', async () => {
      await expect(
        InvoiceModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          currency: 'USD',
          documentNumber: 'INV-2025-0001',
        })
      ).rejects.toThrow()
    })

    it('should require documentNumber', async () => {
      await expect(
        InvoiceModel.create({
          userId: '507f1f77bcf86cd799439011',
          clientId: '507f1f77bcf86cd799439012',
          items: [],
          currency: 'USD',
        })
      ).rejects.toThrow()
    })
  })

  describe('Invoice Status', () => {
    it('should default to draft status', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      expect(invoice.status).toBe('draft')
    })

    it('should allow valid status values (draft, sent, paid)', async () => {
      const statuses = ['draft', 'sent', 'paid']

      for (const status of statuses) {
        const invoice = await InvoiceModel.create({
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
          documentNumber: `INV-2025-000${statuses.indexOf(status) + 1}`,
          status,
        })

        expect(invoice.status).toBe(status)
      }
    })

    it('should reject invalid status values', async () => {
      await expect(
        InvoiceModel.create({
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
          documentNumber: 'INV-2025-0001',
          status: 'invalid',
        })
      ).rejects.toThrow()
    })
  })

  describe('Invoice Items', () => {
    it('should store line items correctly', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      expect(invoice.items).toHaveLength(2)
      expect(invoice.items[0].label).toBe('Web development')
      expect(invoice.items[0].quantity).toBe(10)
      expect(invoice.items[0].price).toBe(100)
    })
  })

  describe('Due Date', () => {
    it('should default dueDate to 15 days from now', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      expect(invoice.dueDate).toBeDefined()
      const dueDate = new Date(invoice.dueDate)
      const now = new Date()
      const daysDiff = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeGreaterThanOrEqual(14)
      expect(daysDiff).toBeLessThanOrEqual(16)
    })

    it('should allow custom dueDate', async () => {
      const customDueDate = new Date('2025-12-31').toISOString()
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
        dueDate: customDueDate,
      })

      expect(invoice.dueDate).toBe(customDueDate)
    })
  })

  describe('CRUD Operations', () => {
    it('should find invoice by userId', async () => {
      await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      const invoices = await InvoiceModel.find({ userId: '507f1f77bcf86cd799439011' })
      expect(invoices).toHaveLength(1)
    })

    it('should update invoice', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
        status: 'draft',
      })

      const updated = await InvoiceModel.findByIdAndUpdate(
        invoice._id,
        { status: 'sent' },
        { new: true }
      )

      expect(updated?.status).toBe('sent')
    })

    it('should soft delete invoice', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      const deleted = await InvoiceModel.findByIdAndUpdate(
        invoice._id,
        { deletedAt: new Date().toISOString() },
        { new: true }
      )

      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('should hard delete invoice', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      await InvoiceModel.findByIdAndDelete(invoice._id)
      const found = await InvoiceModel.findById(invoice._id)
      expect(found).toBeNull()
    })
  })

  describe('Indexes', () => {
    it('should have compound unique index on documentNumber + userId', async () => {
      await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      // Same documentNumber but different userId should succeed
      await expect(
        InvoiceModel.create({
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
          documentNumber: 'INV-2025-0001',
        })
      ).resolves.toBeDefined()

      // Same documentNumber AND userId should fail
      await expect(
        InvoiceModel.create({
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
          documentNumber: 'INV-2025-0001',
        })
      ).rejects.toThrow()
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      expect(invoice.createdAt).toBeDefined()
      expect(invoice.updatedAt).toBeDefined()
    })

    it('should update updatedAt on modification', async () => {
      const invoice = await InvoiceModel.create({
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
        documentNumber: 'INV-2025-0001',
      })

      const originalUpdatedAt = invoice.updatedAt

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await InvoiceModel.findByIdAndUpdate(
        invoice._id,
        { status: 'sent' },
        { new: true }
      )

      // @ts-expect-error - Mongoose returns Date but Invoice type has string (ISO timestamp)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
