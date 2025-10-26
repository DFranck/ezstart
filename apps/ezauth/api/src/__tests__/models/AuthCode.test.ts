import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getAuthCodeModel } from '../../models/auth-code.js'
import type { Model } from 'mongoose'

interface AuthCodeDocument {
  code: string
  userId: string
  app: string
  redirectUri?: string
  expiresAt: Date
  isUsed: boolean
  createdAt: Date
  updatedAt: Date
}

describe('AuthCode Model', () => {
  let AuthCodeModel: Model<AuthCodeDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    AuthCodeModel = await getAuthCodeModel()

    // Drop all indexes and recreate to ensure correct indexes
    try {
      await AuthCodeModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await AuthCodeModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await AuthCodeModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid auth code with required fields', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      expect(authCode.code).toBe('abc123def456')
      expect(authCode.userId).toBe('507f1f77bcf86cd799439011')
      expect(authCode.app).toBe('ezbill')
      expect(authCode.isUsed).toBe(false) // Default value
      expect(authCode.expiresAt).toBeInstanceOf(Date)
    })

    it('should require code field', async () => {
      await expect(
        AuthCodeModel.create({
          userId: '507f1f77bcf86cd799439011',
          app: 'ezbill',
        })
      ).rejects.toThrow()
    })

    it('should require userId field', async () => {
      await expect(
        AuthCodeModel.create({
          code: 'abc123def456',
          app: 'ezbill',
        })
      ).rejects.toThrow()
    })

    it('should require app field', async () => {
      await expect(
        AuthCodeModel.create({
          code: 'abc123def456',
          userId: '507f1f77bcf86cd799439011',
        })
      ).rejects.toThrow()
    })

    it('should accept optional redirectUri', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        redirectUri: 'http://localhost:5025/auth/callback',
      })

      expect(authCode.redirectUri).toBe('http://localhost:5025/auth/callback')
    })

    it('should validate app enum values', async () => {
      const validApps = ['ezbill', 'tower-defense', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd']

      for (const app of validApps) {
        const authCode = await AuthCodeModel.create({
          code: `code-${app}`,
          userId: '507f1f77bcf86cd799439011',
          app,
        })
        expect(authCode.app).toBe(app)
        await AuthCodeModel.deleteMany({})
      }
    })

    it('should reject invalid app enum values', async () => {
      await expect(
        AuthCodeModel.create({
          code: 'abc123def456',
          userId: '507f1f77bcf86cd799439011',
          app: 'invalid-app',
        })
      ).rejects.toThrow()
    })
  })

  describe('Default Values', () => {
    it('should default isUsed to false', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      expect(authCode.isUsed).toBe(false)
    })

    it('should default expiresAt to 5 minutes from now', async () => {
      const beforeCreate = Date.now()

      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      const afterCreate = Date.now()
      const expiresAtTime = authCode.expiresAt.getTime()

      // expiresAt should be ~5 minutes (300000ms) from now
      const minExpectedTime = beforeCreate + 4.9 * 60 * 1000 // 4.9 minutes
      const maxExpectedTime = afterCreate + 5.1 * 60 * 1000  // 5.1 minutes

      expect(expiresAtTime).toBeGreaterThan(minExpectedTime)
      expect(expiresAtTime).toBeLessThan(maxExpectedTime)
    })

    it('should allow custom expiresAt', async () => {
      const customExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        expiresAt: customExpiry,
      })

      expect(authCode.expiresAt.getTime()).toBe(customExpiry.getTime())
    })
  })

  describe('Unique Constraints', () => {
    it('should enforce unique code', async () => {
      await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      await expect(
        AuthCodeModel.create({
          code: 'abc123def456',
          userId: '507f1f77bcf86cd799439012',
          app: 'tower-defense',
        })
      ).rejects.toThrow()
    })

    it('should allow same user to have multiple codes', async () => {
      const userId = '507f1f77bcf86cd799439011'

      const code1 = await AuthCodeModel.create({
        code: 'code1',
        userId,
        app: 'ezbill',
      })

      const code2 = await AuthCodeModel.create({
        code: 'code2',
        userId,
        app: 'tower-defense',
      })

      expect(code1.userId).toBe(userId)
      expect(code2.userId).toBe(userId)
      expect(code1.code).not.toBe(code2.code)
    })
  })

  describe('CRUD Operations', () => {
    it('should find auth code by code', async () => {
      await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      const found = await AuthCodeModel.findOne({ code: 'abc123def456' })
      expect(found).toBeDefined()
      expect(found?.code).toBe('abc123def456')
    })

    it('should find auth codes by userId', async () => {
      const userId = '507f1f77bcf86cd799439011'

      await AuthCodeModel.create({
        code: 'code1',
        userId,
        app: 'ezbill',
      })

      await AuthCodeModel.create({
        code: 'code2',
        userId,
        app: 'tower-defense',
      })

      const codes = await AuthCodeModel.find({ userId })
      expect(codes).toHaveLength(2)
    })

    it('should find auth codes by app', async () => {
      await AuthCodeModel.create({
        code: 'code1',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      await AuthCodeModel.create({
        code: 'code2',
        userId: '507f1f77bcf86cd799439012',
        app: 'ezbill',
      })

      const codes = await AuthCodeModel.find({ app: 'ezbill' })
      expect(codes).toHaveLength(2)
    })

    it('should mark code as used', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      authCode.isUsed = true
      await authCode.save()

      const updated = await AuthCodeModel.findById(authCode._id)
      expect(updated?.isUsed).toBe(true)
    })

    it('should delete auth code', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      await AuthCodeModel.findByIdAndDelete(authCode._id)

      const deleted = await AuthCodeModel.findById(authCode._id)
      expect(deleted).toBeNull()
    })

    it('should find unused codes', async () => {
      await AuthCodeModel.create({
        code: 'code1',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        isUsed: false,
      })

      await AuthCodeModel.create({
        code: 'code2',
        userId: '507f1f77bcf86cd799439012',
        app: 'tower-defense',
        isUsed: true,
      })

      const unusedCodes = await AuthCodeModel.find({ isUsed: false })
      expect(unusedCodes).toHaveLength(1)
      expect(unusedCodes[0].code).toBe('code1')
    })

    it('should find non-expired codes', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000)
      const pastExpiry = new Date(Date.now() - 10 * 60 * 1000)

      await AuthCodeModel.create({
        code: 'code1',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        expiresAt: futureExpiry,
      })

      await AuthCodeModel.create({
        code: 'code2',
        userId: '507f1f77bcf86cd799439012',
        app: 'tower-defense',
        expiresAt: pastExpiry,
      })

      const nonExpiredCodes = await AuthCodeModel.find({
        expiresAt: { $gt: new Date() },
      })

      expect(nonExpiredCodes).toHaveLength(1)
      expect(nonExpiredCodes[0].code).toBe('code1')
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      expect(authCode.createdAt).toBeInstanceOf(Date)
      expect(authCode.updatedAt).toBeInstanceOf(Date)
    })

    it('should update updatedAt on modification', async () => {
      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
      })

      const originalUpdatedAt = authCode.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      authCode.isUsed = true
      await authCode.save()

      const updated = await AuthCodeModel.findById(authCode._id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('Expiry Scenarios', () => {
    it('should identify expired codes', async () => {
      const pastExpiry = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago

      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        expiresAt: pastExpiry,
      })

      const isExpired = authCode.expiresAt < new Date()
      expect(isExpired).toBe(true)
    })

    it('should identify non-expired codes', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

      const authCode = await AuthCodeModel.create({
        code: 'abc123def456',
        userId: '507f1f77bcf86cd799439011',
        app: 'ezbill',
        expiresAt: futureExpiry,
      })

      const isExpired = authCode.expiresAt < new Date()
      expect(isExpired).toBe(false)
    })
  })

  describe('Authorization Flow', () => {
    it('should support complete OAuth2 authorization code flow', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const code = 'abc123def456'
      const app = 'ezbill'
      const redirectUri = 'http://localhost:5025/auth/callback'

      // Step 1: Create authorization code
      const authCode = await AuthCodeModel.create({
        code,
        userId,
        app,
        redirectUri,
      })

      expect(authCode.isUsed).toBe(false)
      expect(authCode.expiresAt.getTime()).toBeGreaterThan(Date.now())

      // Step 2: Verify code exists and is valid
      const foundCode = await AuthCodeModel.findOne({
        code,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })

      expect(foundCode).toBeDefined()
      expect(foundCode?.userId).toBe(userId)
      expect(foundCode?.app).toBe(app)

      // Step 3: Mark code as used
      if (foundCode) {
        foundCode.isUsed = true
        await foundCode.save()
      }

      // Step 4: Verify code cannot be reused
      const usedCode = await AuthCodeModel.findOne({
        code,
        isUsed: false,
      })

      expect(usedCode).toBeNull()
    })
  })
})
