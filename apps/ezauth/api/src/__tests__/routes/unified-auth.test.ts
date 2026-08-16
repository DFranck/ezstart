/**
 * Integration tests for the unified JWT + API key auth path on admin /
 * CRUD routes. Covers the full matrix:
 *
 *   - JWT cookie/Bearer continues to work unchanged on every wired route.
 *   - ez_sk_*_admin keys can drive the admin / CRUD endpoints with the
 *     same authority as the dashboard JWT.
 *   - ez_pk_*_user (publishable) keys are rejected with HTTP 403 on admin
 *     routes — they MUST NOT escalate.
 *   - Revoked + expired API keys are rejected with HTTP 401.
 *   - Multi-tenancy: an admin key bound to slug 'acme' can only see
 *     'acme' Applications + keys, even when the underlying user is a
 *     superadmin who would otherwise see everything.
 *
 * The test app mounts the real routers + the real `validateApiKey`-equivalent
 * inside the `authJwtOrKey` wrapper, exactly as production does. We drive
 * the assertions over supertest with deterministic seeds.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { applicationRouters } from '../../routes/applications/index.js'
import { apiKeyRouters } from '../../routes/api-keys/index.js'
import { adminRouters } from '../../routes/admin/index.js'
import { getApplicationModel } from '../../models/application.js'
import {
  cleanAllCollections,
  createUser,
  createAdminUser,
  createApiKey,
  generateAccessToken,
} from '../helpers/setup.js'

function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  applicationRouters.forEach(r => app.use('/api', r))
  apiKeyRouters.forEach(r => app.use('/api', r))
  adminRouters.forEach(r => app.use('/api', r))
  return app
}

describe('Unified JWT + API key auth — admin / CRUD routes', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = buildTestApp()

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

  // ---------------------------------------------------------------------------
  // 1. JWT continues to work on every wired route
  // ---------------------------------------------------------------------------
  describe('JWT cookie/Bearer path (regression — must not break)', () => {
    it('GET /api/applications works with a valid JWT', async () => {
      const user = await createUser({ email: 'jwt-list@test.com', username: 'jwtlist' })
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${generateAccessToken(user)}`)
        .send({ slug: 'jwtapp', name: 'JWT App' })

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${generateAccessToken(user)}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('GET /api/keys works with a valid JWT', async () => {
      const user = await createUser({ email: 'jwt-keys@test.com', username: 'jwtkeys' })
      const res = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${generateAccessToken(user)}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('GET /api/users works with a valid JWT (superadmin)', async () => {
      const admin = await createAdminUser({ email: 'jwt-admin@test.com', username: 'jwtadmin' })
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${generateAccessToken(admin)}`)
      expect(res.status).toBe(200)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. ez_sk_*_admin keys CAN drive admin routes
  // ---------------------------------------------------------------------------
  describe('Secret admin key (ez_sk_*_admin) path', () => {
    it('GET /api/applications works with ez_sk_live_admin via X-API-Key', async () => {
      const user = await createUser({ email: 'sk-list@test.com', username: 'sklist' })
      // Create an Application first so the listing has a row.
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${generateAccessToken(user)}`)
        .send({ slug: 'skapp', name: 'SK App' })

      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
      })

      const res = await request(app).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].slug).toBe('skapp')
    })

    it('GET /api/applications works with ez_sk_live_admin via Authorization: ApiKey header', async () => {
      const user = await createUser({ email: 'sk-list2@test.com', username: 'sklist2' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
      })

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `ApiKey ${rawKey}`)
      expect(res.status).toBe(200)
    })

    it('GET /api/keys lists own keys via ez_sk_admin', async () => {
      const user = await createUser({ email: 'sk-keys@test.com', username: 'skkeys' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
      })

      const res = await request(app).get('/api/keys').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
      // The admin key itself is in the listing.
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.some((k: { scope: string }) => k.scope === 'admin')).toBe(true)
    })

    it('GET /api/users works with ez_sk_admin when underlying user is superadmin', async () => {
      const admin = await createAdminUser({ email: 'sk-admin@test.com', username: 'skadmin' })
      const { rawKey } = await createApiKey(admin._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
      })
      const res = await request(app).get('/api/users').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Publishable keys are rejected on admin routes
  // ---------------------------------------------------------------------------
  describe('Publishable key (ez_pk_*) rejection on admin routes', () => {
    it('GET /api/applications rejects ez_pk_live (scope=user) with 403', async () => {
      const user = await createUser({ email: 'pk-deny@test.com', username: 'pkdeny' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'publishable',
        env: 'live',
        scope: 'user',
        appName: '*',
      })

      const res = await request(app).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('INSUFFICIENT_SCOPE')
    })

    it('POST /api/keys rejects ez_pk_test with 403', async () => {
      const user = await createUser({ email: 'pk-create@test.com', username: 'pkcreate' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'publishable',
        env: 'test',
        scope: 'user',
        appName: '*',
      })

      const res = await request(app)
        .post('/api/keys')
        .set('X-API-Key', rawKey)
        .send({ name: 'Should not work', appName: '*' })
      expect(res.status).toBe(403)
    })

    it('GET /api/users rejects ez_pk_live with 403', async () => {
      const admin = await createAdminUser({ email: 'pk-users@test.com', username: 'pkusers' })
      const { rawKey } = await createApiKey(admin._id!.toString(), {
        type: 'publishable',
        env: 'live',
        scope: 'user',
        appName: '*',
      })
      const res = await request(app).get('/api/users').set('X-API-Key', rawKey)
      expect(res.status).toBe(403)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Invalid / revoked / expired keys are rejected
  // ---------------------------------------------------------------------------
  describe('Invalid / revoked / expired keys', () => {
    it('rejects a totally-bogus API key with 401', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('X-API-Key', 'ez_sk_live_deadbeef0000000000000000000000000000000000000000000000000000')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_API_KEY')
    })

    it('rejects a revoked admin key with 401', async () => {
      const user = await createUser({ email: 'rev@test.com', username: 'revuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
        status: 'revoked',
      })
      const res = await request(app).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('API_KEY_REVOKED')
    })

    it('rejects an expired admin key with 401', async () => {
      const user = await createUser({ email: 'exp@test.com', username: 'expuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: '*',
        expiresAt: new Date(Date.now() - 1000),
      })
      const res = await request(app).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('API_KEY_EXPIRED')
    })

    it('returns 401 with no auth at all', async () => {
      const res = await request(app).get('/api/applications')
      expect(res.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Multi-tenancy isolation
  // ---------------------------------------------------------------------------
  describe('Multi-tenancy: app-bound key narrows the result set', () => {
    it('admin key bound to slug "acme" sees ONLY the "acme" Application even when superadmin', async () => {
      const sa = await createAdminUser({ email: 'sa-mt@test.com', username: 'samt' })
      const tokenSa = generateAccessToken(sa)

      // Superadmin owns 2 Applications.
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
        .send({ slug: 'acme', name: 'Acme' })
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
        .send({ slug: 'globex', name: 'Globex' })

      // Bound admin key on slug 'acme' only.
      const { rawKey } = await createApiKey(sa._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: 'acme',
      })

      const res = await request(app).get('/api/applications').set('X-API-Key', rawKey)
      expect(res.status).toBe(200)
      expect(res.body.data.map((a: { slug: string }) => a.slug)).toEqual(['acme'])
    })

    it('admin key bound to "acme" gets 404 when reading "globex" by id', async () => {
      const sa = await createAdminUser({ email: 'sa-mt2@test.com', username: 'samt2' })
      const tokenSa = generateAccessToken(sa)

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
        .send({ slug: 'acme', name: 'Acme' })
      const globexRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
        .send({ slug: 'globex', name: 'Globex' })
      const globexId = globexRes.body.data.id as string

      const { rawKey } = await createApiKey(sa._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: 'acme',
      })

      // Reading globex by id MUST return 404 (no existence leak).
      const res = await request(app).get(`/api/applications/${globexId}`).set('X-API-Key', rawKey)
      expect(res.status).toBe(404)

      // But reading acme by id works.
      const acmeRes = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
      const acmeId = acmeRes.body.data.find(
        (a: { slug: string; id: string }) => a.slug === 'acme'
      )!.id
      const okRes = await request(app).get(`/api/applications/${acmeId}`).set('X-API-Key', rawKey)
      expect(okRes.status).toBe(200)
    })

    it('admin key bound to "acme" cannot create keys for another slug', async () => {
      const sa = await createAdminUser({ email: 'sa-mt3@test.com', username: 'samt3' })
      const tokenSa = generateAccessToken(sa)

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${tokenSa}`)
        .send({ slug: 'acme', name: 'Acme' })

      const { rawKey } = await createApiKey(sa._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: 'acme',
      })

      // Try to create a key for a NEW Application slug 'globex'.
      const res = await request(app)
        .post('/api/keys')
        .set('X-API-Key', rawKey)
        .send({ name: 'Cross-tenant attempt', appName: 'globex' })
      expect(res.status).toBe(403)
    })

    it('admin key bound to "acme" listing /api/keys excludes other-slug keys belonging to the same user', async () => {
      const sa = await createAdminUser({ email: 'sa-mt4@test.com', username: 'samt4' })

      // Two apps on the same superadmin user.
      const acmeKey = await createApiKey(sa._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: 'acme',
        name: 'acme-admin',
      })
      await createApiKey(sa._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        appName: 'globex',
        name: 'globex-admin',
      })

      const res = await request(app).get('/api/keys').set('X-API-Key', acmeKey.rawKey)
      expect(res.status).toBe(200)
      const slugs = (res.body.data as { appName: string }[]).map(k => k.appName)
      expect(slugs).toContain('acme')
      expect(slugs).not.toContain('globex')
    })
  })
})
