/**
 * Integration tests for POST /api/applications/:id/regenerate-webhook-secret.
 *
 * Mounts the real router against a MongoMemoryServer and exercises the
 * full request → audit-log path. Auth is enforced via the real
 * `verifyTokenMiddleware` + JWT helpers.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { applicationRouters } from '../../../routes/applications/index.js'
import { generateWebhookSecret, getApplicationModel } from '../../../models/application.js'
import { getAuditLogModel } from '../../../models/audit-log.js'
import {
  cleanAllCollections,
  createAdminUser,
  createUser,
  generateAccessToken,
} from '../../helpers/setup.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  applicationRouters.forEach(r => app.use('/api', r))
  return app
}

describe('POST /api/applications/:id/regenerate-webhook-secret', () => {
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
    const AuditLog = await getAuditLogModel()
    await AuditLog.deleteMany({})
  })

  describe('happy path', () => {
    it('rotates the secret and returns the new value once', async () => {
      const user = await createUser({ email: 'rot@test.com', username: 'rotuser' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const initialSecret = generateWebhookSecret()
      const appDoc = await Application.create({
        slug: 'rotate-app',
        name: 'Rotate App',
        ownerId: user._id!.toString(),
        webhookSecret: initialSecret,
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe(appDoc._id.toString())
      expect(res.body.data.webhookSecret).toMatch(/^whsec_[0-9a-f]{64}$/)
      expect(res.body.data.webhookSecret).not.toBe(initialSecret)

      // The new secret is also persisted in the DB.
      const updated = await Application.findById(appDoc._id).select('+webhookSecret').lean()
      expect(updated?.webhookSecret).toBe(res.body.data.webhookSecret)
      expect(updated?.webhookSecret).not.toBe(initialSecret)
    })

    it('writes a webhook_secret_regenerated audit log entry', async () => {
      const user = await createUser({ email: 'audit@test.com', username: 'audituser' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'audit-app',
        name: 'Audit App',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true })

      expect(res.status).toBe(200)

      // Audit log is fire-and-forget — poll up to ~2s for the row to land
      // instead of relying on a single fixed sleep. Avoids flakes when the
      // mongo write takes longer than the original 50 ms timeout under
      // parallel test load.
      const AuditLog = await getAuditLogModel()
      let entries: Array<{ metadata?: unknown }> = []
      for (let i = 0; i < 40; i++) {
        entries = await AuditLog.find({
          userId: user._id!.toString(),
          action: 'webhook_secret_regenerated',
        }).lean()
        if (entries.length > 0) break
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      expect(entries).toHaveLength(1)
      expect(entries[0]?.metadata).toMatchObject({
        applicationId: appDoc._id.toString(),
        applicationSlug: 'audit-app',
      })
      // The secret value itself MUST NOT appear in the audit log metadata.
      const flat = JSON.stringify(entries[0]?.metadata)
      expect(flat).not.toMatch(/whsec_/)
    })

    it('lets a superadmin rotate any Application (not just owned)', async () => {
      const owner = await createUser({ email: 'own@test.com', username: 'own' })
      const admin = await createAdminUser({ email: 'sa@test.com', username: 'sa' })
      const adminToken = generateAccessToken(admin)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'sa-app',
        name: 'Superadmin Target',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: true })

      expect(res.status).toBe(200)
      expect(res.body.data.webhookSecret).toMatch(/^whsec_[0-9a-f]{64}$/)
    })
  })

  describe('confirmation guard', () => {
    it('422 when body is missing the confirm field', async () => {
      const user = await createUser({ email: 'noc@test.com', username: 'noc' })
      const token = generateAccessToken(user)
      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'noc-app',
        name: 'No Confirm',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect(res.status).toBe(422)
    })

    it('422 when confirm is false (must be literal true)', async () => {
      const user = await createUser({ email: 'fc@test.com', username: 'fc' })
      const token = generateAccessToken(user)
      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'fc-app',
        name: 'False Confirm',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: false })

      expect(res.status).toBe(422)
    })
  })

  describe('authorization', () => {
    it('401 without auth token', async () => {
      const Application = await getApplicationModel()
      const owner = await createUser({ email: 'na@test.com', username: 'na' })
      const appDoc = await Application.create({
        slug: 'na-app',
        name: 'NoAuth App',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .send({ confirm: true })

      expect(res.status).toBe(401)
    })

    it('404 (not 403) when caller is not the owner and not superadmin', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'owner' })
      const stranger = await createUser({ email: 'st@test.com', username: 'stranger' })
      const strangerToken = generateAccessToken(stranger)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'lk-app',
        name: 'Leak Test',
        ownerId: owner._id!.toString(),
      })
      const beforeSecret = (await Application.findById(appDoc._id).select('+webhookSecret').lean())
        ?.webhookSecret

      const res = await request(app)
        .post(`/api/applications/${appDoc._id.toString()}/regenerate-webhook-secret`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ confirm: true })

      // 404 instead of 403 — never leak that the Application exists.
      expect(res.status).toBe(404)

      // And the secret was NOT rotated.
      const afterSecret = (await Application.findById(appDoc._id).select('+webhookSecret').lean())
        ?.webhookSecret
      expect(afterSecret).toBe(beforeSecret)
    })
  })

  describe('not found', () => {
    it('404 when the Application id is unknown', async () => {
      const user = await createUser({ email: 'nf@test.com', username: 'nf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications/507f1f77bcf86cd799439011/regenerate-webhook-secret')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true })

      expect(res.status).toBe(404)
    })

    it('404 when the id is malformed (not a valid ObjectId)', async () => {
      const user = await createUser({ email: 'mf@test.com', username: 'mf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications/not-an-objectid/regenerate-webhook-secret')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true })

      expect(res.status).toBe(404)
    })
  })

  describe('serialization', () => {
    it('omits webhookSecret from regular GET /:id responses (defense-in-depth)', async () => {
      const user = await createUser({ email: 'serial@test.com', username: 'serial' })
      const token = generateAccessToken(user)
      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'serial-app',
        name: 'Serial App',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .get(`/api/applications/${appDoc._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      // The default GET serializer MUST NEVER expose the secret. It is only
      // emitted by the regenerate endpoint (and the future S2S admin lookup
      // with `?include=webhookSecret`).
      expect(res.body.data.webhookSecret).toBeUndefined()
      // But the public webhookEndpointUrl IS exposed (as null by default).
      expect(res.body.data.webhookEndpointUrl).toBeNull()
    })
  })
})
