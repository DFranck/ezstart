/**
 * Tests for the EZPay ApiKeyUsage model — daily buckets + aggregation.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Model } from 'mongoose'
import { getApiKeyUsageModel, type ApiKeyUsageDocument } from '../../models/api-key-usage.js'

describe('EZPay ApiKeyUsage Model', () => {
  let Usage: Model<ApiKeyUsageDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Usage = await getApiKeyUsageModel()
    try {
      await Usage.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Usage.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Usage.deleteMany({})
  })

  it('creates a daily bucket with defaults', async () => {
    const doc = await Usage.create({
      apiKeyId: 'key-1',
      userId: 'user-1',
      date: '2026-04-20',
    })
    expect(doc.requestCount).toBe(0)
    expect(doc.endpoints.size).toBe(0)
  })

  it('increments requestCount and endpoints on upsert', async () => {
    await Usage.updateOne(
      { apiKeyId: 'key-1', date: '2026-04-20' },
      {
        $inc: { requestCount: 1, 'endpoints./payments': 1 },
        $setOnInsert: { userId: 'user-1' },
      },
      { upsert: true }
    )

    await Usage.updateOne(
      { apiKeyId: 'key-1', date: '2026-04-20' },
      {
        $inc: { requestCount: 1, 'endpoints./payments': 1 },
      }
    )

    const doc = await Usage.findOne({ apiKeyId: 'key-1', date: '2026-04-20' })
    expect(doc?.requestCount).toBe(2)
    expect(doc?.endpoints.get('/payments')).toBe(2)
  })

  it('enforces unique {apiKeyId, date}', async () => {
    await Usage.create({ apiKeyId: 'key-1', userId: 'u', date: '2026-04-20' })
    await expect(
      Usage.create({ apiKeyId: 'key-1', userId: 'u', date: '2026-04-20' })
    ).rejects.toThrow()
  })

  it('aggregates monthly totals by regex-prefix', async () => {
    await Usage.create({
      apiKeyId: 'key-1',
      userId: 'u',
      date: '2026-04-18',
      requestCount: 10,
    })
    await Usage.create({
      apiKeyId: 'key-1',
      userId: 'u',
      date: '2026-04-20',
      requestCount: 5,
    })
    await Usage.create({
      apiKeyId: 'key-1',
      userId: 'u',
      date: '2026-03-31',
      requestCount: 100,
    })

    const result = await Usage.aggregate<{ total: number }>([
      { $match: { apiKeyId: 'key-1', date: { $regex: '^2026-04' } } },
      { $group: { _id: null, total: { $sum: '$requestCount' } } },
    ])

    expect(result[0]?.total).toBe(15)
  })

  it('persists to the api_key_usage collection', () => {
    expect(Usage.collection.collectionName).toBe('api_key_usage')
  })
})
