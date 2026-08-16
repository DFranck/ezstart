/**
 * Integration tests for `apps/ezpay/api/src/middleware/unified-auth.ts`.
 *
 * Drives the REAL `authJwtOrKey` factory (no mock) end-to-end against a
 * thin Express app to assert the full S2S surface ezpay now exposes:
 *
 *   - Bearer JWT (cookie / header) continues to work as before
 *   - `ez_sk_*_admin` keys can drive admin-scoped routes
 *   - `ez_pk_*_user` (publishable) keys are rejected (403) on admin-scope
 *     routes — they MUST NOT escalate
 *   - Revoked + expired keys are rejected (401)
 *   - Multi-tenancy: an admin key bound to `acme` cannot read `other-app`
 *     data via the synthesised RBAC scope (`appRoles[acme] = ['admin']`)
 *
 * The test uses MongoMemoryServer + a tiny custom route that echoes the
 * resolved `req.user`, `req.derivedScope`, and the api-key context so we
 * can assert the synthesis rules production handlers (e.g. payments/list,
 * plans CRUD) rely on.
 *
 * **JWT_SECRET bootstrap** : the JWT path imports `createApiAuth` from
 * `@ezstart/api-core` which reads `JWT_SECRET` at module-eval time.
 * We set it BEFORE any `import` of the middleware via a top-of-file
 * env mutation + dynamic import after.
 *
 * @module apps/ezpay/api/src/__tests__/middleware/unified-auth
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type Express, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { attachDerivedScope } from '@ezstart/api-core'
import { getApiKeyModel, type ApiKeyDocument } from '../../models/api-key.js'
import { getApiKeyUsageModel, type ApiKeyUsageDocument } from '../../models/api-key-usage.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import type { Model } from 'mongoose'

// CRITICAL: set JWT_SECRET BEFORE importing the middleware so
// `createApiAuth()` (called at module eval time inside `auth.ts`) finds it.
const TEST_JWT_SECRET = 'unified-auth-test-secret-ezpay-2026'
const originalSecret = process.env.JWT_SECRET
process.env.JWT_SECRET = TEST_JWT_SECRET

// Dynamic imports after env mutation so module-level `createApiAuth(...)`
// reads the test secret instead of throwing.
const { authJwtOrKey, authOptionalJwtOrKey } = await import('../../middleware/unified-auth.js')
const { _resetUsageCacheForTests } = await import('../../middleware/api-key.js')

interface SeedKeyOpts {
  userId?: string
  applicationId?: string
  appSlug?: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
  status?: 'active' | 'revoked'
  expiresAt?: Date | null
}

async function seedKey(
  ApiKey: Model<ApiKeyDocument>,
  opts: SeedKeyOpts = {}
): Promise<{ rawKey: string; doc: ApiKeyDocument }> {
  const type = opts.type ?? 'secret'
  const env = opts.env ?? 'live'
  const rawKey = generateRawApiKey({ type, env })
  const doc = await ApiKey.create({
    key: hashApiKey(rawKey),
    keyPrefix: extractKeyPrefix(rawKey),
    name: 'test-key',
    userId: opts.userId ?? 'user-owner',
    applicationId: opts.applicationId ?? 'app-1',
    appSlug: opts.appSlug ?? 'acme',
    type,
    env,
    scope: opts.scope ?? 'admin',
    permissions: ['*'],
    status: opts.status ?? 'active',
    expiresAt: opts.expiresAt ?? null,
  })
  return { rawKey, doc }
}

function signJwt(
  payload: Record<string, unknown>,
  overrides: { secret?: string; audience?: string | string[]; issuer?: string } = {}
): string {
  // HAC-CRIT-2 — default to a token shape that ezpay's `createApiAuth`
  // accepts (issuer='ezauth', audience contains 'ezpay'). Overrides let
  // individual tests assert wrong-audience / wrong-issuer rejection.
  return jwt.sign(payload, overrides.secret ?? TEST_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m',
    issuer: overrides.issuer ?? 'ezauth',
    audience: overrides.audience ?? ['ezauth', 'ezpay', 'ezbill', 'green-pulse'],
  })
}

interface EchoBody {
  userId: string | undefined
  derivedScope: string | undefined
  user: Record<string, unknown> | undefined
  apiKeyId: string | undefined
  apiKeyAppSlug: string | undefined
  apiKeyScope: string | undefined
}

function buildTestApp(): Express {
  const app = express()
  app.use(express.json())

  // Strict admin-scope route — emulates payments/refund or plans/createPlan.
  app.get(
    '/admin-route',
    authJwtOrKey({ requireKeyScope: 'admin' }),
    attachDerivedScope,
    (req: Request, res: Response) => {
      const body: EchoBody = {
        userId: req.userId,
        derivedScope: req.derivedScope,
        user: req.user as unknown as Record<string, unknown> | undefined,
        apiKeyId: (req as Request & { apiKeyId?: string }).apiKeyId,
        apiKeyAppSlug: (req as Request & { apiKeyAppSlug?: string }).apiKeyAppSlug,
        apiKeyScope: (req as Request & { apiKeyScope?: string }).apiKeyScope,
      }
      res.json({ success: true, data: body })
    }
  )

  // User-scope route — emulates payments/me or subscriptions/list.
  app.get('/user-route', authJwtOrKey(), attachDerivedScope, (req: Request, res: Response) => {
    const body: EchoBody = {
      userId: req.userId,
      derivedScope: req.derivedScope,
      user: req.user as unknown as Record<string, unknown> | undefined,
      apiKeyId: (req as Request & { apiKeyId?: string }).apiKeyId,
      apiKeyAppSlug: (req as Request & { apiKeyAppSlug?: string }).apiKeyAppSlug,
      apiKeyScope: (req as Request & { apiKeyScope?: string }).apiKeyScope,
    }
    res.json({ success: true, data: body })
  })

  // Optional-auth route — emulates donations/create.
  app.get('/optional-route', authOptionalJwtOrKey(), (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        userId: req.userId ?? null,
        authenticated: Boolean(req.userId),
      },
    })
  })

  return app
}

interface FetchResp {
  status: number
  body: { success: boolean; data?: EchoBody | Record<string, unknown>; error?: unknown }
}

async function call(
  app: Express,
  path: string,
  headers: Record<string, string> = {}
): Promise<FetchResp> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}${path}`, { headers })
        .then(async r => {
          const body = (await r.json()) as FetchResp['body']
          server.close()
          resolve({ status: r.status, body })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('EZPay authJwtOrKey — unified JWT + API key middleware', () => {
  let app: Express
  let ApiKey: Model<ApiKeyDocument>
  let Usage: Model<ApiKeyUsageDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKey = await getApiKeyModel()
    Usage = await getApiKeyUsageModel()
    try {
      await ApiKey.collection.dropIndexes()
      await Usage.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ApiKey.createIndexes()
    await Usage.createIndexes()
    app = buildTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  beforeEach(async () => {
    await Promise.all([ApiKey.deleteMany({}), Usage.deleteMany({})])
    _resetUsageCacheForTests()
  })

  // ---------------------------------------------------------------------------
  // 1. Anonymous baseline — strict route rejects, optional flows through
  // ---------------------------------------------------------------------------

  describe('anonymous request', () => {
    it('strict route returns 401 with no creds', async () => {
      const res = await call(app, '/user-route')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('optional route flows through without auth', async () => {
      const res = await call(app, '/optional-route')
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ authenticated: false, userId: null })
    })
  })

  // ---------------------------------------------------------------------------
  // 2. JWT path — Bearer header works on every wired route
  // ---------------------------------------------------------------------------

  describe('JWT Bearer path', () => {
    it('valid JWT drives the user-scope route (req.user populated from token)', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const token = signJwt({
        userId,
        email: 'jwt@example.com',
        username: 'jwtuser',
      })

      const res = await call(app, '/user-route', { authorization: `Bearer ${token}` })

      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.userId).toBe(userId)
      // No api-key fields stamped on JWT path.
      expect(data.apiKeyId).toBeUndefined()
      expect(data.apiKeyAppSlug).toBeUndefined()
      expect(data.user).toMatchObject({ userId, email: 'jwt@example.com' })
    })

    it('valid JWT drives the admin-scope route (no key scope check on JWT path)', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const token = signJwt({
        userId,
        email: 'admin@example.com',
        username: 'adm',
        globalRoles: ['superadmin'],
      })

      const res = await call(app, '/admin-route', { authorization: `Bearer ${token}` })

      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.derivedScope).toBe('all') // superadmin → all
    })

    it('expired JWT returns 401 (does NOT fall back to API-key path)', async () => {
      // HAC-CRIT-2 — even an "expired" token must carry valid iss/aud
      // claims to reach the expiry check; otherwise the audience/issuer
      // mismatch fires first (also a 401). Either way the 401 contract is
      // preserved; we keep the audience valid so the assertion exercises
      // the TTL path specifically.
      const expired = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: -1,
        issuer: 'ezauth',
        audience: ['ezauth', 'ezpay', 'ezbill', 'green-pulse'],
      })
      const res = await call(app, '/user-route', { authorization: `Bearer ${expired}` })
      expect(res.status).toBe(401)
    })

    it('JWT signed with wrong secret returns 401', async () => {
      const bad = signJwt({ userId: '507f1f77bcf86cd799439011' }, { secret: 'wrong-secret' })
      const res = await call(app, '/user-route', { authorization: `Bearer ${bad}` })
      expect(res.status).toBe(401)
    })

    // HAC-CRIT-2 — cross-API replay protection regression suite.
    it('JWT with audience that excludes ezpay returns 401 (cross-API replay)', async () => {
      // Token minted for ezbill only — even though JWT_SECRET is shared,
      // ezpay's verifier must reject it because `aud` lacks `'ezpay'`.
      const ezbillOnly = signJwt({ userId: '507f1f77bcf86cd799439011' }, { audience: 'ezbill' })
      const res = await call(app, '/user-route', { authorization: `Bearer ${ezbillOnly}` })
      expect(res.status).toBe(401)
    })

    it('JWT with no audience claim returns 401 (legacy pre-fix token)', async () => {
      // Bypass the helper to emit a claim-less token (mirrors a token
      // issued before HAC-CRIT-2 was deployed).
      const legacy = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '5m',
        // no iss, no aud
      })
      const res = await call(app, '/user-route', { authorization: `Bearer ${legacy}` })
      expect(res.status).toBe(401)
    })

    it('JWT with wrong issuer returns 401 (forged outside ezauth)', async () => {
      const forged = signJwt({ userId: '507f1f77bcf86cd799439011' }, { issuer: 'evil-issuer' })
      const res = await call(app, '/user-route', { authorization: `Bearer ${forged}` })
      expect(res.status).toBe(401)
    })

    it('JWT with audience array containing ezpay is accepted', async () => {
      // Production tokens carry the full platform list; verify ezpay
      // accepts a token whose `aud` lists multiple consumers as long as
      // `'ezpay'` is among them.
      const platformToken = signJwt(
        { userId: '507f1f77bcf86cd799439011', globalRoles: [] },
        { audience: ['ezauth', 'ezpay', 'ezbill'] }
      )
      const res = await call(app, '/user-route', { authorization: `Bearer ${platformToken}` })
      // 200 (route handler echoes); does NOT 401 on audience grounds.
      expect(res.status).toBe(200)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. API key path — scope enforcement + req.user synthesis
  // ---------------------------------------------------------------------------

  describe('API key path — admin scope (ez_sk_*_admin)', () => {
    it('admin secret key drives the admin-scope route', async () => {
      const { rawKey, doc } = await seedKey(ApiKey, {
        type: 'secret',
        env: 'live',
        scope: 'admin',
        userId: 'user-owner',
        appSlug: 'acme',
      })

      const res = await call(app, '/admin-route', { 'x-api-key': rawKey })

      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.userId).toBe('user-owner')
      expect(data.apiKeyId).toBe(String(doc._id))
      expect(data.apiKeyAppSlug).toBe('acme')
      expect(data.apiKeyScope).toBe('admin')
      // Synthesised req.user has appRoles[acme] = ['admin'] for derivedScope.
      expect(data.derivedScope).toBe('myApps')
      expect(data.user).toMatchObject({
        userId: 'user-owner',
        apps: ['acme'],
        globalRoles: [],
        appRoles: { acme: ['admin'] },
      })
    })

    it('accepts the admin key via `Authorization: ApiKey <key>`', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        type: 'secret',
        env: 'live',
        scope: 'admin',
      })
      const res = await call(app, '/admin-route', { authorization: `ApiKey ${rawKey}` })
      expect(res.status).toBe(200)
    })

    it('admin secret key NEVER grants superadmin (derivedScope is myApps, not all)', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'acme',
      })
      const res = await call(app, '/admin-route', { 'x-api-key': rawKey })
      const data = res.body.data as EchoBody
      // Even with admin scope, the synth user has globalRoles = [].
      expect(data.user).toMatchObject({ globalRoles: [] })
      expect(data.derivedScope).toBe('myApps') // NOT 'all'
    })
  })

  describe('API key path — publishable / user scope (ez_pk_*_user)', () => {
    it('publishable key flows through the user-scope route', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        type: 'publishable',
        env: 'live',
        scope: 'user',
        appSlug: 'acme',
      })

      const res = await call(app, '/user-route', { 'x-api-key': rawKey })

      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.apiKeyScope).toBe('user')
      // user scope → no admin role synthesised → derivedScope falls back to 'mine'
      expect(data.derivedScope).toBe('mine')
      expect(data.user).toMatchObject({ appRoles: {} })
    })

    it('publishable key is REJECTED on admin-scope route (HTTP 403)', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        type: 'publishable',
        env: 'live',
        scope: 'user',
      })

      const res = await call(app, '/admin-route', { 'x-api-key': rawKey })

      expect(res.status).toBe(403)
      const error = res.body.error as { code?: string }
      expect(error?.code).toBe('INSUFFICIENT_SCOPE')
    })
  })

  describe('API key path — invalid / revoked / expired', () => {
    it('returns 401 for an unknown key', async () => {
      const res = await call(app, '/user-route', { 'x-api-key': 'ez_sk_live_doesnotexist' })
      expect(res.status).toBe(401)
    })

    it('returns 401 for a revoked key', async () => {
      const { rawKey } = await seedKey(ApiKey, { status: 'revoked' })
      const res = await call(app, '/user-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(401)
    })

    it('returns 401 for an expired key', async () => {
      const past = new Date(Date.now() - 1000)
      const { rawKey } = await seedKey(ApiKey, { expiresAt: past })
      const res = await call(app, '/user-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(401)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Multi-tenancy — admin key for slug X cannot synth admin for slug Y
  // ---------------------------------------------------------------------------

  describe('multi-tenancy boundary', () => {
    it('admin key for slug "acme" synthesises appRoles ONLY for that slug', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'acme',
        applicationId: 'app-acme',
      })

      const res = await call(app, '/admin-route', { 'x-api-key': rawKey })
      const data = res.body.data as EchoBody

      expect(data.user).toMatchObject({
        appRoles: { acme: ['admin'] },
      })
      // The user is NOT an admin for `other-app`. A handler that filters by
      // ownership of `other-app` would see derivedScope='myApps' and (via
      // ezauth-client.listApplicationsByOwner) get an empty owned-apps set
      // for any slug other than 'acme'.
      const appRoles = (data.user as { appRoles?: Record<string, unknown> })?.appRoles ?? {}
      expect(Object.keys(appRoles)).toEqual(['acme'])
      expect(appRoles).not.toHaveProperty('other-app')
    })

    it('user-scope key (publishable) synthesises EMPTY appRoles', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'user',
        type: 'publishable',
        appSlug: 'acme',
      })
      const res = await call(app, '/user-route', { 'x-api-key': rawKey })
      const data = res.body.data as EchoBody
      expect(data.user).toMatchObject({ appRoles: {} })
    })

    it('readonly-scope key is REJECTED on user-scope route (rank: readonly<user, HTTP 403)', async () => {
      // `requireKeyScope` defaults to `'user'` on `authJwtOrKey()`. A readonly
      // key (scope rank 0) does NOT meet the `'user'` minimum (rank 1), so the
      // unified middleware emits 403 INSUFFICIENT_SCOPE — same defence as
      // the publishable-on-admin case.
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'readonly',
        type: 'secret',
        appSlug: 'acme',
      })
      const res = await call(app, '/user-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(403)
      const error = res.body.error as { code?: string }
      expect(error?.code).toBe('INSUFFICIENT_SCOPE')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Auth precedence — JWT short-circuits API-key fallback
  // ---------------------------------------------------------------------------

  describe('auth precedence', () => {
    it('JWT path runs first when a token is present (API key fallback never queried)', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const token = signJwt({ userId, email: 't@t.com' })

      // Send BOTH a JWT and a (would-be-rejected) bogus API key. The JWT
      // wins → the API key is never validated.
      const res = await call(app, '/user-route', {
        authorization: `Bearer ${token}`,
        'x-api-key': 'ez_sk_live_invalid_should_never_check',
      })

      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.userId).toBe(userId)
      expect(data.apiKeyId).toBeUndefined() // API key path never ran
    })

    it('valid API key (no JWT) drives the user-scope route', async () => {
      const { rawKey } = await seedKey(ApiKey, {
        type: 'secret',
        scope: 'user',
        userId: 'user-owner',
      })
      const res = await call(app, '/user-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(200)
      const data = res.body.data as EchoBody
      expect(data.userId).toBe('user-owner')
    })
  })

  // ---------------------------------------------------------------------------
  // 6. authOptionalJwtOrKey — public endpoints with opportunistic auth
  // ---------------------------------------------------------------------------

  describe('authOptionalJwtOrKey', () => {
    it('flows through anonymous (no creds)', async () => {
      const res = await call(app, '/optional-route')
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ authenticated: false })
    })

    it('flows through with a valid JWT (req.userId populated)', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const token = signJwt({ userId })
      const res = await call(app, '/optional-route', { authorization: `Bearer ${token}` })
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ authenticated: true, userId })
    })

    it('flows through with a valid API key', async () => {
      const { rawKey } = await seedKey(ApiKey, { scope: 'user', type: 'publishable' })
      const res = await call(app, '/optional-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ authenticated: true, userId: 'user-owner' })
    })

    it('STILL rejects an invalid JWT (creds present but bad)', async () => {
      const bad = signJwt({ userId: '507f1f77bcf86cd799439011' }, { secret: 'wrong-secret' })
      const res = await call(app, '/optional-route', { authorization: `Bearer ${bad}` })
      expect(res.status).toBe(401)
    })

    it('STILL rejects a revoked API key (creds present but bad)', async () => {
      const { rawKey } = await seedKey(ApiKey, { status: 'revoked' })
      const res = await call(app, '/optional-route', { 'x-api-key': rawKey })
      expect(res.status).toBe(401)
    })
  })
})
