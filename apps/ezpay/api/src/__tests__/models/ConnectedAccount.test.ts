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
        applicationId: 'app_123',
        userId: 'user_123',
        stripeAccountId: 'acct_abc123',
        email: 'business@example.com',
        businessName: 'Test Business',
        accountType: 'standard',
      })

      expect(account.applicationId).toBe('app_123')
      expect(account.userId).toBe('user_123')
      expect(account.isPlatformAccount).toBe(false)
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

    it('should default isPlatformAccount to false', async () => {
      const account = await ConnectedAccountModel.create({
        applicationId: 'app_default',
        userId: 'user_default',
        stripeAccountId: 'acct_default',
        email: 'default@example.com',
        businessName: 'Default Biz',
      })
      expect(account.isPlatformAccount).toBe(false)
    })

    it('should accept isPlatformAccount: true', async () => {
      const account = await ConnectedAccountModel.create({
        applicationId: 'app_platform',
        userId: 'system',
        isPlatformAccount: true,
        stripeAccountId: 'acct_platform_shared',
        email: 'platform@ezstart.dev',
        businessName: 'EZStart Platform',
      })
      expect(account.isPlatformAccount).toBe(true)
    })

    it('should require applicationId', async () => {
      await expect(
        ConnectedAccountModel.create({
          userId: 'user_123',
          stripeAccountId: 'acct_abc123',
          email: 'test@example.com',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require userId', async () => {
      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_missing_user',
          stripeAccountId: 'acct_abc123',
          email: 'test@example.com',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require stripeAccountId', async () => {
      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_missing_stripe',
          userId: 'user_123',
          email: 'test@example.com',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require email', async () => {
      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_missing_email',
          userId: 'user_123',
          stripeAccountId: 'acct_abc123',
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })

    it('should require businessName', async () => {
      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_missing_name',
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
        applicationId: 'app_std',
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
        applicationId: 'app_exp',
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
          applicationId: 'app_bad',
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
        applicationId: 'app_new',
        userId: 'user_new',
        stripeAccountId: 'acct_new',
        email: 'new@example.com',
        businessName: 'New Business',
      })
      expect(account.status).toBe('pending')
    })

    it('should update to active status', async () => {
      const account = await ConnectedAccountModel.create({
        applicationId: 'app_active',
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
        applicationId: 'app_restricted',
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
          applicationId: `app_${status}`,
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
        applicationId: 'app_fee',
        userId: 'user_fee',
        stripeAccountId: 'acct_fee',
        email: 'fee@example.com',
        businessName: 'Fee Business',
      })
      expect(account.defaultFeePercent).toBe(3)
    })

    it('should allow custom fee percentage', async () => {
      const account = await ConnectedAccountModel.create({
        applicationId: 'app_custom_fee',
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
          applicationId: 'app_neg',
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
          applicationId: 'app_high',
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
    it('should enforce unique applicationId', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_unique',
        userId: 'user_a',
        stripeAccountId: 'acct_1',
        email: 'unique1@example.com',
        businessName: 'Business 1',
      })

      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_unique',
          userId: 'user_b',
          stripeAccountId: 'acct_2',
          email: 'unique2@example.com',
          businessName: 'Business 2',
        })
      ).rejects.toThrow()
    })

    it('should NOT enforce unique userId (multiple apps per user)', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_a',
        userId: 'user_multi',
        stripeAccountId: 'acct_a',
        email: 'a@example.com',
        businessName: 'Biz A',
      })

      const second = await ConnectedAccountModel.create({
        applicationId: 'app_b',
        userId: 'user_multi',
        stripeAccountId: 'acct_b',
        email: 'b@example.com',
        businessName: 'Biz B',
      })
      expect(second.userId).toBe('user_multi')
      expect(second.applicationId).toBe('app_b')
    })

    it('should enforce unique stripeAccountId', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_stripe_a',
        userId: 'user_a',
        stripeAccountId: 'acct_shared',
        email: 'a@example.com',
        businessName: 'Business A',
      })

      await expect(
        ConnectedAccountModel.create({
          applicationId: 'app_stripe_b',
          userId: 'user_b',
          stripeAccountId: 'acct_shared',
          email: 'b@example.com',
          businessName: 'Business B',
        })
      ).rejects.toThrow()
    })
  })

  describe('Conversion metadata', () => {
    it('persists previousStripeAccountId + transitionedAt + transitionedBy', async () => {
      const account = await ConnectedAccountModel.create({
        applicationId: 'app_convert',
        userId: 'user_convert',
        stripeAccountId: 'acct_original',
        email: 'conv@example.com',
        businessName: 'Convert Biz',
        isPlatformAccount: true,
      })

      const now = new Date()
      await ConnectedAccountModel.updateOne(
        { _id: account._id },
        {
          stripeAccountId: 'acct_new_external',
          isPlatformAccount: false,
          metadata: {
            previousStripeAccountId: 'acct_original',
            transitionedAt: now,
            transitionedBy: 'user_admin',
          },
        }
      )

      const updated = await ConnectedAccountModel.findById(account._id).lean()
      expect(updated?.stripeAccountId).toBe('acct_new_external')
      expect(updated?.isPlatformAccount).toBe(false)
      expect(updated?.metadata?.previousStripeAccountId).toBe('acct_original')
      expect(updated?.metadata?.transitionedAt).toEqual(now)
      expect(updated?.metadata?.transitionedBy).toBe('user_admin')
    })
  })
})
