/**
 * Cross-tenant isolation tests for the `_docs-demo` sandbox
 * (DOCS_DEMO_SANDBOX_BACKEND-001).
 *
 * The sandbox is the safety net of the live `/docs/components` previews —
 * if any of these tests fail, the docs sandbox is leaking data across
 * tenant boundaries and MUST not be deployed. Each test asserts a single,
 * narrowly-scoped invariant:
 *
 *  T1 — Reserved slug `_*` cannot be created by a regular tenant via the
 *       API route (403). Only superadmins can.
 *  T2 — Demo-quotas middleware blocks signup once the user count reaches
 *       the configured `quotas.maxUsers` (429).
 *  T3 — Demo-quotas middleware blocks login/signup once the daily audit
 *       event quota (`quotas.maxEventsPerDay`) is reached (429).
 *  T4 — Demo-quotas middleware is a strict no-op for non-demo
 *       (`req.body.app !== '_docs-demo'`) traffic — no Mongo lookup, no
 *       quota check, the request flows through unaffected even when the
 *       sandbox is "full".
 *  T5 — `resetDocsDemoData()` deletes ONLY `_docs-demo` users + audit
 *       logs. Any non-demo data sitting in the same DB is left untouched.
 *  T6 — Reset preserves the `_docs-demo` Application document + its
 *       reserved API keys (we wipe USERS and EVENTS, not the sandbox
 *       skeleton).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type RequestHandler } from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { applicationRouters } from '../../routes/applications/index.js'
import { getApplicationModel } from '../../models/application.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuditLogModel, computeAuditLogExpiry } from '../../models/audit-log.js'
import { getRefreshTokenModel } from '../../models/refresh-token.js'
import {
  createUser,
  createAdminUser,
  generateAccessToken,
  cleanAllCollections,
} from '../helpers/setup.js'
import {
  seedDocsDemoApp,
  DOCS_DEMO_APP_SLUG,
  DOCS_DEMO_QUOTAS,
  DOCS_DEMO_SEED_MARKER,
} from '../../scripts/seed-docs-demo-app.js'
import {
  checkDemoQuotas,
  _resetDemoQuotaCacheForTests,
} from '../../middleware/check-demo-quotas.js'
import { resetDocsDemoData } from '../../services/docs-demo-reset.service.js'

function createApplicationsTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  applicationRouters.forEach(r => app.use('/api', r))
  return app
}

/**
 * Minimal app that wraps the `checkDemoQuotas` middleware around a no-op
 * handler. Lets us exercise the gate without booting the whole auth stack.
 */
function createDemoQuotasTestApp() {
  const app = express()
  app.use(express.json())
  const passthrough: RequestHandler = (_req, res) => {
    res.status(200).json({ success: true })
  }
  app.post('/test/register', checkDemoQuotas, passthrough)
  app.post('/test/login', checkDemoQuotas, passthrough)
  return app
}

describe('Docs Demo Isolation', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const [Application, AuditLog] = await Promise.all([getApplicationModel(), getAuditLogModel()])
    // Force-include archived + test-mode + soft-deleted in the wipe so each
    // test starts on a guaranteed-empty slate. Without `includeArchived`
    // the pre-find guard would skip archived sandbox docs from a prior test.
    await Application.deleteMany({}, { includeArchived: true })
    await AuditLog.deleteMany({})
    _resetDemoQuotaCacheForTests()
  })

  afterEach(() => {
    _resetDemoQuotaCacheForTests()
  })

  // ────────────────────────────────────────────────────────────────────
  // T1 — Reserved slug protection
  // ────────────────────────────────────────────────────────────────────
  describe('T1 — Reserved slug protection (`_*` namespace)', () => {
    it('rejects regular tenant attempting to create a `_*` slug (403)', async () => {
      const app = createApplicationsTestApp()
      const user = await createUser({ email: 't1a@test.com', username: 't1a' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: '_docs-demo', name: 'Hijack attempt' })

      expect(res.status).toBe(403)
      expect(res.body.error?.message ?? res.body.error).toMatch(/reserved/i)
    })

    it('rejects regular tenant attempting another `_*` slug (403)', async () => {
      const app = createApplicationsTestApp()
      const user = await createUser({ email: 't1b@test.com', username: 't1b' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: '_internal-tools', name: 'Try again' })

      expect(res.status).toBe(403)
    })

    it('allows regular tenant to create a normal slug (no `_` prefix)', async () => {
      const app = createApplicationsTestApp()
      const user = await createUser({ email: 't1c@test.com', username: 't1c' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'acme', name: 'Acme' })

      expect(res.status).toBe(200)
    })

    it('allows superadmin to create a `_*` slug (200)', async () => {
      const app = createApplicationsTestApp()
      const admin = await createAdminUser({ email: 't1d@test.com', username: 't1d' })
      const token = generateAccessToken(admin)

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: '_internal-test', name: 'Internal Test' })

      expect(res.status).toBe(200)
      expect(res.body.data.slug).toBe('_internal-test')
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T2 — User count quota gate
  // ────────────────────────────────────────────────────────────────────
  describe('T2 — `maxUsers` quota gate', () => {
    it('blocks signup once user count reaches the configured cap', async () => {
      const app = createDemoQuotasTestApp()
      await seedDocsDemoApp()

      const AuthUser = await getAuthUserModel()
      // Pre-fill the sandbox to its max capacity.
      const docs = Array.from({ length: DOCS_DEMO_QUOTAS.maxUsers }).map((_, i) => ({
        email: `demo${i}@docs-demo.test`,
        username: `demo_user_${i}`,
        passwordHash: 'placeholder',
        isVerified: true,
        apps: [DOCS_DEMO_APP_SLUG],
      }))
      await AuthUser.insertMany(docs)

      const res = await request(app)
        .post('/test/register')
        .send({ app: DOCS_DEMO_APP_SLUG, email: 'overflow@test.com' })

      expect(res.status).toBe(429)
      expect(res.body.error?.message ?? res.body.error).toMatch(/capacity/i)
    })

    it('allows signup while user count < cap', async () => {
      const app = createDemoQuotasTestApp()
      await seedDocsDemoApp()

      const AuthUser = await getAuthUserModel()
      // Insert a small number — well under the cap.
      await AuthUser.create({
        email: 'demo1@docs-demo.test',
        username: 'demo_user_1',
        passwordHash: 'placeholder',
        isVerified: true,
        apps: [DOCS_DEMO_APP_SLUG],
      })

      const res = await request(app)
        .post('/test/register')
        .send({ app: DOCS_DEMO_APP_SLUG, email: 'newdemo@test.com' })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T3 — Daily event quota gate
  // ────────────────────────────────────────────────────────────────────
  describe('T3 — `maxEventsPerDay` quota gate', () => {
    it('blocks login/signup once daily audit event count is reached', async () => {
      const app = createDemoQuotasTestApp()
      await seedDocsDemoApp()

      const AuditLog = await getAuditLogModel()
      // Pre-fill the audit log to its max capacity for the last 24h.
      const now = new Date()
      const events = Array.from({ length: DOCS_DEMO_QUOTAS.maxEventsPerDay }).map((_, i) => ({
        userId: `demo-user-${i}`,
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login' as const,
        metadata: {},
        createdAt: now,
        expiresAt: computeAuditLogExpiry('free', now),
        isTestMode: true,
      }))
      await AuditLog.insertMany(events)

      const res = await request(app)
        .post('/test/login')
        .send({ app: DOCS_DEMO_APP_SLUG, email: 'demo@test.com' })

      expect(res.status).toBe(429)
      expect(res.body.error?.message ?? res.body.error).toMatch(/daily limit/i)
    })

    it('does NOT count audit logs older than 24h toward the quota', async () => {
      const app = createDemoQuotasTestApp()
      await seedDocsDemoApp()

      const AuditLog = await getAuditLogModel()
      // Stale logs (older than 24h) — should NOT block.
      const stale = new Date(Date.now() - 25 * 60 * 60 * 1000)
      const events = Array.from({ length: DOCS_DEMO_QUOTAS.maxEventsPerDay }).map((_, i) => ({
        userId: `demo-user-${i}`,
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login' as const,
        metadata: {},
        createdAt: stale,
        expiresAt: computeAuditLogExpiry('free', new Date()),
        isTestMode: true,
      }))
      await AuditLog.insertMany(events)

      const res = await request(app)
        .post('/test/login')
        .send({ app: DOCS_DEMO_APP_SLUG, email: 'demo@test.com' })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T4 — No-op for non-demo traffic
  // ────────────────────────────────────────────────────────────────────
  describe('T4 — Strict no-op for non-demo traffic', () => {
    it('lets non-demo signup through even when sandbox is "full"', async () => {
      const app = createDemoQuotasTestApp()
      await seedDocsDemoApp()

      // Fill the sandbox to its caps (would block a docs-demo signup).
      const AuthUser = await getAuthUserModel()
      const docs = Array.from({ length: DOCS_DEMO_QUOTAS.maxUsers + 5 }).map((_, i) => ({
        email: `demo${i}@docs-demo.test`,
        username: `demo_user_${i}`,
        passwordHash: 'placeholder',
        isVerified: true,
        apps: [DOCS_DEMO_APP_SLUG],
      }))
      await AuthUser.insertMany(docs)

      const AuditLog = await getAuditLogModel()
      const now = new Date()
      const events = Array.from({ length: DOCS_DEMO_QUOTAS.maxEventsPerDay + 5 }).map((_, i) => ({
        userId: `demo-user-${i}`,
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login' as const,
        metadata: {},
        createdAt: now,
        expiresAt: computeAuditLogExpiry('free', now),
        isTestMode: true,
      }))
      await AuditLog.insertMany(events)

      // Non-demo traffic flows through unaffected.
      const res = await request(app)
        .post('/test/register')
        .send({ app: 'acme', email: 'live@acme.com' })
      expect(res.status).toBe(200)
    })

    it('returns 503 if a demo request arrives but the sandbox was never seeded', async () => {
      const app = createDemoQuotasTestApp()
      // No seed — sandbox Application missing.

      const res = await request(app)
        .post('/test/register')
        .send({ app: DOCS_DEMO_APP_SLUG, email: 'demo@test.com' })

      expect(res.status).toBe(503)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T5 — Reset isolation (only `_docs-demo` data is wiped)
  // ────────────────────────────────────────────────────────────────────
  describe('T5 — `resetDocsDemoData()` deletes ONLY `_docs-demo` data', () => {
    it('does not touch users / audit logs scoped to other apps', async () => {
      await seedDocsDemoApp()

      const AuthUser = await getAuthUserModel()
      const AuditLog = await getAuditLogModel()

      // Demo data
      await AuthUser.create({
        email: 'demo@docs.test',
        username: 'demo_user',
        passwordHash: 'placeholder',
        isVerified: true,
        apps: [DOCS_DEMO_APP_SLUG],
      })
      await AuditLog.create({
        userId: 'demo-user-id',
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login',
        metadata: {},
        expiresAt: computeAuditLogExpiry('free'),
        // 25h-old → eligible for cleanup
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        isTestMode: true,
      })

      // Live data — MUST survive the reset
      const liveUser = await AuthUser.create({
        email: 'live@acme.com',
        username: 'live_user',
        passwordHash: 'placeholder',
        isVerified: true,
        apps: ['acme'],
      })
      const liveAudit = await AuditLog.create({
        userId: liveUser._id!.toString(),
        appName: 'acme',
        action: 'login',
        metadata: {},
        expiresAt: computeAuditLogExpiry('free'),
        // 25h-old → would be deleted IF the cron mistakenly broadened scope
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        isTestMode: false,
      })

      const result = await resetDocsDemoData()

      expect(result.usersDeleted).toBe(1)
      expect(result.auditLogsDeleted).toBe(1)

      // Live data intact
      const liveUserStillThere = await AuthUser.findById(liveUser._id).lean()
      expect(liveUserStillThere).not.toBeNull()

      const liveAuditStillThere = await AuditLog.findById(liveAudit._id).lean()
      expect(liveAuditStillThere).not.toBeNull()
    })

    it('cascades refresh-token deletion for demo users only', async () => {
      await seedDocsDemoApp()

      const AuthUser = await getAuthUserModel()
      const RefreshToken = await getRefreshTokenModel()

      const demoUser = await AuthUser.create({
        email: 'demo2@docs.test',
        username: 'demo_user_2',
        passwordHash: 'placeholder',
        isVerified: true,
        apps: [DOCS_DEMO_APP_SLUG],
      })
      const liveUser = await AuthUser.create({
        email: 'live2@acme.com',
        username: 'live_user_2',
        passwordHash: 'placeholder',
        isVerified: true,
        apps: ['acme'],
      })

      await RefreshToken.create({
        userId: demoUser._id!.toString(),
        tokenHash: 'demo-refresh-token-hash',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      })
      await RefreshToken.create({
        userId: liveUser._id!.toString(),
        tokenHash: 'live-refresh-token-hash',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      })

      const result = await resetDocsDemoData()

      expect(result.usersDeleted).toBe(1)
      expect(result.refreshTokensDeleted).toBe(1)

      // Live refresh token survives
      const liveTokenStill = await RefreshToken.findOne({
        userId: liveUser._id!.toString(),
      }).lean()
      expect(liveTokenStill).not.toBeNull()

      // Demo refresh token gone
      const demoTokenGone = await RefreshToken.findOne({
        userId: demoUser._id!.toString(),
      }).lean()
      expect(demoTokenGone).toBeNull()
    })

    it('keeps recent (<24h) demo audit logs around for forensics', async () => {
      await seedDocsDemoApp()

      const AuditLog = await getAuditLogModel()
      // Fresh log (< 24h)
      await AuditLog.create({
        userId: 'demo-recent',
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login',
        metadata: {},
        expiresAt: computeAuditLogExpiry('free'),
        createdAt: new Date(),
        isTestMode: true,
      })
      // Stale log (> 24h)
      await AuditLog.create({
        userId: 'demo-old',
        appName: DOCS_DEMO_APP_SLUG,
        action: 'login',
        metadata: {},
        expiresAt: computeAuditLogExpiry('free'),
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        isTestMode: true,
      })

      const result = await resetDocsDemoData()
      expect(result.auditLogsDeleted).toBe(1)

      const remaining = await AuditLog.find({ appName: DOCS_DEMO_APP_SLUG }).lean()
      expect(remaining).toHaveLength(1)
      expect(remaining[0]!.userId).toBe('demo-recent')
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T6 — Reset preserves the sandbox skeleton (App + keys)
  // ────────────────────────────────────────────────────────────────────
  describe('T6 — Reset preserves the sandbox Application + API keys', () => {
    it('does not delete the `_docs-demo` Application document', async () => {
      await seedDocsDemoApp()

      await resetDocsDemoData()

      const Application = await getApplicationModel()
      const app = await Application.findOne({ slug: DOCS_DEMO_APP_SLUG }).lean()
      expect(app).not.toBeNull()
      expect(app!.reservedSlug).toBe(true)
    })

    it('does not delete the `_docs-demo` API keys', async () => {
      await seedDocsDemoApp()

      await resetDocsDemoData()

      const ApiKey = await getApiKeyModel()
      const keys = await ApiKey.find({
        appName: DOCS_DEMO_APP_SLUG,
        createdBy: DOCS_DEMO_SEED_MARKER,
      }).lean()
      expect(keys).toHaveLength(2)
    })
  })
})
