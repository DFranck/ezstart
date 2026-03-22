import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getAuthUserModel } from '../../models/auth-user.js'
import type { AuthUserDocument } from '../../models/auth-user.js'
import type { Model } from 'mongoose'

describe('AuthUser Model', () => {
  let AuthUserModel: Model<AuthUserDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    AuthUserModel = await getAuthUserModel()

    // Drop all indexes and recreate to ensure correct indexes
    try {
      await AuthUserModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await AuthUserModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await AuthUserModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid user with required fields', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
      expect(user.passwordHash).not.toBe('hashedpassword123') // Should be hashed
      expect(user.isVerified).toBe(false) // Default value
      expect(user.apps).toEqual([]) // Default empty array
    })

    it('should require email field', async () => {
      await expect(
        AuthUserModel.create({
          username: 'testuser',
          passwordHash: 'hashedpassword123',
        })
      ).rejects.toThrow()
    })

    it('should require username field', async () => {
      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          passwordHash: 'hashedpassword123',
        })
      ).rejects.toThrow()
    })

    it('should require passwordHash field', async () => {
      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          username: 'testuser',
        })
      ).rejects.toThrow()
    })

    it('should lowercase and trim email', async () => {
      const user = await AuthUserModel.create({
        email: '  TEST@EXAMPLE.COM  ',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      expect(user.email).toBe('test@example.com')
    })

    it('should trim username', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: '  testuser  ',
        passwordHash: 'hashedpassword123',
      })

      expect(user.username).toBe('testuser')
    })

    it('should enforce username min length', async () => {
      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          username: '', // Empty string
          passwordHash: 'hashedpassword123',
        })
      ).rejects.toThrow()
    })

    it('should enforce username max length', async () => {
      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          username: 'a'.repeat(51), // 51 characters
          passwordHash: 'hashedpassword123',
        })
      ).rejects.toThrow()
    })

    it('should accept optional fields', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.png',
      })

      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.avatar).toBe('https://example.com/avatar.png')
    })

    it('should validate app enum values', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        apps: ['ezbill', 'green-pulse'],
      })

      expect(user.apps).toEqual(['ezbill', 'green-pulse'])
    })

    it('should reject invalid app enum values', async () => {
      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashedpassword123',
          apps: ['invalid-app'],
        })
      ).rejects.toThrow()
    })
  })

  describe('Unique Constraints', () => {
    it('should enforce unique email', async () => {
      await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser1',
        passwordHash: 'hashedpassword123',
      })

      await expect(
        AuthUserModel.create({
          email: 'test@example.com',
          username: 'testuser2',
          passwordHash: 'hashedpassword456',
        })
      ).rejects.toThrow()
    })

    it('should enforce unique username', async () => {
      await AuthUserModel.create({
        email: 'test1@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      await expect(
        AuthUserModel.create({
          email: 'test2@example.com',
          username: 'testuser',
          passwordHash: 'hashedpassword456',
        })
      ).rejects.toThrow()
    })
  })

  describe('Password Hashing', () => {
    it('should hash password on save', async () => {
      const plainPassword = 'mySecurePassword123'
      const user = new AuthUserModel({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: plainPassword,
      })

      await user.save()

      expect(user.passwordHash).not.toBe(plainPassword)
      expect(user.passwordHash!.length).toBeGreaterThan(50) // Bcrypt hashes are long
    })

    it('should not rehash if password not modified', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'mySecurePassword123',
      })

      const firstHash = user.passwordHash

      user.firstName = 'John'
      await user.save()

      expect(user.passwordHash).toBe(firstHash)
    })

    it('should compare password correctly with comparePassword method', async () => {
      const plainPassword = 'mySecurePassword123'
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: plainPassword,
      })

      const isMatch = await user.comparePassword(plainPassword)
      expect(isMatch).toBe(true)

      const isNotMatch = await user.comparePassword('wrongPassword')
      expect(isNotMatch).toBe(false)
    })
  })

  describe('CRUD Operations', () => {
    it('should find user by email', async () => {
      await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      const found = await AuthUserModel.findOne({ email: 'test@example.com' })
      expect(found).toBeDefined()
      expect(found?.email).toBe('test@example.com')
    })

    it('should find user by username', async () => {
      await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      const found = await AuthUserModel.findOne({ username: 'testuser' })
      expect(found).toBeDefined()
      expect(found?.username).toBe('testuser')
    })

    it('should update user fields', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      user.firstName = 'John'
      user.lastName = 'Doe'
      user.isVerified = true
      await user.save()

      const updated = await AuthUserModel.findById(user._id)
      expect(updated?.firstName).toBe('John')
      expect(updated?.lastName).toBe('Doe')
      expect(updated?.isVerified).toBe(true)
    })

    it('should add apps to user', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      user.apps.push('ezbill')
      user.apps.push('green-pulse')
      await user.save()

      const updated = await AuthUserModel.findById(user._id)
      expect(updated?.apps).toHaveLength(2)
      expect(updated?.apps).toContain('ezbill')
      expect(updated?.apps).toContain('green-pulse')
    })

    it('should delete user', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      await AuthUserModel.findByIdAndDelete(user._id)

      const deleted = await AuthUserModel.findById(user._id)
      expect(deleted).toBeNull()
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should update updatedAt on modification', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      })

      const originalUpdatedAt = user.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      user.firstName = 'John'
      await user.save()

      const updated = await AuthUserModel.findById(user._id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('Methods', () => {
    it('should transform to AuthUser with toAuthUser method', async () => {
      const user = await AuthUserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'mySecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.png',
        isVerified: true,
        apps: ['ezbill', 'green-pulse'],
      })

      const authUser = user.toAuthUser()

      expect(authUser).toEqual({
        _id: String(user._id),
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.png',
        isVerified: true,
        apps: ['ezbill', 'green-pulse'],
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })

      // Should NOT include passwordHash
      expect(authUser).not.toHaveProperty('passwordHash')
    })
  })
})
