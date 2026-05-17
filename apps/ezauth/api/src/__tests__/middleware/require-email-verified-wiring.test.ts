/**
 * HAC-HIGH-2 (2026-05-17) — integration coverage for the
 * `requireEmailVerified` wiring across every privileged route in EZAuth.
 *
 * Each table entry mounts the REAL router and exercises the full middleware
 * chain (auth + email-verification gate + controller stub) through supertest.
 * The test asserts the gate fires the expected `403 EMAIL_VERIFICATION_REQUIRED`
 * for unverified users and lets verified users through (NOT asserting
 * downstream controller behaviour — that's the existing suites' job).
 *
 * Routes NOT covered by this gate (kept open intentionally) :
 *   - /auth/login, /auth/refresh, /auth/logout
 *   - /auth/verify-email, /auth/send-verification (resend)
 *   - /auth/forgot-password, /auth/reset-password
 *   - /auth/me (GET — reading own profile is safe)
 *   - /auth/2fa/validate (mid-login, no req.user yet)
 *
 * Cf. `standard-saas-security.md` §2 ("email verification gate").
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import type { Application } from 'express'
import { EMAIL_VERIFICATION_REQUIRED_CODE } from '@ezstart/auth-sdk/server'
import { createUser, generateAccessToken, cleanAllCollections } from '../helpers/setup.js'
import { getApplicationModel } from '../../models/application.js'

import createApiKeyRouter from '../../routes/api-keys/create.js'
import revokeApiKeyRouter from '../../routes/api-keys/revoke.js'
import rotateApiKeyRouter from '../../routes/api-keys/rotate.js'
import changePasswordRouter from '../../routes/auth/change-password.js'
import changeEmailRouter from '../../routes/auth/change-email.js'
import updateProfileRouter from '../../routes/auth/update-profile.js'
import deleteAccountRouter from '../../routes/auth/delete-account.js'
import twoFactorSetupRouter from '../../routes/auth/two-factor/setup.js'
import twoFactorVerifyRouter from '../../routes/auth/two-factor/verify.js'
import twoFactorDisableRouter from '../../routes/auth/two-factor/disable.js'
import createApplicationRouter from '../../routes/applications/create.js'
import updateApplicationRouter from '../../routes/applications/update.js'
import archiveApplicationRouter from '../../routes/applications/archive.js'
import updateApplicationThemeRouter from '../../routes/applications/update-theme.js'
import regenerateWebhookSecretRouter from '../../routes/applications/regenerate-webhook-secret.js'

/**
 * Each entry describes how to invoke a single privileged route.
 *
 * `setup` runs before each invocation when the route needs DB fixtures
 * (e.g. an Application document for `applicationId`-bearing requests). It
 * receives the authenticated userId and returns the params + body the
 * supertest call should use.
 */
interface RouteCase {
  name: string
  router: express.Router
  /**
   * Express verb the route handles. `delete` doubles as account-deletion
   * via DELETE.
   */
  method: 'post' | 'put' | 'patch' | 'delete'
  /**
   * Path WITHOUT mount prefix. The test mounts the router on `/api`, so a
   * route registered as `docRouter.post('/keys', ...)` matches `/api/keys`.
   */
  path: (userId: string) => string
  body?: (userId: string) => Promise<Record<string, unknown>> | Record<string, unknown>
  /**
   * Optional pre-flight fixture (e.g. seed an Application so the route has
   * something to mutate before the email-verification gate even fires).
   */
  setup?: (userId: string) => Promise<{ path?: string; body?: Record<string, unknown> }>
}

const ROUTE_CASES: RouteCase[] = [
  {
    name: 'POST /api/keys',
    router: createApiKeyRouter,
    method: 'post',
    path: () => '/api/keys',
    body: () => ({ name: 'k', type: 'publishable', env: 'live', scope: 'user' }),
  },
  {
    name: 'DELETE /api/keys/:id',
    router: revokeApiKeyRouter,
    method: 'delete',
    path: () => '/api/keys/507f1f77bcf86cd799439011',
  },
  {
    name: 'POST /api/keys/:id/rotate',
    router: rotateApiKeyRouter,
    method: 'post',
    path: () => '/api/keys/507f1f77bcf86cd799439011/rotate',
  },
  {
    name: 'PUT /api/change-password',
    router: changePasswordRouter,
    method: 'put',
    path: () => '/api/change-password',
    body: () => ({ currentPassword: 'Password123!', newPassword: 'NewLongerPassword456!' }),
  },
  {
    name: 'POST /api/change-email',
    router: changeEmailRouter,
    method: 'post',
    path: () => '/api/change-email',
    body: () => ({ newEmail: 'new@example.com', password: 'Password123!' }),
  },
  {
    name: 'PUT /api/profile',
    router: updateProfileRouter,
    method: 'put',
    path: () => '/api/profile',
    body: () => ({ firstName: 'New' }),
  },
  {
    name: 'DELETE /api/account',
    router: deleteAccountRouter,
    method: 'delete',
    path: () => '/api/account',
    body: () => ({ confirmation: 'test@example.com', password: 'Password123!' }),
  },
  {
    name: 'POST /api/2fa/setup',
    router: twoFactorSetupRouter,
    method: 'post',
    path: () => '/api/2fa/setup',
  },
  {
    name: 'POST /api/2fa/verify',
    router: twoFactorVerifyRouter,
    method: 'post',
    path: () => '/api/2fa/verify',
    body: () => ({ code: '123456' }),
  },
  {
    name: 'POST /api/2fa/disable',
    router: twoFactorDisableRouter,
    method: 'post',
    path: () => '/api/2fa/disable',
    body: () => ({ code: '123456' }),
  },
  {
    name: 'POST /api/applications',
    router: createApplicationRouter,
    method: 'post',
    path: () => '/api/applications',
    body: () => ({ slug: 'newapp', name: 'New App' }),
  },
  {
    name: 'PATCH /api/applications/:id',
    router: updateApplicationRouter,
    method: 'patch',
    path: () => '/api/applications/507f1f77bcf86cd799439011',
    body: () => ({ name: 'Renamed' }),
  },
  {
    name: 'DELETE /api/applications/:id',
    router: archiveApplicationRouter,
    method: 'delete',
    path: () => '/api/applications/507f1f77bcf86cd799439011',
  },
  {
    name: 'PATCH /api/applications/:id/theme',
    router: updateApplicationThemeRouter,
    method: 'patch',
    path: () => '/api/applications/507f1f77bcf86cd799439011/theme',
    body: () => ({ themeEnabled: true }),
  },
  {
    name: 'POST /api/applications/:id/regenerate-webhook-secret',
    router: regenerateWebhookSecretRouter,
    method: 'post',
    path: () => '/api/applications/507f1f77bcf86cd799439011/regenerate-webhook-secret',
    body: () => ({ confirm: true }),
  },
]

function buildApp(router: express.Router): Application {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', router)
  return app
}

describe('HAC-HIGH-2 — requireEmailVerified wiring across privileged routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    // Application indexes are needed for the `/applications` create-path
    // tests so the slug uniqueness check doesn't crash.
    const Application = await getApplicationModel()
    try {
      await Application.collection.dropIndexes()
    } catch {
      // ignore — collection may not exist yet
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

  for (const route of ROUTE_CASES) {
    describe(route.name, () => {
      it('rejects with 403 EMAIL_VERIFICATION_REQUIRED when isVerified=false', async () => {
        const user = await createUser({
          email: `unverified-${Date.now()}@example.com`,
          username: `unverified${Date.now()}`,
          isVerified: false,
        })
        const token = generateAccessToken(user)
        const app = buildApp(route.router)
        const body = route.body ? await route.body(user._id!.toString()) : undefined

        const path = route.path(user._id!.toString())
        const req = request(app)[route.method](path).set('Authorization', `Bearer ${token}`)
        const res = await (body ? req.send(body) : req.send())

        expect(res.status).toBe(403)
        // The gate's JSON envelope is `{ success: false, error: { message, code } }`.
        expect(res.body.success).toBe(false)
        expect(res.body.error?.code).toBe(EMAIL_VERIFICATION_REQUIRED_CODE)
      })

      it('passes through the gate (no 403 from THIS middleware) when isVerified=true', async () => {
        const user = await createUser({
          email: `verified-${Date.now()}@example.com`,
          username: `verified${Date.now()}`,
          isVerified: true,
        })
        const token = generateAccessToken(user)
        const app = buildApp(route.router)
        const body = route.body ? await route.body(user._id!.toString()) : undefined

        const path = route.path(user._id!.toString())
        const req = request(app)[route.method](path).set('Authorization', `Bearer ${token}`)
        const res = await (body ? req.send(body) : req.send())

        // The verified user MUST get past `requireEmailVerified`. The
        // downstream controller may still return 4xx (404 on missing
        // resource, 400 on bad TOTP code, etc.) — that's expected; what
        // we assert is that the response is NOT a 403 carrying our gate's
        // error code.
        if (res.status === 403) {
          expect(res.body.error?.code).not.toBe(EMAIL_VERIFICATION_REQUIRED_CODE)
        }
      })
    })
  }
})
