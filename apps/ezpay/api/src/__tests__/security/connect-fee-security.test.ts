/**
 * Security tests for Stripe Connect fee calculation
 *
 * Attack vectors tested:
 * - Fee calculation with 0 amount
 * - Fee calculation with negative amount
 * - Fee with fractional cents (rounding)
 * - Fee percentage edge cases (0%, 100%)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getConnectedAccountModel, type ConnectedAccountDocument } from '../../models/ConnectedAccount.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import type { Model } from 'mongoose'

describe('Connect Fee Security', () => {
  let ConnectedAccount: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccount = await getConnectedAccountModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
  })

  const createActiveAccount = (userId: string, feePercent = 3) =>
    ConnectedAccount.create({
      userId,
      stripeAccountId: `acct_${userId}`,
      email: 'test@test.com',
      businessName: 'Test',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      defaultFeePercent: feePercent,
    })

  // =========================================================================
  // Fee with edge amounts
  // =========================================================================
  describe('Fee calculation edge cases', () => {
    it('fee with 0 amount should return 0 fee', async () => {
      await createActiveAccount('user1')
      const result = await resolveConnectFee('user1', 0)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('FIXED: fee with negative amount is clamped to 0', async () => {
      await createActiveAccount('user2')
      const result = await resolveConnectFee('user2', -1000)
      // Negative amounts are now clamped to 0 via Math.max(0, amount)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('fee rounding with fractional cents', async () => {
      await createActiveAccount('user3', 7)
      // 7% of 333 cents = 23.31 -> rounds to 23
      const result = await resolveConnectFee('user3', 333)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(23)
    })

    it('fee with 0% should return 0', async () => {
      await createActiveAccount('user4', 0)
      const result = await resolveConnectFee('user4', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('fee with 100% takes entire amount', async () => {
      await createActiveAccount('user5', 100)
      const result = await resolveConnectFee('user5', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(10000)
    })
  })

  // =========================================================================
  // Account status checks
  // =========================================================================
  describe('Account status filtering', () => {
    it('should not route through inactive account', async () => {
      await ConnectedAccount.create({
        userId: 'inactive1',
        stripeAccountId: 'acct_inactive1',
        email: 'test@test.com',
        businessName: 'Test',
        status: 'active',
        chargesEnabled: false, // Not enabled
        payoutsEnabled: true,
        defaultFeePercent: 3,
      })

      const result = await resolveConnectFee('inactive1', 1000)
      expect(result.isConnect).toBe(false)
    })

    it('should not route through pending account', async () => {
      await ConnectedAccount.create({
        userId: 'pending1',
        stripeAccountId: 'acct_pending1',
        email: 'test@test.com',
        businessName: 'Test',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
        defaultFeePercent: 3,
      })

      const result = await resolveConnectFee('pending1', 1000)
      expect(result.isConnect).toBe(false)
    })

    it('should return isConnect false for unknown user', async () => {
      const result = await resolveConnectFee('nonexistent', 1000)
      expect(result.isConnect).toBe(false)
    })
  })
})
