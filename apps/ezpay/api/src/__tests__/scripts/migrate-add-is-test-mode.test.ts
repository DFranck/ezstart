/**
 * Tests for the `migrate-add-is-test-mode` ezpay backfill script.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { migrateAddIsTestMode } from '../../scripts/migrate-add-is-test-mode.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getPaymentModel } from '../../models/Payment.js'
import { getPlanModel } from '../../models/Plan.js'
import { getPromoModel } from '../../models/Promo.js'

describe('migrate-add-is-test-mode (ezpay)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const [Payment, Plan, Promo, ConnectedAccount, ApiKey] = await Promise.all([
      getPaymentModel(),
      getPlanModel(),
      getPromoModel(),
      getConnectedAccountModel(),
      getApiKeyModel(),
    ])
    await Promise.all([
      Payment.deleteMany({}),
      Plan.deleteMany({}),
      Promo.deleteMany({}),
      ConnectedAccount.deleteMany({}),
      ApiKey.deleteMany({}),
    ])
  })

  it('derives isTestMode from liveMode on Payment docs', async () => {
    const Payment = await getPaymentModel()
    await Payment.collection.insertMany([
      {
        projectId: 'proj-1',
        projectName: 'Project 1',
        type: 'donation',
        amount: 100,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_live_1',
        status: 'completed',
        isAnonymous: false,
        liveMode: true,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: 'proj-1',
        projectName: 'Project 1',
        type: 'donation',
        amount: 100,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_test_1',
        status: 'completed',
        isAnonymous: false,
        liveMode: false,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await migrateAddIsTestMode()
    expect(result.payments).toBe(2)

    const live = await Payment.collection.findOne({ paymentId: 'pi_live_1' })
    expect(live?.isTestMode).toBe(false)

    const test = await Payment.collection.findOne({ paymentId: 'pi_test_1' })
    expect(test?.isTestMode).toBe(true)
  })

  it('derives isTestMode from env on ApiKey docs', async () => {
    const ApiKey = await getApiKeyModel()
    await ApiKey.collection.insertMany([
      {
        key: 'hash-test-1',
        keyPrefix: 'ez_pk_test_xxx',
        name: 'Test Key',
        userId: 'user-1',
        applicationId: 'app-1',
        appSlug: 'app-1',
        type: 'publishable',
        env: 'test',
        scope: 'user',
        permissions: ['*'],
        status: 'active',
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        quotaMonthly: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'hash-live-1',
        keyPrefix: 'ez_pk_live_xxx',
        name: 'Live Key',
        userId: 'user-1',
        applicationId: 'app-1',
        appSlug: 'app-1',
        type: 'publishable',
        env: 'live',
        scope: 'user',
        permissions: ['*'],
        status: 'active',
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        quotaMonthly: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await migrateAddIsTestMode()
    expect(result.apiKeys).toBe(2)

    const testKey = await ApiKey.collection.findOne({ key: 'hash-test-1' })
    expect(testKey?.isTestMode).toBe(true)

    const liveKey = await ApiKey.collection.findOne({ key: 'hash-live-1' })
    expect(liveKey?.isTestMode).toBe(false)
  })

  it('backfills Plan/Promo/ConnectedAccount with isTestMode=false default', async () => {
    const Plan = await getPlanModel()
    await Plan.collection.insertOne({
      name: 'Pro',
      applicationId: 'app-1',
      amount: 1000,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await migrateAddIsTestMode()
    expect(result.plans).toBe(1)

    const plan = await Plan.collection.findOne({ name: 'Pro' })
    expect(plan?.isTestMode).toBe(false)
  })

  it('is idempotent — second run touches zero documents', async () => {
    const Plan = await getPlanModel()
    await Plan.collection.insertOne({
      name: 'Idempotent',
      applicationId: 'app-1',
      amount: 1000,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const first = await migrateAddIsTestMode()
    expect(first.plans).toBe(1)

    const second = await migrateAddIsTestMode()
    expect(second.plans).toBe(0)
    expect(second.payments).toBe(0)
    expect(second.apiKeys).toBe(0)
  })
})
