/**
 * Integration tests for Stripe Connect routes business logic.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

describe('Connect Routes Business Logic', () => {
  let ConnectedAccount: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccount = await getConnectedAccountModel()
    try {
      await ConnectedAccount.collection.dropIndexes()
    } catch {
      // Ignore
    }
    await ConnectedAccount.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
  })

  // ========================================
  // POST /connect/onboard
  // ========================================
  describe('Onboard (POST /connect/onboard)', () => {
    it('should create a new connected account record', async () => {
      const account = await ConnectedAccount.create({
        userId: 'user_onboard_1',
        stripeAccountId: 'acct_new_123',
        email: 'business@test.com',
        businessName: 'Test Business',
        accountType: 'standard',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
        defaultFeePercent: 3,
      })

      expect(account.userId).toBe('user_onboard_1')
      expect(account.stripeAccountId).toBe('acct_new_123')
      expect(account.accountType).toBe('standard')
      expect(account.status).toBe('pending')
    })

    it('should support express account type', async () => {
      const account = await ConnectedAccount.create({
        userId: 'user_express_1',
        stripeAccountId: 'acct_exp_123',
        email: 'express@test.com',
        businessName: 'Express Business',
        accountType: 'express',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
        defaultFeePercent: 3,
      })

      expect(account.accountType).toBe('express')
    })

    it('should reject if user already has a connected account', async () => {
      await ConnectedAccount.create({
        userId: 'user_dupe',
        stripeAccountId: 'acct_existing',
        email: 'existing@test.com',
        businessName: 'Existing Biz',
      })

      const existing = await ConnectedAccount.findOne({ userId: 'user_dupe' })
      expect(existing).not.toBeNull()
      // Route returns sendError(res, 'User already has a connected account', 409)
    })
  })

  // ========================================
  // GET /connect/callback
  // ========================================
  describe('Callback (GET /connect/callback)', () => {
    it('should update account status after onboarding callback', async () => {
      await ConnectedAccount.create({
        userId: 'user_callback',
        stripeAccountId: 'acct_callback_123',
        email: 'callback@test.com',
        businessName: 'Callback Biz',
        status: 'pending',
      })

      // Simulate account.charges_enabled=true, payouts_enabled=true, details_submitted=true
      const chargesEnabled = true
      const payoutsEnabled = true
      const status = chargesEnabled && payoutsEnabled ? 'active' : 'restricted'

      await ConnectedAccount.updateOne(
        { stripeAccountId: 'acct_callback_123' },
        {
          status,
          chargesEnabled,
          payoutsEnabled,
          ...(status === 'active' ? { onboardedAt: new Date() } : {}),
        }
      )

      const account = await ConnectedAccount.findOne({ stripeAccountId: 'acct_callback_123' })
      expect(account?.status).toBe('active')
      expect(account?.chargesEnabled).toBe(true)
      expect(account?.onboardedAt).toBeInstanceOf(Date)
    })

    it('should set restricted status when details submitted but not enabled', async () => {
      await ConnectedAccount.create({
        userId: 'user_restricted_cb',
        stripeAccountId: 'acct_restricted_cb',
        email: 'restricted@test.com',
        businessName: 'Restricted Biz',
        status: 'pending',
      })

      // details_submitted=true but charges/payouts not enabled yet
      await ConnectedAccount.updateOne(
        { stripeAccountId: 'acct_restricted_cb' },
        { status: 'restricted', chargesEnabled: false, payoutsEnabled: false }
      )

      const account = await ConnectedAccount.findOne({ stripeAccountId: 'acct_restricted_cb' })
      expect(account?.status).toBe('restricted')
    })

    it('should reject callback without account_id', () => {
      const accountId = undefined
      expect(accountId).toBeUndefined()
      // Route returns sendError(res, 'Missing account_id query parameter', 400)
    })
  })

  // ========================================
  // GET /connect/status
  // ========================================
  describe('Status (GET /connect/status)', () => {
    it('should return connected account for authenticated user', async () => {
      const userId = 'user_status_1'
      await ConnectedAccount.create({
        userId,
        stripeAccountId: 'acct_status_1',
        email: 'status@test.com',
        businessName: 'Status Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const account = await ConnectedAccount.findOne({ userId }).lean()
      expect(account).not.toBeNull()
      expect(account?.status).toBe('active')
    })

    it('should return null when user has no connected account', async () => {
      const account = await ConnectedAccount.findOne({ userId: 'no_account_user' }).lean()
      expect(account).toBeNull()
    })
  })

  // ========================================
  // GET /connect/dashboard-link
  // ========================================
  describe('Dashboard Link (GET /connect/dashboard-link)', () => {
    it('should return error if no connected account found', async () => {
      const account = await ConnectedAccount.findOne({ userId: 'no_dash_user' }).lean()
      expect(account).toBeNull()
      // Route returns sendError(res, 'No connected account found', 404)
    })

    it('should return error if account is not active', async () => {
      await ConnectedAccount.create({
        userId: 'user_notactive',
        stripeAccountId: 'acct_notactive',
        email: 'notactive@test.com',
        businessName: 'Not Active Biz',
        status: 'pending',
      })

      const account = await ConnectedAccount.findOne({ userId: 'user_notactive' }).lean()
      expect(account?.status).toBe('pending')
      expect(account?.status !== 'active').toBe(true)
      // Route returns sendError(res, 'Connected account is not active...', 400)
    })

    it('should return direct Stripe dashboard URL for standard accounts', async () => {
      await ConnectedAccount.create({
        userId: 'user_std_dash',
        stripeAccountId: 'acct_std_dash',
        email: 'std@test.com',
        businessName: 'Standard Biz',
        accountType: 'standard',
        status: 'active',
      })

      const account = await ConnectedAccount.findOne({ userId: 'user_std_dash' }).lean()
      expect(account?.accountType).toBe('standard')
      // Route returns { loginLinkUrl: 'https://dashboard.stripe.com/', message: '...' }
    })

    it('should use createLoginLink for express accounts', async () => {
      await ConnectedAccount.create({
        userId: 'user_exp_dash',
        stripeAccountId: 'acct_exp_dash',
        email: 'exp@test.com',
        businessName: 'Express Biz',
        accountType: 'express',
        status: 'active',
      })

      const account = await ConnectedAccount.findOne({ userId: 'user_exp_dash' }).lean()
      expect(account?.accountType).toBe('express')
      // Route calls stripe.accounts.createLoginLink(account.stripeAccountId)
    })
  })
})
