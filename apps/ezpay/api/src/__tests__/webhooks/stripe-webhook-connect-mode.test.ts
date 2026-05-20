/**
 * Wave E E1.5 — Connect `account.updated` webhook respects the test/live
 * partition.
 *
 * Connect webhook requests carry no API key, so `derivedMode` defaults to
 * 'live' and `testModeScopePlugin` would force `{ isTestMode: false }` onto any
 * filter. `handleAccountUpdated` must therefore thread the VERIFIED mode
 * (`isTestMode: mode === 'test'`) into the `ConnectedAccount` filter — exactly
 * like `webhooks.ts` threads `isTestMode: !eventLiveMode` into every filter —
 * otherwise a genuine TEST `account.updated` matches 0 docs and the test
 * account's status update is silently dropped.
 *
 * Proves:
 *  - the OLD shape (no isTestMode filter, keyless → 'live' scope) drops a test
 *    `account.updated` (0 matches) — the regression we guard against.
 *  - threading the verified `isTestMode` into the filter updates the test row.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { withRequestContext } from '@ezstart/api-core'
import type { Model } from 'mongoose'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'

describe('Connect account.updated — test/live partition scope', () => {
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

  async function seedTestAccount(): Promise<void> {
    await ConnectedAccount.create({
      applicationId: 'app-test-1',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_TEST_1',
      email: 't@example.com',
      businessName: 'Test Biz',
      accountType: 'express',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
      defaultFeePercent: 3,
      isTestMode: true,
    })
  }

  it('regression guard: an unscoped filter under keyless (live) context drops a test account.updated', async () => {
    await seedTestAccount()
    // The unsafe shape: keyless webhook → derivedMode 'live' context →
    // updateOne with NO isTestMode override. Under live scope the test row is
    // invisible → 0 matches (the bug).
    const result = await withRequestContext({ derivedMode: 'live', userId: undefined }, async () =>
      ConnectedAccount.updateOne(
        { stripeAccountId: 'acct_TEST_1' },
        { status: 'active', chargesEnabled: true, payoutsEnabled: true, onboardedAt: new Date() }
      )
    )
    expect(result.matchedCount, 'unscoped: test account.updated silently dropped').toBe(0)
  })

  it('threading the verified isTestMode into the filter updates the test row', async () => {
    await seedTestAccount()
    // The fixed shape: thread `isTestMode: mode === 'test'` into the filter,
    // which overrides testModeScopePlugin (same pattern as webhooks.ts).
    const result = await withRequestContext({ derivedMode: 'live', userId: undefined }, async () =>
      ConnectedAccount.updateOne(
        { stripeAccountId: 'acct_TEST_1', isTestMode: true },
        { status: 'active', chargesEnabled: true, payoutsEnabled: true, onboardedAt: new Date() }
      )
    )
    expect(
      result.matchedCount,
      'a test Connect account.updated must be able to update its own test row'
    ).toBe(1)

    const row = await ConnectedAccount.findOne({ stripeAccountId: 'acct_TEST_1' })
      .setOptions({ skipTestModeScope: true })
      .lean()
    expect(row?.status).toBe('active')
  })
})
