/**
 * Integration tests for /api/applications/* routes.
 *
 * We mount the real routers inside a minimal Express app and exercise them
 * over supertest. The real `verifyTokenMiddleware` is used, so we generate
 * valid JWTs via the shared test helpers.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { applicationRouters } from '../../../routes/applications/index.js'
import { getApplicationModel } from '../../../models/application.js'
import { getApiKeyModel } from '../../../models/api-key.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import {
  createUser,
  createAdminUser,
  createApiKey,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'

function createApplicationsTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // Mount in the same order as production (static first, then `:id`).
  applicationRouters.forEach(r => app.use('/api', r))
  return app
}

describe('Applications Routes', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApplicationsTestApp()

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

  describe('POST /api/applications — create', () => {
    it('creates an Application as an authenticated user', async () => {
      const user = await createUser({ email: 'owner@test.com', username: 'owner' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'acme', name: 'Acme Corp', description: 'Cool startup' })

      expect(res.status).toBe(200)
      expect(res.body.data.slug).toBe('acme')
      expect(res.body.data.name).toBe('Acme Corp')
      expect(res.body.data.description).toBe('Cool startup')
      expect(res.body.data.ownerId).toBe(user._id!.toString())
      expect(res.body.data.status).toBe('active')
      expect(res.body.data.id).toBeTruthy()
    })

    it('appends slug to user.apps on create', async () => {
      const user = await createUser({
        email: 'apps@test.com',
        username: 'appsuser',
        apps: ['ezstart'],
      })
      const token = generateAccessToken(user)

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'myapp', name: 'My App' })

      const AuthUser = await getAuthUserModel()
      const refreshed = await AuthUser.findById(user._id).lean()
      expect(refreshed?.apps).toContain('myapp')
      expect(refreshed?.apps).toContain('ezstart')
    })

    it('returns 422 on invalid slug', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'BAD SLUG', name: 'Oops' })

      expect(res.status).toBe(422)
    })

    it('returns 409 on duplicate slug', async () => {
      const u1 = await createUser({ email: 'u1@test.com', username: 'u1' })
      const u2 = await createUser({ email: 'u2@test.com', username: 'u2' })
      const token1 = generateAccessToken(u1)
      const token2 = generateAccessToken(u2)

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token1}`)
        .send({ slug: 'taken', name: 'First' })

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token2}`)
        .send({ slug: 'taken', name: 'Second' })

      expect(res.status).toBe(409)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/applications').send({ slug: 'acme', name: 'Acme' })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/applications — list', () => {
    it('returns only apps owned by the caller', async () => {
      const u1 = await createUser({ email: 'o1@test.com', username: 'o1' })
      const u2 = await createUser({ email: 'o2@test.com', username: 'o2' })
      const token1 = generateAccessToken(u1)

      const Application = await getApplicationModel()
      await Application.create({ slug: 'mine', name: 'Mine', ownerId: u1._id!.toString() })
      await Application.create({ slug: 'theirs', name: 'Theirs', ownerId: u2._id!.toString() })

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${token1}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].slug).toBe('mine')
    })

    it('superadmin can pass ?all=true to see everything', async () => {
      const admin = await createAdminUser({ email: 'su@test.com', username: 'su' })
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(admin)

      const Application = await getApplicationModel()
      await Application.create({ slug: 'admin-app', name: 'A', ownerId: admin._id!.toString() })
      await Application.create({ slug: 'user-app', name: 'U', ownerId: user._id!.toString() })

      const res = await request(app)
        .get('/api/applications?all=true')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('non-superadmin gets 403 with ?all=true', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/api/applications?all=true')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/applications')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/applications/:id — fetch', () => {
    it('returns the application to its owner', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .get(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.slug).toBe('acme')
    })

    it('returns 404 to non-owner (no 403 leak)', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const thief = await createUser({ email: 't@test.com', username: 't' })
      const thiefToken = generateAccessToken(thief)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .get(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${thiefToken}`)

      expect(res.status).toBe(404)
    })

    it('superadmin can access any application', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const admin = await createAdminUser({ email: 's@test.com', username: 's' })
      const adminToken = generateAccessToken(admin)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .get(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.slug).toBe('acme')
    })

    it('returns 404 for malformed id', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/api/applications/not-an-oid')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })

    it('returns 404 for non-existent id', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/api/applications/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/applications/:id — update', () => {
    it('updates name/description/metadata (owner)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme v2', description: 'New tagline', metadata: { plan: 'pro' } })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Acme v2')
      expect(res.body.data.description).toBe('New tagline')
      expect(res.body.data.metadata).toEqual({ plan: 'pro' })

      // slug is immutable
      expect(res.body.data.slug).toBe('acme')
    })

    it('ignores attempts to change slug (field not in schema)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      await request(app)
        .patch(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'hacked', name: 'Still me' })

      const reloaded = await Application.findById(app1._id).lean()
      expect(reloaded?.slug).toBe('acme')
    })

    it('returns 404 to non-owner', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const thief = await createUser({ email: 't@test.com', username: 't' })
      const thiefToken = generateAccessToken(thief)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${thiefToken}`)
        .send({ name: 'Hacked' })

      expect(res.status).toBe(404)
    })

    it('returns 422 on invalid body', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })

      expect(res.status).toBe(422)
    })
  })

  describe('DELETE /api/applications/:id — archive', () => {
    it('archives an application with no active keys', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .delete(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('Application archived')
      expect(res.body.data.revokedKeys).toBe(0)

      const reloaded = await Application.findById(app1._id).lean()
      expect(reloaded?.status).toBe('archived')
    })

    it('blocks with 409 if active keys exist and no cascade', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const ApiKey = await getApiKeyModel()
      const { doc } = await createApiKey(user._id!.toString(), { appName: 'acme' })
      await ApiKey.updateOne({ _id: doc._id }, { $set: { applicationId: app1._id } })

      const res = await request(app)
        .delete(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(409)
    })

    it('archives with cascade=true — revokes active keys', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const ApiKey = await getApiKeyModel()
      const { doc: k1 } = await createApiKey(user._id!.toString(), { appName: 'acme' })
      const { doc: k2 } = await createApiKey(user._id!.toString(), { appName: 'acme' })
      await ApiKey.updateMany(
        { _id: { $in: [k1._id, k2._id] } },
        { $set: { applicationId: app1._id } }
      )

      const res = await request(app)
        .delete(`/api/applications/${app1._id.toString()}?cascade=true`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.revokedKeys).toBe(2)

      const revokedK1 = await ApiKey.findById(k1._id).lean()
      expect(revokedK1?.status).toBe('revoked')
    })

    it('returns 404 to non-owner', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const thief = await createUser({ email: 't@test.com', username: 't' })
      const thiefToken = generateAccessToken(thief)

      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .delete(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${thiefToken}`)

      expect(res.status).toBe(404)
    })

    it('rejects archiving an already-archived application', async () => {
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
        .delete(`/api/applications/${app1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/applications/lookup — public slug lookup', () => {
    it('returns the minimal identity for an active Application (no auth)', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const Application = await getApplicationModel()
      await Application.create({
        slug: 'public-acme',
        name: 'Public Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app).get('/api/applications/lookup?slug=public-acme')

      expect(res.status).toBe(200)
      expect(res.body.data.slug).toBe('public-acme')
      expect(res.body.data.name).toBe('Public Acme')
      expect(res.body.data.id).toBeTruthy()
    })

    it('returns 404 for unknown slug', async () => {
      const res = await request(app).get('/api/applications/lookup?slug=ghost')
      expect(res.status).toBe(404)
    })

    it('returns 404 for archived application', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const Application = await getApplicationModel()
      await Application.create({
        slug: 'gone',
        name: 'Gone',
        ownerId: user._id!.toString(),
        status: 'archived',
      })

      const res = await request(app).get('/api/applications/lookup?slug=gone')
      expect(res.status).toBe(404)
    })

    it('returns 400 on missing slug', async () => {
      const res = await request(app).get('/api/applications/lookup')
      expect(res.status).toBe(400)
    })

    it('returns 400 on invalid slug', async () => {
      const res = await request(app).get('/api/applications/lookup?slug=BAD_SLUG')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/applications/resolve — resolve from raw key', () => {
    it('returns applicationId + slug for an active publishable key', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const Application = await getApplicationModel()
      const app1 = await Application.create({
        slug: 'payapp',
        name: 'Pay App',
        ownerId: user._id!.toString(),
      })

      const { rawKey, doc } = await createApiKey(user._id!.toString(), { appName: 'payapp' })
      const ApiKey = await getApiKeyModel()
      await ApiKey.updateOne({ _id: doc._id }, { $set: { applicationId: app1._id } })

      const res = await request(app).get(
        `/api/applications/resolve?key=${encodeURIComponent(rawKey)}`
      )

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBe(app1._id.toString())
      expect(res.body.data.slug).toBe('payapp')
      expect(res.body.data.name).toBe('Pay App')
      expect(res.body.data.type).toBe('publishable')
      expect(res.body.data.env).toBe('live')
    })

    it('returns applicationId=null for legacy key without applicationId', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const { rawKey } = await createApiKey(user._id!.toString(), { appName: 'legacy-app' })

      const res = await request(app).get(
        `/api/applications/resolve?key=${encodeURIComponent(rawKey)}`
      )

      expect(res.status).toBe(200)
      expect(res.body.data.applicationId).toBeNull()
      // Falls back to appName as slug.
      expect(res.body.data.slug).toBe('legacy-app')
      expect(res.body.data.name).toBeNull()
    })

    it('returns 401 for invalid key', async () => {
      const res = await request(app).get('/api/applications/resolve?key=ez_pk_live_unknown')
      expect(res.status).toBe(401)
    })

    it('returns 401 for revoked key', async () => {
      const user = await createUser({ email: 'u@test.com', username: 'u' })
      const { rawKey } = await createApiKey(user._id!.toString(), { status: 'revoked' })

      const res = await request(app).get(
        `/api/applications/resolve?key=${encodeURIComponent(rawKey)}`
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 on missing key param', async () => {
      const res = await request(app).get('/api/applications/resolve')
      expect(res.status).toBe(400)
    })
  })
})
