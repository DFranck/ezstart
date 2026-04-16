import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import type { Model } from 'mongoose'

describe('Connect Fee Service', () => {
  let ConnectedAccountModel: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccountModel = await getConnectedAccountModel()
    try {
      await ConnectedAccountModel.collection.dropIndexes()
    } catch {
      // Ignore
    }
    await ConnectedAccountModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccountModel.deleteMany({})
  })

  describe('resolveConnectFee', () => {
    it('should return isConnect: false when user has no connected account', async () => {
      const result = await resolveConnectFee('nonexistent_user', 10000)
      expect(result.isConnect).toBe(false)
      expect(result.stripeAccountId).toBeUndefined()
      expect(result.applicationFeeAmount).toBeUndefined()
    })

    it('should return isConnect: false when account is not active', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_pending',
        stripeAccountId: 'acct_pending',
        email: 'pending@example.com',
        businessName: 'Pending Biz',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      })

      const result = await resolveConnectFee('user_pending', 10000)
      expect(result.isConnect).toBe(false)
    })

    it('should return isConnect: false when charges are not enabled', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_nochg',
        stripeAccountId: 'acct_nochg',
        email: 'nochg@example.com',
        businessName: 'No Charges Biz',
        status: 'active',
        chargesEnabled: false,
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('user_nochg', 10000)
      expect(result.isConnect).toBe(false)
    })

    it('should return connect fee for active account with charges enabled', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_active',
        stripeAccountId: 'acct_active123',
        email: 'active@example.com',
        businessName: 'Active Business',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 3,
      })

      const result = await resolveConnectFee('user_active', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.stripeAccountId).toBe('acct_active123')
      expect(result.applicationFeeAmount).toBe(300) // 3% of 10000 cents
    })

    it('should calculate fee with custom percentage', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_custom',
        stripeAccountId: 'acct_custom',
        email: 'custom@example.com',
        businessName: 'Custom Fee Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 5,
      })

      const result = await resolveConnectFee('user_custom', 20000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(1000) // 5% of 20000 cents
    })

    it('should round fee amount correctly', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_round',
        stripeAccountId: 'acct_round',
        email: 'round@example.com',
        businessName: 'Round Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 3,
      })

      const result = await resolveConnectFee('user_round', 999)
      // 999 * 3 / 100 = 29.97 -> rounds to 30
      expect(result.applicationFeeAmount).toBe(30)
    })

    it('should handle zero fee percent', async () => {
      await ConnectedAccountModel.create({
        userId: 'user_zero',
        stripeAccountId: 'acct_zero',
        email: 'zero@example.com',
        businessName: 'Zero Fee Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 0,
      })

      const result = await resolveConnectFee('user_zero', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })
  })
})
