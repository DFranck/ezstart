/**
 * Tests for the EZPay ApiKey model — schema validation, indexes, and factory.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Model } from 'mongoose'
import { getApiKeyModel, type ApiKeyDocument } from '../../models/api-key.js'

describe('EZPay ApiKey Model', () => {
  let ApiKey: Model<ApiKeyDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKey = await getApiKeyModel()
    try {
      await ApiKey.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ApiKey.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKey.deleteMany({})
  })

  const baseDoc = {
    key: 'hash-1',
    keyPrefix: 'ez_pk_live_abc123',
    name: 'Test Key',
    userId: 'user-1',
    applicationId: 'app-1',
    appSlug: 'acme',
    type: 'publishable' as const,
    env: 'live' as const,
    scope: 'user' as const,
    permissions: ['*'],
    status: 'active' as const,
  }

  describe('Schema validation', () => {
    it('creates a valid key with required fields', async () => {
      const doc = await ApiKey.create(baseDoc)
      expect(doc.name).toBe('Test Key')
      expect(doc.applicationId).toBe('app-1')
      expect(doc.appSlug).toBe('acme')
      expect(doc.type).toBe('publishable')
      expect(doc.env).toBe('live')
      expect(doc.scope).toBe('user')
      expect(doc.status).toBe('active')
      expect(doc.permissions).toEqual(['*'])
      expect(doc.quotaMonthly).toBe(1000)
    })

    it('requires name', async () => {
      await expect(ApiKey.create({ ...baseDoc, name: undefined })).rejects.toThrow()
    })

    it('requires userId', async () => {
      await expect(ApiKey.create({ ...baseDoc, userId: undefined })).rejects.toThrow()
    })

    it('requires applicationId', async () => {
      await expect(ApiKey.create({ ...baseDoc, applicationId: undefined })).rejects.toThrow()
    })

    it('requires appSlug', async () => {
      await expect(ApiKey.create({ ...baseDoc, appSlug: undefined })).rejects.toThrow()
    })

    it('requires type', async () => {
      await expect(ApiKey.create({ ...baseDoc, type: undefined })).rejects.toThrow()
    })

    it('requires env', async () => {
      await expect(ApiKey.create({ ...baseDoc, env: undefined })).rejects.toThrow()
    })

    it('rejects invalid type enum', async () => {
      await expect(ApiKey.create({ ...baseDoc, type: 'invalid' as never })).rejects.toThrow()
    })

    it('rejects invalid env enum', async () => {
      await expect(ApiKey.create({ ...baseDoc, env: 'staging' as never })).rejects.toThrow()
    })

    it('rejects invalid scope enum', async () => {
      await expect(ApiKey.create({ ...baseDoc, scope: 'root' as never })).rejects.toThrow()
    })

    it('defaults quotaMonthly to 1000', async () => {
      const doc = await ApiKey.create({ ...baseDoc, quotaMonthly: undefined })
      expect(doc.quotaMonthly).toBe(1000)
    })

    it('allows null quotaMonthly', async () => {
      const doc = await ApiKey.create({ ...baseDoc, quotaMonthly: null })
      expect(doc.quotaMonthly).toBeNull()
    })

    it('lowercases appSlug', async () => {
      const doc = await ApiKey.create({ ...baseDoc, appSlug: 'ACME' })
      expect(doc.appSlug).toBe('acme')
    })

    it('rejects name longer than 100 chars', async () => {
      await expect(ApiKey.create({ ...baseDoc, name: 'a'.repeat(101) })).rejects.toThrow()
    })
  })

  describe('Indexes', () => {
    it('enforces unique `key` constraint', async () => {
      await ApiKey.create({ ...baseDoc, key: 'dup-hash' })
      await expect(
        ApiKey.create({ ...baseDoc, key: 'dup-hash', userId: 'user-2' })
      ).rejects.toThrow()
    })

    it('supports userId + status compound queries', async () => {
      await ApiKey.create({ ...baseDoc, key: 'hash-a', userId: 'user-a', status: 'active' })
      await ApiKey.create({ ...baseDoc, key: 'hash-b', userId: 'user-a', status: 'revoked' })
      await ApiKey.create({ ...baseDoc, key: 'hash-c', userId: 'user-b', status: 'active' })

      const active = await ApiKey.find({ userId: 'user-a', status: 'active' })
      expect(active).toHaveLength(1)
    })

    it('supports applicationId + status compound queries', async () => {
      await ApiKey.create({
        ...baseDoc,
        key: 'hash-a',
        applicationId: 'app-a',
        status: 'active',
      })
      await ApiKey.create({
        ...baseDoc,
        key: 'hash-b',
        applicationId: 'app-a',
        status: 'revoked',
      })
      await ApiKey.create({
        ...baseDoc,
        key: 'hash-c',
        applicationId: 'app-b',
        status: 'active',
      })

      const active = await ApiKey.find({ applicationId: 'app-a', status: 'active' })
      expect(active).toHaveLength(1)
    })
  })

  describe('Factory', () => {
    it('returns the same model instance on repeated calls (singleton)', async () => {
      const first = await getApiKeyModel()
      const second = await getApiKeyModel()
      expect(first).toBe(second)
    })

    it('persists to the api_keys collection', () => {
      expect(ApiKey.collection.collectionName).toBe('api_keys')
    })
  })

  describe('Lifecycle fields', () => {
    it('tracks lastUsedAt and revokedAt', async () => {
      const doc = await ApiKey.create(baseDoc)
      expect(doc.lastUsedAt).toBeNull()
      expect(doc.revokedAt).toBeNull()

      doc.lastUsedAt = new Date()
      doc.status = 'revoked'
      doc.revokedAt = new Date()
      await doc.save()

      const refreshed = await ApiKey.findById(doc._id)
      expect(refreshed?.lastUsedAt).toBeInstanceOf(Date)
      expect(refreshed?.revokedAt).toBeInstanceOf(Date)
      expect(refreshed?.status).toBe('revoked')
    })

    it('accepts expiresAt', async () => {
      const future = new Date(Date.now() + 86_400_000)
      const doc = await ApiKey.create({ ...baseDoc, expiresAt: future })
      expect(doc.expiresAt?.getTime()).toBe(future.getTime())
    })

    it('accepts createdBy', async () => {
      const doc = await ApiKey.create({ ...baseDoc, createdBy: 'system-seed' })
      expect(doc.createdBy).toBe('system-seed')
    })
  })
})
