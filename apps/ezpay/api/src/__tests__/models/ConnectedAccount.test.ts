import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

describe('ConnectedAccount Model', () => {
  let ConnectedAccountModel: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccountModel = await getConnectedAccountModel()
    try {
      await ConnectedAccountModel.collection.dropIndexes()
    } catch {
      // Ignore if collection doesn't exist yet
    }
    await ConnectedAccountModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccountModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid connected account with required fields', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_123',
        stripeAccountId: 'acct_abc123',
        email: 'business@example.com',
        businessName: 'Test Business',
        accountType: 'standard',
      })

      expect(account.userId).toBe('user_123')
      expect(account.stripeAccountId).toBe('acct_abc123')
      expect(account.email).toBe('business@example.com')
      expect(account.businessName).toBe('Test Business')
      expect(account.accountType).toBe('standard')
      expect(account.status).toBe('pending')
      expect(account.chargesEnabled).toBe(false)
      expect(account.payoutsEnabled).toBe(false)
      expect(account.defaultFeePercent).toBe(3)
      expect(account.onboardedAt).toBeNull()
    })

    it('should require userId', async () => {
      await expect(
        ConnectedAccountModel.create({
          stripeAccountId: 'acct_abc123',
          email: 'test@example.com',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require stripeAccountId', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_123',
          email: 'test@example.com',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require email', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_123',
          stripeAccountId: 'acct_abc123',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require businessName', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_123',
          stripeAccountId: 'acct_abc123',
          email: 'test@example.com',
        })
      ).rejects.toThrow()
    })
  })

  describe('Account Types', () => {
    it('should accept standard account type', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_std',
        stripeAccountId: 'acct_std',
        email: 'std@example.com',
        businessName: 'Standard Business',
        accountType: 'standard',
      })
      expect(account.accountType).toBe('standard')
    })

    it('should accept express account type', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_exp',
        stripeAccountId: 'acct_exp',
        email: 'exp@example.com',
        businessName: 'Express Business',
        accountType: 'express',
      })
      expect(account.accountType).toBe('express')
    })

    it('should reject invalid account type', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_bad',
          stripeAccountId: 'acct_bad',
          email: 'bad@example.com',
          businessName: 'Bad Business',
          accountType: 'invalid',
        })
      ).rejects.toThrow()
    })
  })

  describe('Status Transitions', () => {
    it('should default to pending status', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_new',
        stripeAccountId: 'acct_new',
        email: 'new@example.com',
        businessName: 'New Business',
      })
      expect(account.status).toBe('pending')
    })

    it('should update to active status', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_active',
        stripeAccountId: 'acct_active',
        email: 'active@example.com',
        businessName: 'Active Business',
      })

      await ConnectedAccountModel.updateOne(
        { _id: account._id },
        {
          status: 'active',
          chargesEnabled: true,
          payoutsEnabled: true,
          onboardedAt: new Date(),
        }
      )

      const updated = await ConnectedAccountModel.findById(account._id)
      expect(updated?.status).toBe('active')
      expect(updated?.chargesEnabled).toBe(true)
      expect(updated?.payoutsEnabled).toBe(true)
      expect(updated?.onboardedAt).toBeInstanceOf(Date)
    })

    it('should update to restricted status', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_restricted',
        stripeAccountId: 'acct_restricted',
        email: 'restricted@example.com',
        businessName: 'Restricted Business',
      })

      await ConnectedAccountModel.updateOne(
        { _id: account._id },
        { status: 'restricted', chargesEnabled: false, payoutsEnabled: false }
      )

      const updated = await ConnectedAccountModel.findById(account._id)
      expect(updated?.status).toBe('restricted')
    })

    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'active', 'restricted', 'disabled'] as const
      for (const status of statuses) {
        await ConnectedAccountModel.deleteMany({})
        const account = await ConnectedAccountModel.create({
          userId: `user_${status}`,
          stripeAccountId: `acct_${status}`,
          email: `${status}@example.com`,
          businessName: `${status} Business`,
          status,
        })
        expect(account.status).toBe(status)
      }
    })
  })

  describe('Fee Configuration', () => {
    it('should default to 3% fee', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_fee',
        stripeAccountId: 'acct_fee',
        email: 'fee@example.com',
        businessName: 'Fee Business',
      })
      expect(account.defaultFeePercent).toBe(3)
    })

    it('should allow custom fee percentage', async () => {
      const account = await ConnectedAccountModel.create({
        userId: 'user_custom',
        stripeAccountId: 'acct_custom',
        email: 'custom@example.com',
        businessName: 'Custom Business',
        defaultFeePercent: 5,
      })
      expect(account.defaultFeePercent).toBe(5)
    })

    it('should reject fee below 0', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_neg',
          stripeAccountId: 'acct_neg',
          email: 'neg@example.com',
          businessName: 'Neg Business',
          defaultFeePercent: -1,
        })
      ).rejects.toThrow()
    })

    it('should reject fee above 100', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_high',
          stripeAccountId: 'acct_high',
          email: 'high@example.com',
          businessName: 'High Business',
          defaultFeePercent: 101,
        })
      ).rejects.toThrow()
    })
  })

  describe('Unique Constraints', () => {
    it('should enforce unique userId', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_unique',
        stripeAccountId: 'acct_1',
        email: 'unique1@example.com',
        businessName: 'Business 1',
      })

      await expect(
        ConnectedAccountModel.create({
          userId: 'user_unique',
          stripeAccountId: 'acct_2',
          email: 'unique2@example.com',
          businessName: 'Business 2',
        })
      ).rejects.toThrow()
    })

    it('should enforce unique stripeAccountId', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_a',
        stripeAccountId: 'acct_shared',
        email: 'a@example.com',
        businessName: 'Business A',
      })

      await expect(
        ConnectedAccountModel.create({
          userId: 'user_b',
          stripeAccountId: 'acct_shared',
          email: 'b@example.com',
          businessName: 'Business B',
        })
      ).rejects.toThrow()
    })
  })
})
