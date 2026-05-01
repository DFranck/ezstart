/**
 * Tests for `requireTwoFactor()` — defense-in-depth gate that blocks
 * elevated-role users (admin / superadmin) from `/api/admin/*` routes
 * until they enroll 2FA. Industry pattern (Stripe / Clerk / Auth0).
 *
 * Covers :
 * - Plain user (no elevated role) → middleware is a no-op (next()).
 * - Superadmin without enrolled 2FA → 403 + `code: TWO_FACTOR_REQUIRED`.
 * - Superadmin WITH enrolled 2FA → next().
 * - App-level admin (per-app role) without 2FA → 403.
 * - App-level admin WITH 2FA → next().
 * - Request authenticated via API key (`req.apiKeyId`) → middleware skips.
 * - Missing `req.user` → 401 (programmer error / upstream auth bypass).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type Request, type Response, type NextFunction } from 'express'
import request from 'supertest'
import {
  createUser,
  createAdminUser,
  createAppAdmin,
  enableTwoFactorForUser,
  cleanAllCollections,
} from '../helpers/setup.js'
import { requireTwoFactor, TWO_FACTOR_REQUIRED_CODE } from '../../middleware/require-two-factor.js'

/**
 * Build a tiny express app that simulates the real auth stack :
 * upstream middleware populates `req.user` from a header-encoded user shim
 * (so we control the role / 2FA scenario without spinning up the JWT
 * verifier), then `requireTwoFactor()` runs.
 */
function createTestApp() {
  const app = express()

  function injectUserMiddleware(req: Request, _res: Response, next: NextFunction) {
    const headerValue = req.headers['x-test-user']
    if (typeof headerValue === 'string' && headerValue.length > 0) {
      const parsed = JSON.parse(headerValue) as {
        _id: string
        email: string
        globalRoles?: string[]
        appRoles?: Record<string, string[]>
      }
      // Mirror the shape the real upstream auth middleware writes — both
      // `_id` and `userId` are populated identically for downstream
      // helpers (cf. `apps/ezauth/api/src/middleware/auth.ts`).
      ;(req as Request & { user?: unknown; userId?: string }).user = {
        ...parsed,
        userId: parsed._id,
      }
      ;(req as Request & { userId?: string }).userId = parsed._id
    }
    const apiKey = req.headers['x-test-api-key']
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      ;(req as Request & { apiKeyId?: string }).apiKeyId = apiKey
    }
    next()
  }

  app.use(injectUserMiddleware)
  app.get('/admin/protected', requireTwoFactor(), (_req, res) => {
    res.status(200).json({ success: true })
  })
  return app
}

describe('requireTwoFactor() middleware', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('returns 401 when req.user is missing (defensive)', async () => {
    const res = await request(app).get('/admin/protected')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('passes through plain users with no elevated role', async () => {
    // Even without 2FA enrolled, a plain user must not be blocked — the
    // middleware is a no-op for everyone except admin / superadmin so the
    // same router can host mixed-audience routes if ever needed.
    const user = await createUser({
      email: 'plain@example.com',
      username: 'plainuser',
    })
    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: user._id!.toString(),
          email: user.email,
          globalRoles: [],
          appRoles: {},
        })
      )

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('blocks superadmin without enrolled 2FA with 403 + TWO_FACTOR_REQUIRED', async () => {
    const admin = await createAdminUser({
      email: 'no2fa-admin@example.com',
      username: 'no2faadmin',
      withTwoFactor: false,
    })
    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: admin._id!.toString(),
          email: admin.email,
          globalRoles: ['superadmin'],
          appRoles: {},
        })
      )

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe(TWO_FACTOR_REQUIRED_CODE)
    expect(res.body.error.details).toEqual({ redirectTo: '/settings?tab=2fa' })
    expect(res.body.error.message).toContain('2FA')
  })

  it('lets superadmin through when 2FA is enrolled', async () => {
    const admin = await createAdminUser({
      email: '2fa-admin@example.com',
      username: '2faadmin',
      // withTwoFactor: true is the default for createAdminUser
    })
    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: admin._id!.toString(),
          email: admin.email,
          globalRoles: ['superadmin'],
          appRoles: {},
        })
      )

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('blocks app-level admin (per-app role) without 2FA', async () => {
    const appAdmin = await createAppAdmin('green-pulse', {
      email: 'no2fa-appadmin@example.com',
      username: 'no2faappadmin',
      withTwoFactor: false,
    })
    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: appAdmin._id!.toString(),
          email: appAdmin.email,
          globalRoles: [],
          appRoles: { 'green-pulse': ['admin'] },
        })
      )

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe(TWO_FACTOR_REQUIRED_CODE)
  })

  it('lets app-level admin through when 2FA is enrolled', async () => {
    const appAdmin = await createAppAdmin('green-pulse', {
      email: '2fa-appadmin@example.com',
      username: '2faappadmin',
      // withTwoFactor: true (default)
    })
    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: appAdmin._id!.toString(),
          email: appAdmin.email,
          globalRoles: [],
          appRoles: { 'green-pulse': ['admin'] },
        })
      )

    expect(res.status).toBe(200)
  })

  it('skips enforcement when authenticated via admin API key (S2S)', async () => {
    // Admin / superadmin role + NO 2FA enrolled — would normally be blocked.
    // Setting `req.apiKeyId` simulates the unified-auth middleware flagging
    // the request as a server-to-server admin key call (Stripe pattern :
    // sk_live_* keys are themselves the second factor and cannot be
    // prompted for a TOTP code).
    const admin = await createAdminUser({
      email: 's2s-admin@example.com',
      username: 's2sadmin',
      withTwoFactor: false,
    })
    const res = await request(app)
      .get('/admin/protected')
      .set('X-Test-Api-Key', 'apikey-doc-id-xyz')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: admin._id!.toString(),
          email: admin.email,
          globalRoles: ['superadmin'],
          appRoles: {},
        })
      )

    expect(res.status).toBe(200)
  })

  it('responds 403 even when 2FA was enabled then disabled (live check)', async () => {
    // Source of truth is the TotpSecret doc, not the JWT claim. A user who
    // disables 2FA must be locked out on the next request.
    const admin = await createAdminUser({
      email: 'flip-admin@example.com',
      username: 'flipadmin',
      // 2FA enrolled at creation
    })
    const TotpSecretModel = await import('../../models/totp-secret.js').then(m =>
      m.getTotpSecretModel()
    )
    await TotpSecretModel.updateOne(
      { userId: admin._id!.toString() },
      { $set: { isEnabled: false } }
    )

    const res = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: admin._id!.toString(),
          email: admin.email,
          globalRoles: ['superadmin'],
          appRoles: {},
        })
      )

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe(TWO_FACTOR_REQUIRED_CODE)

    // And once we re-enable, the same admin gets through again.
    await enableTwoFactorForUser(admin._id!.toString())

    const res2 = await request(app)
      .get('/admin/protected')
      .set(
        'X-Test-User',
        JSON.stringify({
          _id: admin._id!.toString(),
          email: admin.email,
          globalRoles: ['superadmin'],
          appRoles: {},
        })
      )
    expect(res2.status).toBe(200)
  })
})
