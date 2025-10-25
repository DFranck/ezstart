import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getClientModel, type ClientDocument } from '../../models/client.js'
import type { Model } from 'mongoose'

describe('Client Model', () => {
  let ClientModel: Model<ClientDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ClientModel = await getClientModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ClientModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid client with required fields', async () => {
      const clientData = {
        userId: 'user-123',
        clientName: 'Acme Corp',
      }

      const client = await ClientModel.create(clientData)

      expect(client).toBeDefined()
      expect(client._id).toBeDefined()
      expect(client.userId).toBe('user-123')
      expect(client.clientName).toBe('Acme Corp')
      expect(client.isCompany).toBe(false) // default value
      expect(client.deletedAt).toBe(null) // default value
      expect(client.createdAt).toBeDefined()
      expect(client.updatedAt).toBeDefined()
    })

    it('should fail without required userId', async () => {
      const clientData = {
        clientName: 'Acme Corp',
      }

      await expect(ClientModel.create(clientData)).rejects.toThrow()
    })

    it('should fail without required clientName', async () => {
      const clientData = {
        userId: 'user-123',
      }

      await expect(ClientModel.create(clientData)).rejects.toThrow()
    })
  })

  describe('Company Client Fields', () => {
    it('should create a company client with all fields', async () => {
      const clientData = {
        userId: 'user-123',
        clientName: 'Acme Corp',
        isCompany: true,
        companyRegistrationNumber: 'RC123456',
        taxNumber: 'VAT987654',
        email: 'contact@acme.com',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        website: 'https://acme.com',
        notes: 'Important client',
      }

      const client = await ClientModel.create(clientData)

      expect(client.isCompany).toBe(true)
      expect(client.companyRegistrationNumber).toBe('RC123456')
      expect(client.taxNumber).toBe('VAT987654')
      expect(client.email).toBe('contact@acme.com')
      expect(client.phone).toBe('+1234567890')
      expect(client.address).toBe('123 Main St')
      expect(client.city).toBe('Paris')
      expect(client.postalCode).toBe('75001')
      expect(client.country).toBe('France')
      expect(client.website).toBe('https://acme.com')
      expect(client.notes).toBe('Important client')
    })

    it('should create a company with contact person', async () => {
      const clientData = {
        userId: 'user-123',
        clientName: 'Acme Corp',
        isCompany: true,
        contactPersonName: 'John Doe',
        contactPersonEmail: 'john@acme.com',
        contactPersonPhone: '+1234567890',
        contactPersonTitle: 'CEO',
      }

      const client = await ClientModel.create(clientData)

      expect(client.contactPersonName).toBe('John Doe')
      expect(client.contactPersonEmail).toBe('john@acme.com')
      expect(client.contactPersonPhone).toBe('+1234567890')
      expect(client.contactPersonTitle).toBe('CEO')
    })
  })

  describe('Individual Client', () => {
    it('should create an individual client', async () => {
      const clientData = {
        userId: 'user-123',
        clientName: 'Jane Smith',
        isCompany: false,
        email: 'jane@example.com',
        phone: '+9876543210',
        address: '456 Elm St',
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'UK',
      }

      const client = await ClientModel.create(clientData)

      expect(client.isCompany).toBe(false)
      expect(client.clientName).toBe('Jane Smith')
      expect(client.email).toBe('jane@example.com')
      expect(client.phone).toBe('+9876543210')
    })
  })

  describe('CRUD Operations', () => {
    it('should find client by userId', async () => {
      await ClientModel.create({
        userId: 'user-123',
        clientName: 'Client 1',
      })
      await ClientModel.create({
        userId: 'user-123',
        clientName: 'Client 2',
      })
      await ClientModel.create({
        userId: 'user-456',
        clientName: 'Client 3',
      })

      const clients = await ClientModel.find({ userId: 'user-123' })

      expect(clients).toHaveLength(2)
      expect(clients[0].clientName).toBe('Client 1')
      expect(clients[1].clientName).toBe('Client 2')
    })

    it('should update client', async () => {
      const client = await ClientModel.create({
        userId: 'user-123',
        clientName: 'Old Name',
        email: 'old@example.com',
      })

      const updated = await ClientModel.findByIdAndUpdate(
        client._id,
        { clientName: 'New Name', email: 'new@example.com' },
        { new: true }
      )

      expect(updated?.clientName).toBe('New Name')
      expect(updated?.email).toBe('new@example.com')
    })

    it('should soft delete client', async () => {
      const client = await ClientModel.create({
        userId: 'user-123',
        clientName: 'Test Client',
      })

      const deletedAt = new Date().toISOString()
      const updated = await ClientModel.findByIdAndUpdate(
        client._id,
        { deletedAt },
        { new: true }
      )

      expect(updated?.deletedAt).toBe(deletedAt)
    })

    it('should delete client', async () => {
      const client = await ClientModel.create({
        userId: 'user-123',
        clientName: 'Test Client',
      })

      await ClientModel.findByIdAndDelete(client._id)

      const found = await ClientModel.findById(client._id)
      expect(found).toBe(null)
    })
  })

  describe('Indexes', () => {
    it('should have userId index for fast queries', async () => {
      // Create 100 clients
      const clients = Array.from({ length: 100 }, (_, i) => ({
        userId: i % 10 === 0 ? 'user-target' : `user-${i}`,
        clientName: `Client ${i}`,
      }))

      await ClientModel.insertMany(clients)

      const start = Date.now()
      const results = await ClientModel.find({ userId: 'user-target' })
      const duration = Date.now() - start

      expect(results).toHaveLength(10)
      expect(duration).toBeLessThan(100) // Should be fast with index
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const client = await ClientModel.create({
        userId: 'user-123',
        clientName: 'Test Client',
      })

      expect(client.createdAt).toBeDefined()
      expect(client.updatedAt).toBeDefined()
      expect(client.createdAt).toBeInstanceOf(Date)
      expect(client.updatedAt).toBeInstanceOf(Date)
    })

    it('should update updatedAt on modification', async () => {
      const client = await ClientModel.create({
        userId: 'user-123',
        clientName: 'Original Name',
      })

      const originalUpdatedAt = client.updatedAt

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await ClientModel.findByIdAndUpdate(
        client._id,
        { clientName: 'Updated Name' },
        { new: true }
      )

      // @ts-expect-error - Mongoose returns Date but Client type has string (ISO timestamp)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
