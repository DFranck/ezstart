import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getSubscriptionEventModel,
  type SubscriptionEventDocument,
} from '../../models/subscription-event.js'
import type { Model } from 'mongoose'

describe('SubscriptionEvent Model', () => {
  let SubscriptionEventModel: Model<SubscriptionEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    SubscriptionEventModel = await getSubscriptionEventModel()

    try {
      await SubscriptionEventModel.collection.dropIndexes()
    } catch {
      // ignore — collection may not exist yet
    }
    await SubscriptionEventModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await SubscriptionEventModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('creates a valid SubscriptionEvent with required fields', async () => {
      const event = await SubscriptionEventModel.create({
        stripeEventId: 'evt_1',
        subscriptionId: 'sub_1',
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'active',
      })

      expect(event.stripeEventId).toBe('evt_1')
      expect(event.subscriptionId).toBe('sub_1')
      expect(event.userId).toBe('user-1')
      expect(event.applicationId).toBe('app-1')
      expect(event.status).toBe('active')
      expect(event.appliedAt).toBeInstanceOf(Date)
      expect(event.createdAt).toBeInstanceOf(Date)
    })

    it('persists optional grant arrays when provided', async () => {
      const event = await SubscriptionEventModel.create({
        stripeEventId: 'evt_2',
        subscriptionId: 'sub_2',
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'active',
        grantsRoles: ['pro', 'beta'],
        grantsFeatures: ['advanced-analytics'],
      })

      expect(event.grantsRoles).toEqual(['pro', 'beta'])
      expect(event.grantsFeatures).toEqual(['advanced-analytics'])
    })

    it('requires stripeEventId', async () => {
      await expect(
        SubscriptionEventModel.create({
          subscriptionId: 'sub_3',
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'active',
        })
      ).rejects.toThrow()
    })

    it('requires subscriptionId', async () => {
      await expect(
        SubscriptionEventModel.create({
          stripeEventId: 'evt_3',
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'active',
        })
      ).rejects.toThrow()
    })

    it('requires userId', async () => {
      await expect(
        SubscriptionEventModel.create({
          stripeEventId: 'evt_4',
          subscriptionId: 'sub_4',
          applicationId: 'app-1',
          status: 'active',
        })
      ).rejects.toThrow()
    })

    it('requires applicationId', async () => {
      await expect(
        SubscriptionEventModel.create({
          stripeEventId: 'evt_5',
          subscriptionId: 'sub_5',
          userId: 'user-1',
          status: 'active',
        })
      ).rejects.toThrow()
    })

    it('rejects invalid status values', async () => {
      await expect(
        SubscriptionEventModel.create({
          stripeEventId: 'evt_6',
          subscriptionId: 'sub_6',
          userId: 'user-1',
          applicationId: 'app-1',
          status: 'paused',
        })
      ).rejects.toThrow()
    })

    it('accepts all allowed status values', async () => {
      const statuses = ['active', 'canceled', 'past_due', 'trialing', 'incomplete'] as const
      for (const status of statuses) {
        const event = await SubscriptionEventModel.create({
          stripeEventId: `evt_${status}`,
          subscriptionId: 'sub_s',
          userId: 'user-1',
          applicationId: 'app-1',
          status,
        })
        expect(event.status).toBe(status)
      }
    })
  })

  describe('Idempotency', () => {
    it('enforces unique stripeEventId (idempotency key)', async () => {
      await SubscriptionEventModel.create({
        stripeEventId: 'evt_dup',
        subscriptionId: 'sub_1',
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'active',
      })

      await expect(
        SubscriptionEventModel.create({
          stripeEventId: 'evt_dup',
          subscriptionId: 'sub_2',
          userId: 'user-2',
          applicationId: 'app-2',
          status: 'canceled',
        })
      ).rejects.toThrow()
    })

    it('allows different stripeEventIds for same subscription', async () => {
      await SubscriptionEventModel.create({
        stripeEventId: 'evt_a',
        subscriptionId: 'sub_1',
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'active',
      })
      await SubscriptionEventModel.create({
        stripeEventId: 'evt_b',
        subscriptionId: 'sub_1',
        userId: 'user-1',
        applicationId: 'app-1',
        status: 'canceled',
      })

      const events = await SubscriptionEventModel.find({ subscriptionId: 'sub_1' }).lean()
      expect(events).toHaveLength(2)
    })
  })

  describe('Indexes', () => {
    it('has expected indexes', async () => {
      const indexes = await SubscriptionEventModel.collection.getIndexes()
      const keys = Object.keys(indexes)

      expect(keys.some(k => k.includes('stripeEventId'))).toBe(true)
      expect(keys.some(k => k.includes('subscriptionId'))).toBe(true)
      expect(keys.some(k => k.includes('userId'))).toBe(true)
      expect(keys.some(k => k.includes('applicationId'))).toBe(true)
    })
  })
})
