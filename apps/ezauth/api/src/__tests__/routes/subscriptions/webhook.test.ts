/**
 * Integration tests for POST /api/subscriptions/webhook.
 *
 * Exercises the real router against a MongoMemoryServer.
 *
 * Post-V2 webhook secret refactor (2026-05-01): the receiver loads its
 * HMAC secret from `Application.webhookSecret` instead of the legacy
 * `EZAUTH_WEBHOOK_SECRET` env var. Tests must create Applications with
 * an explicit `webhookSecret` (or rely on the auto-default) and sign
 * payloads with that per-Application value.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import { createHmac } from 'crypto'
import webhookRouter from '../../../routes/subscriptions/webhook.js'
import { getApplicationModel } from '../../../models/application.js'
import { getSubscriptionEventModel } from '../../../models/subscription-event.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { createUser, createApiKey, cleanAllCollections } from '../../helpers/setup.js'

/**
 * Stable per-Application secret used by every test fixture below. The model
 * auto-generates one on creation; we override it with this value so the
 * `buildSigHeader` helper is deterministic across the suite.
 */
const SECRET = 'whsec_test_per_application_webhook_secret_v2_refactor_fixture_value'

/**
 * Build the test app with the SAME middleware stack production uses —
 * `express.raw({ type: 'application/json' })` mounted on the webhook
 * path BEFORE the router, so `req.body` is a `Buffer` containing the
 * exact bytes the sender HMAC'd. This guards against `JSON.stringify`
 * key-ordering drift across future engine upgrades.
 */
function createTestApp() {
  const app = express()
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }))
  // Body parser for any other route (none in this test, but kept for parity
  // with production where `express.json` is mounted globally AFTER the raw
  // body middleware).
  app.use(express.json())
  app.use('/api', webhookRouter)
  return app
}

/**
 * Fallback test app that reproduces the legacy stack — `express.json()`
 * only, no raw body capture. Used by ONE test below to prove the
 * backwards-compat code path still works (some external integrators may
 * mount the router behind their own JSON parser).
 */
function createTestAppWithoutRawBody() {
  const app = express()
  app.use(express.json())
  app.use('/api', webhookRouter)
  return app
}

function buildSigHeader(timestamp: string, body: string, secret = SECRET): string {
  const sig = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${sig}`
}

/**
 * Helper to create an Application with a known `webhookSecret`. The default
 * factory would generate a random secret per call which is unusable for the
 * deterministic signature tests below.
 */
async function createTestApplication(opts: {
  ownerId: string
  slug?: string
  name?: string
  webhookSecret?: string
}) {
  const Application = await getApplicationModel()
  return Application.create({
    slug: opts.slug ?? 'acme',
    name: opts.name ?? 'Acme',
    ownerId: opts.ownerId,
    webhookSecret: opts.webhookSecret ?? SECRET,
  })
}

interface PostOptions {
  apiKey?: string
  signature?: string
  bodyOverride?: string
}

async function postWebhook(
  app: express.Express,
  payload: Record<string, unknown>,
  opts: PostOptions = {}
) {
  const body = opts.bodyOverride ?? JSON.stringify(payload)
  const timestamp = (payload.timestamp as string) ?? Math.floor(Date.now() / 1000).toString()
  const signature = opts.signature ?? buildSigHeader(timestamp, body)

  const req = request(app).post('/api/subscriptions/webhook')
  if (opts.apiKey !== undefined) req.set('X-API-Key', opts.apiKey)
  req.set('X-EZStart-Signature', signature)
  req.set('Content-Type', 'application/json')
  // supertest will set Content-Length; send the exact body string
  return req.send(body)
}

describe('POST /api/subscriptions/webhook', () => {
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

    const SubscriptionEvent = await getSubscriptionEventModel()
    try {
      await SubscriptionEvent.collection.dropIndexes()
    } catch {
      // ignore
    }
    await SubscriptionEvent.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const Application = await getApplicationModel()
    await Application.deleteMany({})
    const SubscriptionEvent = await getSubscriptionEventModel()
    await SubscriptionEvent.deleteMany({})
  })

  describe('auth — X-API-Key', () => {
    it('401 when X-API-Key is missing', async () => {
      const user = await createUser()
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: undefined })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toMatch(/API key required/i)
    })

    it('401 when X-API-Key is unknown', async () => {
      const user = await createUser()
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: 'ez_sk_live_notreal' })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toMatch(/Invalid API key/i)
    })

    it('403 when API key lacks admin scope', async () => {
      const user = await createUser()
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        scope: 'user',
        type: 'secret',
        env: 'live',
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(403)
      expect(res.body.error.message).toMatch(/admin scope/i)
    })
  })

  describe('signature verification', () => {
    it('401 when signature is invalid (wrong HMAC)', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: ts,
      }
      const badSig = `t=${ts},v1=${'0'.repeat(64)}`
      const res = await postWebhook(app, payload, { apiKey: rawKey, signature: badSig })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toMatch(/Invalid signature/i)
    })

    it('401 when signature header is malformed', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey, signature: 'garbage' })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toMatch(/signature/i)
    })

    it('401 when timestamp is > 5 minutes old (replay window)', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const oldTs = (Math.floor(Date.now() / 1000) - 10 * 60).toString() // 10 min old
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: oldTs,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('TIMESTAMP_EXPIRED')
    })

    it('401 when body timestamp does not match header timestamp', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const nowTs = Math.floor(Date.now() / 1000).toString()
      const differentTs = (Number(nowTs) - 30).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'active',
        grantsRoles: ['pro'],
        timestamp: differentTs,
      }
      const body = JSON.stringify(payload)
      // Signature computed with body timestamp but header uses nowTs
      const sig = buildSigHeader(nowTs, body)
      const res = await postWebhook(app, payload, {
        apiKey: rawKey,
        signature: sig,
        bodyOverride: body,
      })

      expect(res.status).toBe(401)
    })
  })

  describe('body validation', () => {
    it('400 when body schema is invalid', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        // missing applicationId, userId, etc.
        status: 'active',
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(400)
    })

    it('400 when status is an invalid enum value', async () => {
      const user = await createUser()
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_1',
        status: 'paused',
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(400)
    })
  })

  describe('grants — active status', () => {
    it('200 and adds grantsRoles to AuthUser.appRoles[slug]', async () => {
      const user = await createUser({
        email: 'grant@test.com',
        username: 'grantuser',
        appRoles: { acme: ['beta-tester'] },
      })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_grant',
        status: 'active',
        grantsRoles: ['admin'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(200)
      expect(res.body.data.applied).toBe(true)

      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id!.toString())
      const acmeRoles = updated?.appRoles.get('acme') ?? []
      expect(acmeRoles).toContain('admin')
      expect(acmeRoles).toContain('beta-tester')
    })

    it('200 and adds grantsFeatures to AuthUser.features', async () => {
      const user = await createUser({ email: 'feat@test.com', username: 'featuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_feat',
        status: 'active',
        grantsFeatures: ['advanced-analytics', 'beta-dashboard'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(200)
      expect(res.body.data.applied).toBe(true)

      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id!.toString()).lean()
      expect(updated?.features).toEqual(
        expect.arrayContaining(['advanced-analytics', 'beta-dashboard'])
      )
    })

    it('does not duplicate roles/features already present', async () => {
      const user = await createUser({
        email: 'dedup@test.com',
        username: 'dedupuser',
        appRoles: { acme: ['admin'] },
      })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_dedup',
        status: 'active',
        grantsRoles: ['admin', 'admin'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(200)
      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id!.toString())
      const acmeRoles = updated?.appRoles.get('acme') ?? []
      expect(acmeRoles.filter(r => r === 'admin')).toHaveLength(1)
    })
  })

  describe('grants — canceled status (revoke)', () => {
    it('200 and removes grantsRoles from AuthUser.appRoles[slug]', async () => {
      const user = await createUser({
        email: 'revoke@test.com',
        username: 'revokeuser',
        appRoles: { acme: ['admin', 'beta-tester'] },
      })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_revoke',
        status: 'canceled',
        grantsRoles: ['admin'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(200)
      expect(res.body.data.applied).toBe(true)

      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id!.toString())
      const acmeRoles = updated?.appRoles.get('acme') ?? []
      expect(acmeRoles).not.toContain('admin')
      expect(acmeRoles).toContain('beta-tester')
    })

    it('200 and removes grantsFeatures from AuthUser.features', async () => {
      const AuthUser = await getAuthUserModel()
      const user = await createUser({ email: 'revf@test.com', username: 'revfuser' })
      user.features = ['advanced-analytics', 'other-feature']
      await user.save()

      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_revf',
        status: 'canceled',
        grantsFeatures: ['advanced-analytics'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(200)
      const updated = await AuthUser.findById(user._id!.toString()).lean()
      expect(updated?.features).not.toContain('advanced-analytics')
      expect(updated?.features).toContain('other-feature')
    })
  })

  describe('idempotency', () => {
    it('200 with applied=false when the same stripeEventId is posted twice', async () => {
      const user = await createUser({
        email: 'idem@test.com',
        username: 'idemuser',
      })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts1 = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_idem',
        status: 'active',
        grantsRoles: ['admin'],
        timestamp: ts1,
      }
      const first = await postWebhook(app, payload, { apiKey: rawKey })
      expect(first.status).toBe(200)
      expect(first.body.data.applied).toBe(true)

      // Second call with the same stripeEventId — must be a no-op.
      // Re-sign with a fresh timestamp so it passes the replay window.
      const ts2 = Math.floor(Date.now() / 1000).toString()
      const payload2 = { ...payload, timestamp: ts2 }
      const second = await postWebhook(app, payload2, { apiKey: rawKey })
      expect(second.status).toBe(200)
      expect(second.body.data.applied).toBe(false)
      expect(second.body.data.alreadyApplied).toBe(true)

      // Only one SubscriptionEvent row exists.
      const SubscriptionEvent = await getSubscriptionEventModel()
      const count = await SubscriptionEvent.countDocuments({ stripeEventId: 'evt_idem' })
      expect(count).toBe(1)
    })
  })

  describe('resource not found', () => {
    it('404 when applicationId is unknown', async () => {
      const user = await createUser({ email: 'nfa@test.com', username: 'nfauser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: '507f1f77bcf86cd799439011', // valid ObjectId but missing
        userId: user._id!.toString(),
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_nfa',
        status: 'active',
        grantsRoles: ['admin'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
    })

    it('404 when userId is unknown', async () => {
      const user = await createUser({ email: 'nfu@test.com', username: 'nfuuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: '507f1f77bcf86cd799439011',
        subscriptionId: 'sub_1',
        planId: 'plan-1',
        stripeEventId: 'evt_nfu',
        status: 'active',
        grantsRoles: ['admin'],
        timestamp: ts,
      }
      const res = await postWebhook(app, payload, { apiKey: rawKey })

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('USER_NOT_FOUND')
    })
  })

  describe('raw body capture (engine-upgrade safety)', () => {
    it('verifies HMAC against the EXACT bytes sent on the wire (not re-serialized JSON)', async () => {
      // This test guards against `JSON.stringify` key-ordering drift across
      // engine upgrades. We craft a body string with a deliberately UNUSUAL
      // key order (the schema doesn't care about order, but HMAC does).
      // If the receiver re-serialized via `JSON.stringify(req.body)`, the
      // resulting bytes would differ from `body` and the signature would
      // fail. With raw-body capture, the exact bytes are passed to
      // `verifyEzstartSignature` and the test passes.
      const user = await createUser({ email: 'raw@test.com', username: 'rawuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      // NOTE: keys are intentionally in non-alphabetical order. Some engine
      // versions might iterate keys differently when `JSON.stringify` is
      // called on the parsed object — but raw body capture short-circuits
      // any parsing/re-serialization round-trip.
      const body = JSON.stringify({
        timestamp: ts,
        status: 'active',
        stripeEventId: 'evt_raw_bytes',
        planId: 'plan-1',
        subscriptionId: 'sub_raw',
        userId: user._id!.toString(),
        applicationId: appDoc._id.toString(),
        grantsRoles: ['raw-role'],
      })
      const sig = buildSigHeader(ts, body)

      const res = await request(app)
        .post('/api/subscriptions/webhook')
        .set('X-API-Key', rawKey)
        .set('X-EZStart-Signature', sig)
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.status).toBe(200)
      expect(res.body.data.applied).toBe(true)
    })

    it('still validates correctly when router sits behind express.json (backwards compat)', async () => {
      // Some external integrators may mount the router behind their own
      // `express.json()` parser without using `rawBodyRoutes`. The receiver
      // falls back to `JSON.stringify(req.body)` in that case — works today
      // but is exactly the engine-drift risk we want to surface. Test
      // documents that the fallback path remains functional.
      const legacyApp = createTestAppWithoutRawBody()

      const user = await createUser({
        email: 'legacy@test.com',
        username: 'legacyuser',
      })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appDoc = await createTestApplication({
        ownerId: user._id!.toString(),
      })

      const ts = Math.floor(Date.now() / 1000).toString()
      const payload = {
        applicationId: appDoc._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_legacy',
        planId: 'plan-1',
        stripeEventId: 'evt_legacy',
        status: 'active',
        grantsRoles: ['legacy-role'],
        timestamp: ts,
      }
      const body = JSON.stringify(payload)
      const sig = buildSigHeader(ts, body)

      const res = await request(legacyApp)
        .post('/api/subscriptions/webhook')
        .set('X-API-Key', rawKey)
        .set('X-EZStart-Signature', sig)
        .set('Content-Type', 'application/json')
        .send(body)

      expect(res.status).toBe(200)
      expect(res.body.data.applied).toBe(true)
    })

    it('400 INVALID_BODY when raw body is not valid JSON', async () => {
      const user = await createUser({ email: 'badjson@test.com', username: 'badjsonuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })

      const ts = Math.floor(Date.now() / 1000).toString()
      const garbage = '{"not_closed":'
      const sig = buildSigHeader(ts, garbage)

      const res = await request(app)
        .post('/api/subscriptions/webhook')
        .set('X-API-Key', rawKey)
        .set('X-EZStart-Signature', sig)
        .set('Content-Type', 'application/json')
        .send(garbage)

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_BODY')
    })
  })

  describe('per-Application secret', () => {
    it('signs against the per-Application secret (not a shared env var)', async () => {
      // Two Applications, each with their own webhookSecret. A signature
      // produced with App A's secret must NOT validate against App B's
      // secret — proves the receiver loads the per-Application value.
      const user = await createUser({ email: 'sep@test.com', username: 'sepuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), { scope: 'admin' })
      const appA = await createTestApplication({
        ownerId: user._id!.toString(),
        slug: 'app-a',
        name: 'App A',
        webhookSecret: 'whsec_secret_for_app_a_only_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      })
      const appB = await createTestApplication({
        ownerId: user._id!.toString(),
        slug: 'app-b',
        name: 'App B',
        webhookSecret: 'whsec_secret_for_app_b_only_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      })

      const ts = Math.floor(Date.now() / 1000).toString()

      // Payload targets App B but signed with App A's secret → must fail.
      const payloadCrossSig = {
        applicationId: appB._id.toString(),
        userId: user._id!.toString(),
        subscriptionId: 'sub_cs',
        planId: 'plan-1',
        stripeEventId: 'evt_cs',
        status: 'active',
        grantsRoles: ['admin'],
        timestamp: ts,
      }
      const body = JSON.stringify(payloadCrossSig)
      const wrongSig = buildSigHeader(
        ts,
        body,
        'whsec_secret_for_app_a_only_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      )
      const crossSig = await postWebhook(app, payloadCrossSig, {
        apiKey: rawKey,
        signature: wrongSig,
        bodyOverride: body,
      })
      expect(crossSig.status).toBe(401)
      expect(crossSig.body.error.code).toBe('INVALID_SIGNATURE')

      // Same payload, signed with App B's actual secret → must succeed.
      const correctSig = buildSigHeader(
        ts,
        body,
        'whsec_secret_for_app_b_only_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
      )
      const ok = await postWebhook(
        app,
        { ...payloadCrossSig, stripeEventId: 'evt_cs_ok' },
        {
          apiKey: rawKey,
          signature: buildSigHeader(
            ts,
            JSON.stringify({ ...payloadCrossSig, stripeEventId: 'evt_cs_ok' }),
            'whsec_secret_for_app_b_only_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
          ),
        }
      )
      expect(ok.status).toBe(200)
      expect(ok.body.data.applied).toBe(true)
      // Reference appA so the linter does not flag the variable as unused —
      // it documents the test intent (two Applications exist).
      expect(appA._id.toString()).not.toBe(appB._id.toString())
      // Reference correctSig so its construction is part of the test
      // exercise even though only the inline sig is sent above.
      expect(correctSig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
    })
  })
})
