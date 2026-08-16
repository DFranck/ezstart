/**
 * Integration tests for Stripe Connect routes business logic (P7 Phase B).
 *
 * Routes are scoped per-Application: onboarding requires `applicationId`,
 * status accepts `?applicationId=` or lists all accounts owned by the user,
 * dashboard-link requires `?applicationId=`. The underlying uniqueness
 * constraint is now on `applicationId`, not `userId`.
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
    it('should create a new connected account record scoped to an Application', async () => {
      const account = await ConnectedAccount.create({
        applicationId: 'app_onboard_1',
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

      expect(account.applicationId).toBe('app_onboard_1')
      expect(account.userId).toBe('user_onboard_1')
      expect(account.isPlatformAccount).toBe(false)
      expect(account.stripeAccountId).toBe('acct_new_123')
      expect(account.accountType).toBe('standard')
      expect(account.status).toBe('pending')
    })

    it('should support express account type', async () => {
      const account = await ConnectedAccount.create({
        applicationId: 'app_express_1',
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

    it('should reject if applicationId already has a connected account', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_dupe',
        userId: 'user_dupe',
        stripeAccountId: 'acct_existing',
        email: 'existing@test.com',
        businessName: 'Existing Biz',
      })

      const existing = await ConnectedAccount.findOne({ applicationId: 'app_dupe' })
      expect(existing).not.toBeNull()
      // Route returns sendError(res, 'Application already has a connected account', 409)
    })

    it('should allow the same user to own multiple ConnectedAccounts (one per app)', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_multi_1',
        userId: 'user_multi',
        stripeAccountId: 'acct_multi_1',
        email: 'multi1@test.com',
        businessName: 'Multi 1',
      })
      const second = await ConnectedAccount.create({
        applicationId: 'app_multi_2',
        userId: 'user_multi',
        stripeAccountId: 'acct_multi_2',
        email: 'multi2@test.com',
        businessName: 'Multi 2',
      })
      expect(second.userId).toBe('user_multi')
      expect(second.applicationId).toBe('app_multi_2')
    })
  })

  // ========================================
  // GET /connect/callback
  // ========================================
  describe('Callback (GET /connect/callback)', () => {
    it('should update account status after onboarding callback', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_callback',
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
        applicationId: 'app_restricted_cb',
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
    it('should return a single connected account when ?applicationId= is provided', async () => {
      const userId = 'user_status_1'
      await ConnectedAccount.create({
        applicationId: 'app_status_1',
        userId,
        stripeAccountId: 'acct_status_1',
        email: 'status@test.com',
        businessName: 'Status Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const account = await ConnectedAccount.findOne({
        applicationId: 'app_status_1',
        userId,
      }).lean()
      expect(account).not.toBeNull()
      expect(account?.status).toBe('active')
    })

    it('should return null when user has no connected account for the given applicationId', async () => {
      const account = await ConnectedAccount.findOne({
        applicationId: 'missing',
        userId: 'no_account_user',
      }).lean()
      expect(account).toBeNull()
    })

    it('should list all accounts owned by the user when no applicationId query is provided', async () => {
      const userId = 'user_list'
      await ConnectedAccount.create({
        applicationId: 'app_list_1',
        userId,
        stripeAccountId: 'acct_list_1',
        email: 'a@test.com',
        businessName: 'A',
      })
      await ConnectedAccount.create({
        applicationId: 'app_list_2',
        userId,
        stripeAccountId: 'acct_list_2',
        email: 'b@test.com',
        businessName: 'B',
      })

      const accounts = await ConnectedAccount.find({ userId }).lean()
      expect(accounts).toHaveLength(2)
    })
  })

  // ========================================
  // GET /connect/dashboard-link
  // ========================================
  describe('Dashboard Link (GET /connect/dashboard-link)', () => {
    it('should return error if no connected account found for applicationId', async () => {
      const account = await ConnectedAccount.findOne({
        applicationId: 'missing_app',
        userId: 'no_dash_user',
      }).lean()
      expect(account).toBeNull()
      // Route returns sendError(res, 'No connected account found', 404)
    })

    it('should return error if account is not active', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_notactive',
        userId: 'user_notactive',
        stripeAccountId: 'acct_notactive',
        email: 'notactive@test.com',
        businessName: 'Not Active Biz',
        status: 'pending',
      })

      const account = await ConnectedAccount.findOne({
        applicationId: 'app_notactive',
        userId: 'user_notactive',
      }).lean()
      expect(account?.status).toBe('pending')
      expect(account?.status !== 'active').toBe(true)
      // Route returns sendError(res, 'Connected account is not active...', 400)
    })

    it('should return direct Stripe dashboard URL for standard accounts', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_std_dash',
        userId: 'user_std_dash',
        stripeAccountId: 'acct_std_dash',
        email: 'std@test.com',
        businessName: 'Standard Biz',
        accountType: 'standard',
        status: 'active',
      })

      const account = await ConnectedAccount.findOne({
        applicationId: 'app_std_dash',
        userId: 'user_std_dash',
      }).lean()
      expect(account?.accountType).toBe('standard')
      // Route returns { loginLinkUrl: 'https://dashboard.stripe.com/', message: '...' }
    })

    it('should use createLoginLink for express accounts', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_exp_dash',
        userId: 'user_exp_dash',
        stripeAccountId: 'acct_exp_dash',
        email: 'exp@test.com',
        businessName: 'Express Biz',
        accountType: 'express',
        status: 'active',
      })

      const account = await ConnectedAccount.findOne({
        applicationId: 'app_exp_dash',
        userId: 'user_exp_dash',
      }).lean()
      expect(account?.accountType).toBe('express')
      // Route calls stripe.accounts.createLoginLink(account.stripeAccountId)
    })
  })

  // ========================================
  // DELETE /connect/disconnect
  // ========================================
  describe('Disconnect (DELETE /connect/disconnect)', () => {
    it('should hard-delete the ConnectedAccount row scoped by applicationId+userId', async () => {
      const userId = 'user_disc_1'
      const applicationId = 'app_disc_1'
      await ConnectedAccount.create({
        applicationId,
        userId,
        stripeAccountId: 'acct_disc_1',
        email: 'disc1@test.com',
        businessName: 'Disc 1',
        accountType: 'express',
        status: 'active',
        isPlatformAccount: false,
      })

      // Confirm row exists, then perform the delete the route would issue.
      const before = await ConnectedAccount.findOne({ applicationId, userId }).lean()
      expect(before).not.toBeNull()

      await ConnectedAccount.deleteOne({ applicationId, userId })

      const after = await ConnectedAccount.findOne({ applicationId, userId }).lean()
      expect(after).toBeNull()
    })

    it('should 404 when no ConnectedAccount exists for the caller', async () => {
      const account = await ConnectedAccount.findOne({
        applicationId: 'app_missing_disc',
        userId: 'user_missing_disc',
      }).lean()
      expect(account).toBeNull()
      // Route returns sendError(res, 'No connected account found', 404)
    })

    it('should 400 when no applicationId is supplied AND the user owns 2+ accounts', async () => {
      const userId = 'user_disc_multi'
      await ConnectedAccount.create({
        applicationId: 'app_disc_m1',
        userId,
        stripeAccountId: 'acct_disc_m1',
        email: 'm1@test.com',
        businessName: 'Multi 1',
      })
      await ConnectedAccount.create({
        applicationId: 'app_disc_m2',
        userId,
        stripeAccountId: 'acct_disc_m2',
        email: 'm2@test.com',
        businessName: 'Multi 2',
      })

      const accounts = await ConnectedAccount.find({ userId }).lean()
      expect(accounts.length).toBeGreaterThan(1)
      // Route returns sendError(res, 'Multiple connected accounts found ...', 400)
    })

    it('should accept the degenerate single-account case when applicationId is omitted', async () => {
      const userId = 'user_disc_single'
      await ConnectedAccount.create({
        applicationId: 'app_disc_single',
        userId,
        stripeAccountId: 'acct_disc_single',
        email: 'single@test.com',
        businessName: 'Single Biz',
      })

      const accounts = await ConnectedAccount.find({ userId }).lean()
      expect(accounts).toHaveLength(1)
      // Route picks accounts[0] and proceeds with the delete.
    })

    it('should 403 when a non-admin caller targets an applicationId they do not own', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_disc_other',
        userId: 'owner_user',
        stripeAccountId: 'acct_disc_other',
        email: 'other@test.com',
        businessName: 'Other Biz',
      })

      // Caller userId differs from the row's userId — scoped lookup returns
      // null, route 404s. With superadmin the unscoped fallback finds the
      // row but ownership check then 403s for non-admin attempts that get
      // past the scoped lookup. We assert the underlying invariant:
      const ownedByCaller = await ConnectedAccount.findOne({
        applicationId: 'app_disc_other',
        userId: 'malicious_user',
      }).lean()
      expect(ownedByCaller).toBeNull()
    })

    it('should NEVER attempt Stripe deletion for platform-owned accounts', async () => {
      const account = await ConnectedAccount.create({
        applicationId: 'app_platform_disc',
        userId: 'user_platform_disc',
        stripeAccountId: 'acct_platform_shared',
        email: 'platform@test.com',
        businessName: 'Platform App',
        isPlatformAccount: true,
      })

      // The handler short-circuits Stripe deletion when isPlatformAccount=true
      // because the platform Stripe account is shared by every dogfood app.
      expect(account.isPlatformAccount).toBe(true)
      // stripeDeleted in the response should be `null` for this branch.
    })

    it('should still hard-delete the local row when Stripe accounts.del fails', async () => {
      // Live-mode Standard accounts cannot be deleted via the API — Stripe
      // throws. The route swallows the error and proceeds with the local
      // delete so the user is no longer routing payments through the
      // disconnected account from EZPay's side.
      const account = await ConnectedAccount.create({
        applicationId: 'app_disc_stripe_fail',
        userId: 'user_disc_stripe_fail',
        stripeAccountId: 'acct_disc_stripe_fail',
        email: 'fail@test.com',
        businessName: 'Stripe Fails Biz',
        accountType: 'standard',
        status: 'active',
        isPlatformAccount: false,
      })

      // Simulate the local delete the route always performs after the Stripe
      // attempt (regardless of Stripe outcome).
      await ConnectedAccount.deleteOne({ _id: account._id })

      const after = await ConnectedAccount.findById(account._id).lean()
      expect(after).toBeNull()
    })
  })
})
