/**
 * Integration tests for POST /api/keys covering the P6 Application wiring:
 * - `applicationId` (new, preferred) path
 * - legacy `appName` fallback (find-or-create + warn)
 * - superadmin `appName='*'` platform-wide path
 *
 * Mounts the REAL router so the actual business logic is exercised.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import createRouter from '../../../routes/api-keys/create.js'
import { getApiKeyModel } from '../../../models/api-key.js'
import { getApplicationModel } from '../../../models/application.js'
import {
  createUser,
  createAdminUser,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', createRouter)
  return app
}

describe('POST /api/keys — Application wiring (P6)', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createTestApp()

    const Application = await getApplicationModel()
    try {
      await Application.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Application.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const Application = await getApplicationModel()
    await Application.deleteMany({})
  })

  describe('applicationId path (preferred)', () => {
    it('creates a key linked to an Application the user owns', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Key', applicationId: app1._id.toString() })

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBe(app1._id.toString())
      expect(res.body.data.appName).toBe('acme')
      expect(res.body.data.key).toMatch(/^ez_pk_live_/)

      // Persisted with applicationId.
      const ApiKey = await getApiKeyModel()
      const saved = await ApiKey.findById(res.body.data.id).lean()
      expect(saved?.applicationId?.toString()).toBe(app1._id.toString())
    })

    it('denies creating a key for someone else’s Application', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const thief = await createUser({ email: 't@test.com', username: 't' })
      const token = generateAccessToken(thief)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Stolen', applicationId: app1._id.toString() })

      expect(res.status).toBe(403)
    })

    it('superadmin can create a key for any Application', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const admin = await createAdminUser({ email: 's@test.com', username: 's' })
      const token = generateAccessToken(admin)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'user-app',
        name: 'User App',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Admin Key', applicationId: app1._id.toString() })

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBe(app1._id.toString())
    })

    it('returns 404 for non-existent applicationId', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', applicationId: '507f1f77bcf86cd799439011' })

      expect(res.status).toBe(404)
    })

    it('returns 400 for malformed applicationId', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', applicationId: 'not-an-oid' })

      expect(res.status).toBe(400)
    })

    it('blocks creating a key on an archived Application', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
        status: 'archived',
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', applicationId: app1._id.toString() })

      expect(res.status).toBe(400)
    })
  })

  describe('legacy appName path (find-or-create + warn)', () => {
    it('find-or-creates an Application and links the key (warn logged)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Legacy Key', appName: 'legacy-app' })

      expect(res.status).toBe(200)
      expect(res.body.data.appName).toBe('legacy-app')
      expect(res.body.data.applicationId).toBeTruthy()

      const Application = await getApplicationModel()
      const app1 = await Application.findOne({ slug: 'legacy-app' }).lean()
      expect(app1).toBeTruthy()
      expect(app1?.ownerId).toBe(user._id!.toString())
    })

    it('reuses an existing Application when slug matches', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const preExisting = await Application.create({
        slug: 'existing',
        name: 'Existing',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'existing' })

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBe(preExisting._id.toString())

      const count = await Application.countDocuments({ slug: 'existing' })
      expect(count).toBe(1)
    })

    it('denies legacy appName when an Application owned by someone else already exists', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const other = await createUser({ email: 'oth@test.com', username: 'oth' })
      const token = generateAccessToken(other)

      const Application = await getApplicationModel()
      await Application.create({
        slug: 'owned',
        name: 'Owned',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'owned' })

      expect(res.status).toBe(403)
    })
  })

  describe('appName validation (slug bounds + regex)', () => {
    it('rejects appName with forbidden characters (Zod refine, not 500)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'Invalid Slug!' })

      expect(res.status).toBe(422)
      expect(res.status).not.toBe(500)
      expect(res.body.error).toBeDefined()
    })

    it('rejects empty appName (fails min length)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: '' })

      expect(res.status).toBe(422)
      expect(res.status).not.toBe(500)
    })

    it('rejects appName that is too short (1 char fails regex 2–32)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'a' })

      expect(res.status).toBe(422)
    })

    it('rejects appName that is too long (> 32 chars)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'a'.repeat(33) })

      expect(res.status).toBe(422)
    })

    it('accepts a valid slug appName (happy path, regression guard)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: 'valid-slug' })

      expect(res.status).toBe(200)
      expect(res.body.data.appName).toBe('valid-slug')
    })

    it('accepts appName="*" for superadmin (regression guard for special case)', async () => {
      const admin = await createAdminUser({ email: 's@test.com', username: 's' })
      const token = generateAccessToken(admin)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Platform', appName: '*' })

      expect(res.status).toBe(200)
      expect(res.body.data.appName).toBe('*')
      expect(res.body.data.applicationId).toBeNull()
    })
  })

  describe('platform-wide (appName="*") path — superadmin only', () => {
    it('allows a superadmin to create a platform-wide key with no applicationId', async () => {
      const admin = await createAdminUser({ email: 's@test.com', username: 's' })
      const token = generateAccessToken(admin)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Platform',
          appName: '*',
          type: 'secret',
          env: 'live',
          scope: 'admin',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBeNull()
      expect(res.body.data.appName).toBe('*')
      expect(res.body.data.key).toMatch(/^ez_sk_live_/)
    })

    it('denies platform-wide key for a regular user', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K', appName: '*' })

      expect(res.status).toBe(403)
    })

    it('denies platform-wide key when NEITHER appName nor applicationId given (default path)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'K' })

      expect(res.status).toBe(403)
    })
  })
})
