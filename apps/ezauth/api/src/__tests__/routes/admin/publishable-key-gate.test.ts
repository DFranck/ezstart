/**
 * Integration tests for AUTH-SVC-ADMIN-ROUTES-PUBLISHABLE-KEY-LEAK-001.
 *
 * Mounts the REAL routers (not mirrored logic) and asserts, across three
 * representative endpoints, that:
 *   - a publishable + scope=admin key (the NEXT_PUBLIC_EZAUTH_KEY leak vector)
 *     is rejected with 403 by `requireSecretKeyOrJwt`
 *   - a secret + scope=admin key (S2S consumer key) succeeds
 *   - a superadmin JWT succeeds
 *
 * Representative routes:
 *   - PII list        → GET  /api/admin/users
 *   - applications    → GET  /api/applications
 *   - api-keys        → POST /api/keys
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type Express } from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import listUsersRouter from '../../../routes/admin/list-users.js'
import listApplicationsRouter from '../../../routes/applications/list.js'
import createApiKeyRouter from '../../../routes/api-keys/create.js'
import {
  createAdminUser,
  createApiKey,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'

function mountAdmin(): Express {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/admin', listUsersRouter)
  app.use('/api', listApplicationsRouter)
  app.use('/api', createApiKeyRouter)
  return app
}

describe('AUTH-SVC-ADMIN-ROUTES-PUBLISHABLE-KEY-LEAK-001 — publishable key gate', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('GET /api/admin/users (PII list)', () => {
    it('publishable admin key → 403 (rejected)', async () => {
      const owner = await createAdminUser({ email: 'owner@example.com', username: 'owner' })
      const { rawKey } = await createApiKey(owner._id!.toString(), {
        type: 'publishable',
        scope: 'admin',
      })
      const res = await request(mountAdmin()).get('/api/admin/users').set('X-API-Key', rawKey)
      expect(res.status).toBe(403)
      const body = res.body as { error?: { message?: string } }
      expect(body.error?.message ?? '').toMatch(/secret API key/i)
    })

    it('secret admin key → 200', async () => {
      const owner = await createAdminUser({ email: 'owner2@example.com', username: 'owner2' })
      const { rawKey } = await createApiKey(owner._id!.toString(), { scope: 'admin' })
      const res = await request(mountAdmin()).get('/api/admin/users').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('superadmin JWT (2FA) → 200', async () => {
      const admin = await createAdminUser({ email: 'admin@example.com', username: 'admin' })
      const token = generateAccessToken(admin, '15m', { twoFactorEnabled: true })
      const res = await request(mountAdmin())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/applications', () => {
    it('publishable admin key → 403 (rejected)', async () => {
      const owner = await createAdminUser({ email: 'owner3@example.com', username: 'owner3' })
      const { rawKey } = await createApiKey(owner._id!.toString(), {
        type: 'publishable',
        scope: 'admin',
      })
      const res = await request(mountAdmin()).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(403)
      const body = res.body as { error?: { message?: string } }
      expect(body.error?.message ?? '').toMatch(/secret API key/i)
    })

    it('secret admin key → 200', async () => {
      const owner = await createAdminUser({ email: 'owner4@example.com', username: 'owner4' })
      const { rawKey } = await createApiKey(owner._id!.toString(), { scope: 'admin' })
      const res = await request(mountAdmin()).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('superadmin JWT → 200', async () => {
      const admin = await createAdminUser({ email: 'admin2@example.com', username: 'admin2' })
      const token = generateAccessToken(admin, '15m', { twoFactorEnabled: true })
      const res = await request(mountAdmin())
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/keys', () => {
    it('publishable admin key → 403 (rejected)', async () => {
      const owner = await createAdminUser({ email: 'owner5@example.com', username: 'owner5' })
      const { rawKey } = await createApiKey(owner._id!.toString(), {
        type: 'publishable',
        scope: 'admin',
      })
      const res = await request(mountAdmin())
        .post('/api/keys')
        .set('X-API-Key', rawKey)
        .send({ name: 'New Key' })
      expect(res.status).toBe(403)
      const body = res.body as { error?: { message?: string } }
      expect(body.error?.message ?? '').toMatch(/secret API key/i)
    })

    it('secret admin key → 200 (creates key)', async () => {
      const owner = await createAdminUser({ email: 'owner6@example.com', username: 'owner6' })
      const { rawKey } = await createApiKey(owner._id!.toString(), { scope: 'admin' })
      const res = await request(mountAdmin())
        .post('/api/keys')
        .set('X-API-Key', rawKey)
        .send({ name: 'New Key' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data?.key).toBeTruthy()
    })

    it('superadmin JWT → 200 (creates key)', async () => {
      const admin = await createAdminUser({ email: 'admin3@example.com', username: 'admin3' })
      const token = generateAccessToken(admin, '15m', { twoFactorEnabled: true })
      const res = await request(mountAdmin())
        .post('/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Key' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data?.key).toBeTruthy()
    })
  })
})
