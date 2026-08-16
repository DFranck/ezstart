import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getApplicationModel, APPLICATION_SLUG_REGEX } from '../../models/application.js'
import type { ApplicationDocument } from '../../models/application.js'
import type { Model } from 'mongoose'

describe('Application Model', () => {
  let ApplicationModel: Model<ApplicationDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ApplicationModel = await getApplicationModel()

    try {
      await ApplicationModel.collection.dropIndexes()
    } catch {
      // ignore — collection may not exist yet
    }
    await ApplicationModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApplicationModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('creates a valid Application with required fields', async () => {
      const app = await ApplicationModel.create({
        slug: 'acme',
        name: 'Acme Corp',
        ownerId: 'user-123',
      })

      expect(app.slug).toBe('acme')
      expect(app.name).toBe('Acme Corp')
      expect(app.ownerId).toBe('user-123')
      expect(app.status).toBe('active')
      expect(app.createdAt).toBeInstanceOf(Date)
      expect(app.updatedAt).toBeInstanceOf(Date)
    })

    it('requires slug', async () => {
      await expect(
        ApplicationModel.create({ name: 'Acme Corp', ownerId: 'user-123' })
      ).rejects.toThrow()
    })

    it('requires name', async () => {
      await expect(ApplicationModel.create({ slug: 'acme', ownerId: 'user-123' })).rejects.toThrow()
    })

    it('requires ownerId', async () => {
      await expect(ApplicationModel.create({ slug: 'acme', name: 'Acme' })).rejects.toThrow()
    })

    it('lowercases slug', async () => {
      const app = await ApplicationModel.create({
        slug: 'ACME-CORP',
        name: 'Acme',
        ownerId: 'user-1',
      })

      expect(app.slug).toBe('acme-corp')
    })

    it('trims slug', async () => {
      const app = await ApplicationModel.create({
        slug: '  acme  ',
        name: 'Acme',
        ownerId: 'user-1',
      })

      expect(app.slug).toBe('acme')
    })

    it('rejects slug with invalid chars (uppercase after trim is ok, but special chars no)', async () => {
      await expect(
        ApplicationModel.create({ slug: 'acme_corp', name: 'Acme', ownerId: 'user-1' })
      ).rejects.toThrow()

      await expect(
        ApplicationModel.create({ slug: 'acme corp', name: 'Acme', ownerId: 'user-1' })
      ).rejects.toThrow()
    })

    it('rejects slug shorter than 2 chars', async () => {
      await expect(
        ApplicationModel.create({ slug: 'a', name: 'Acme', ownerId: 'user-1' })
      ).rejects.toThrow()
    })

    it('rejects slug longer than 32 chars', async () => {
      await expect(
        ApplicationModel.create({
          slug: 'a'.repeat(33),
          name: 'Acme',
          ownerId: 'user-1',
        })
      ).rejects.toThrow()
    })

    it('enforces name maxlength 100', async () => {
      await expect(
        ApplicationModel.create({
          slug: 'acme',
          name: 'a'.repeat(101),
          ownerId: 'user-1',
        })
      ).rejects.toThrow()
    })

    it('enforces description maxlength 500', async () => {
      await expect(
        ApplicationModel.create({
          slug: 'acme',
          name: 'Acme',
          ownerId: 'user-1',
          description: 'd'.repeat(501),
        })
      ).rejects.toThrow()
    })

    it('accepts metadata as arbitrary object', async () => {
      const app = await ApplicationModel.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: 'user-1',
        metadata: { plan: 'pro', featureFlags: ['new-ui'], nested: { a: 1 } },
      })

      expect(app.metadata).toEqual({
        plan: 'pro',
        featureFlags: ['new-ui'],
        nested: { a: 1 },
      })
    })

    it('defaults status to active', async () => {
      const app = await ApplicationModel.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: 'user-1',
      })
      expect(app.status).toBe('active')
    })

    it('rejects invalid status values', async () => {
      await expect(
        ApplicationModel.create({
          slug: 'acme',
          name: 'Acme',
          ownerId: 'user-1',
          status: 'deleted',
        })
      ).rejects.toThrow()
    })
  })

  describe('Uniqueness', () => {
    it('enforces unique slug', async () => {
      await ApplicationModel.create({ slug: 'acme', name: 'Acme 1', ownerId: 'u1' })

      await expect(
        ApplicationModel.create({ slug: 'acme', name: 'Acme 2', ownerId: 'u2' })
      ).rejects.toThrow()
    })

    it('allows different slugs', async () => {
      await ApplicationModel.create({ slug: 'acme', name: 'Acme', ownerId: 'u1' })
      await ApplicationModel.create({ slug: 'globex', name: 'Globex', ownerId: 'u2' })

      const apps = await ApplicationModel.find({}).lean()
      expect(apps).toHaveLength(2)
    })
  })

  describe('Indexes', () => {
    it('has expected indexes', async () => {
      const indexes = await ApplicationModel.collection.getIndexes()
      const keys = Object.keys(indexes)

      // slug_1 (unique), ownerId_1, createdBy_1, status_1, _id_ (default)
      expect(keys.some(k => k.includes('slug'))).toBe(true)
      expect(keys.some(k => k.includes('ownerId'))).toBe(true)
      expect(keys.some(k => k.includes('createdBy'))).toBe(true)
      expect(keys.some(k => k.includes('status'))).toBe(true)
    })

    it('queries by ownerId efficiently (functional check)', async () => {
      await ApplicationModel.create({ slug: 'app-a', name: 'A', ownerId: 'u1' })
      await ApplicationModel.create({ slug: 'app-b', name: 'B', ownerId: 'u2' })
      await ApplicationModel.create({ slug: 'app-c', name: 'C', ownerId: 'u1' })

      const u1Apps = await ApplicationModel.find({ ownerId: 'u1' }).lean()
      expect(u1Apps).toHaveLength(2)
    })
  })

  describe('APPLICATION_SLUG_REGEX export', () => {
    it('accepts valid slugs', () => {
      expect(APPLICATION_SLUG_REGEX.test('ab')).toBe(true)
      expect(APPLICATION_SLUG_REGEX.test('acme-corp')).toBe(true)
      expect(APPLICATION_SLUG_REGEX.test('a1-2-3')).toBe(true)
      expect(APPLICATION_SLUG_REGEX.test('a'.repeat(32))).toBe(true)
    })

    it('rejects invalid slugs', () => {
      expect(APPLICATION_SLUG_REGEX.test('a')).toBe(false) // too short
      expect(APPLICATION_SLUG_REGEX.test('a'.repeat(33))).toBe(false) // too long
      expect(APPLICATION_SLUG_REGEX.test('Acme')).toBe(false) // uppercase
      expect(APPLICATION_SLUG_REGEX.test('acme_corp')).toBe(false) // underscore
      expect(APPLICATION_SLUG_REGEX.test('acme corp')).toBe(false) // space
      expect(APPLICATION_SLUG_REGEX.test('acme.corp')).toBe(false) // dot
    })
  })
})
