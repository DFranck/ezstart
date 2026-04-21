/**
 * Tests for migrate-connected-accounts-to-applications (P7 Phase B).
 *
 * Uses MongoMemoryServer via @ezstart/test-utils and injects stub resolvers
 * for the ezauth lookups so no real network call is made.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  migrateConnectedAccountsToApplications,
  PLATFORM_APPS,
  SYSTEM_USER_MARKER,
} from '../../scripts/migrate-connected-accounts-to-applications.js'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import type { EzauthApplicationLookup } from '../../services/ezauth-client.js'
import type { Model } from 'mongoose'

type ConnectedAccountModel = Model<ConnectedAccountDocument>

const PLATFORM_STRIPE_ACCOUNT = 'acct_platform_ezstart_llc'

/**
 * Stub ezauth lookup: returns `{ id, slug, name }` for every PLATFORM_APPS
 * slug so the platform seed step finds them all.
 */
function allPlatformLookup(): (slug: string) => Promise<EzauthApplicationLookup | null> {
  return vi.fn(async (slug: string) => {
    if ((PLATFORM_APPS as readonly string[]).includes(slug)) {
      return { id: `ezauth-app-${slug}`, slug, name: slug }
    }
    return null
  })
}

describe('migrate-connected-accounts-to-applications', () => {
  let ConnectedAccount: ConnectedAccountModel

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccount = await getConnectedAccountModel()
    try {
      await ConnectedAccount.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ConnectedAccount.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    delete process.env.EZPAY_PLATFORM_STRIPE_ACCOUNT_ID
  })

  // ------------------------------------------------------------------
  // Platform seed
  // ------------------------------------------------------------------

  describe('platform seed', () => {
    it('seeds one platform account per PLATFORM_APPS slug when env is set', async () => {
      const result = await migrateConnectedAccountsToApplications({
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
        lookupApplication: allPlatformLookup(),
      })

      expect(result.createdPlatform).toBe(PLATFORM_APPS.length)
      expect(result.missingApplications).toBe(0)
      expect(result.linked).toBe(0)
      expect(result.unlinkable).toBe(0)
      expect(result.skippedExistingPlatform).toBe(0)

      for (const slug of PLATFORM_APPS) {
        const doc = await ConnectedAccount.findOne({ applicationId: `ezauth-app-${slug}` }).lean()
        expect(doc).not.toBeNull()
        expect(doc?.isPlatformAccount).toBe(true)
        expect(doc?.stripeAccountId).toBe(PLATFORM_STRIPE_ACCOUNT)
        expect(doc?.userId).toBe(SYSTEM_USER_MARKER)
        expect(doc?.status).toBe('active')
        expect(doc?.chargesEnabled).toBe(true)
        expect(doc?.payoutsEnabled).toBe(true)
        expect(doc?.accountType).toBe('standard')
        expect(doc?.defaultFeePercent).toBe(0)
        expect(doc?.onboardedAt).toBeInstanceOf(Date)
      }
    })

    it('reads platform account id from env var when not passed explicitly', async () => {
      process.env.EZPAY_PLATFORM_STRIPE_ACCOUNT_ID = PLATFORM_STRIPE_ACCOUNT

      const result = await migrateConnectedAccountsToApplications({
        lookupApplication: allPlatformLookup(),
      })

      expect(result.createdPlatform).toBe(PLATFORM_APPS.length)
    })

    it('skips platform seed and logs warn when env var is missing', async () => {
      const result = await migrateConnectedAccountsToApplications({
        lookupApplication: allPlatformLookup(),
      })

      expect(result.createdPlatform).toBe(0)
      expect(result.skippedExistingPlatform).toBe(0)
      // Accounts should not exist since the seed was skipped.
      const count = await ConnectedAccount.countDocuments({})
      expect(count).toBe(0)
    })

    it('counts missingApplications when an ezauth lookup returns null', async () => {
      const lookup = vi.fn(async (slug: string) => {
        // Only ezauth exists; the rest are "missing" from ezauth.
        if (slug === 'ezauth') {
          return { id: 'ezauth-app-ezauth', slug, name: 'EZAuth' }
        }
        return null
      })

      const result = await migrateConnectedAccountsToApplications({
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
        lookupApplication: lookup,
      })

      expect(result.createdPlatform).toBe(1)
      expect(result.missingApplications).toBe(PLATFORM_APPS.length - 1)
    })
  })

  // ------------------------------------------------------------------
  // Idempotence
  // ------------------------------------------------------------------

  describe('idempotence', () => {
    it('second run creates zero new platform rows', async () => {
      const firstLookup = allPlatformLookup()
      const first = await migrateConnectedAccountsToApplications({
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
        lookupApplication: firstLookup,
      })
      expect(first.createdPlatform).toBe(PLATFORM_APPS.length)

      const secondLookup = allPlatformLookup()
      const second = await migrateConnectedAccountsToApplications({
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
        lookupApplication: secondLookup,
      })

      expect(second.createdPlatform).toBe(0)
      expect(second.skippedExistingPlatform).toBe(PLATFORM_APPS.length)

      const count = await ConnectedAccount.countDocuments({})
      expect(count).toBe(PLATFORM_APPS.length)
    })

    it('does NOT overwrite a converted account (isPlatformAccount=false stays false)', async () => {
      // Pre-existing external account for ezauth — someone ran `convert` and
      // switched away from the shared Stripe account.
      await ConnectedAccount.create({
        applicationId: 'ezauth-app-ezauth',
        userId: 'owner-user',
        isPlatformAccount: false,
        stripeAccountId: 'acct_external_custom',
        email: 'owner@example.com',
        businessName: 'External Biz',
        accountType: 'standard',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 3,
      })

      const result = await migrateConnectedAccountsToApplications({
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
        lookupApplication: allPlatformLookup(),
      })

      expect(result.skippedExistingPlatform).toBeGreaterThanOrEqual(1)

      const preserved = await ConnectedAccount.findOne({
        applicationId: 'ezauth-app-ezauth',
      }).lean()
      expect(preserved?.isPlatformAccount).toBe(false)
      expect(preserved?.stripeAccountId).toBe('acct_external_custom')
      expect(preserved?.userId).toBe('owner-user')
    })
  })

  // ------------------------------------------------------------------
  // Backfill — pre-migration accounts without applicationId
  // ------------------------------------------------------------------

  describe('backfill legacy accounts', () => {
    async function insertLegacyAccount(userId: string, stripeAccountId: string) {
      // Insert through the raw collection so we can omit `applicationId`
      // (which the schema now marks required).
      await ConnectedAccount.collection.insertOne({
        userId,
        stripeAccountId,
        email: `${userId}@example.com`,
        businessName: `Biz ${userId}`,
        accountType: 'standard',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 3,
        onboardedAt: new Date(),
        isPlatformAccount: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    it('links legacy rows to their primary ezauth Application', async () => {
      await insertLegacyAccount('legacy-user-1', 'acct_legacy_1')

      const resolvePrimary = vi.fn(async (userId: string) => {
        if (userId === 'legacy-user-1') {
          return { id: 'app-legacy-1', slug: 'some-app', name: 'Some App' }
        }
        return null
      })

      const result = await migrateConnectedAccountsToApplications({
        resolvePrimaryApplication: resolvePrimary,
        lookupApplication: allPlatformLookup(),
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
      })

      expect(result.linked).toBe(1)
      expect(result.unlinkable).toBe(0)

      const linked = await ConnectedAccount.findOne({ stripeAccountId: 'acct_legacy_1' }).lean()
      expect(linked?.applicationId).toBe('app-legacy-1')
      expect(linked?.isPlatformAccount).toBe(false)
    })

    it('leaves unlinkable rows alone and counts them', async () => {
      await insertLegacyAccount('legacy-user-orphan', 'acct_orphan')

      const resolvePrimary = vi.fn(async () => null)

      const result = await migrateConnectedAccountsToApplications({
        resolvePrimaryApplication: resolvePrimary,
        lookupApplication: allPlatformLookup(),
        platformStripeAccountId: PLATFORM_STRIPE_ACCOUNT,
      })

      expect(result.linked).toBe(0)
      expect(result.unlinkable).toBe(1)

      const row = await ConnectedAccount.findOne({ stripeAccountId: 'acct_orphan' }).lean()
      expect(row?.applicationId == null || row?.applicationId === '').toBe(true)
    })
  })
})
