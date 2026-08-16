/**
 * MED-3 (Wave D Lot 3A) — no raw `error.message` leak to the client.
 *
 * The login / token-exchange / change-password routes previously echoed
 * `error.message` verbatim on the failure path. An unexpected error (Mongoose
 * validation, DB structure hints, a stack-derived message, etc.) could leak
 * internal detail. These routes now map errors to a stable allowlist of
 * client-safe messages; everything else collapses to a generic message.
 *
 * Strategy: stub the service to throw an UNEXPECTED error with an obviously
 * internal-looking message, then assert the HTTP response carries the generic
 * message instead — while the intentional, allowlisted messages still pass
 * through unchanged.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { AuthService } from '../../../services/auth.service.js'
import { TotpService } from '../../../services/totp.service.js'
import loginRouter from '../../../routes/auth/login.js'
import tokenRouter from '../../../routes/auth/token.js'
import changePasswordRouter from '../../../routes/auth/change-password.js'
import { createUser, generateAccessToken, cleanAllCollections } from '../../helpers/setup.js'

const LEAKY_MESSAGE =
  'E11000 duplicate key error collection: ezauth.auth_users index: secret_internal_idx'

function buildApp(router: express.Router) {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', router)
  return app
}

describe('MED-3 — error message leak prevention', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/login', () => {
    it('does NOT leak an unexpected error.message (returns generic "Login failed")', async () => {
      vi.spyOn(AuthService, 'validateCredentials').mockRejectedValueOnce(new Error(LEAKY_MESSAGE))

      const res = await request(buildApp(loginRouter))
        .post('/api/login')
        .send({ email: 'x@example.com', password: 'whatever-password', app: 'ezstart' })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toBe('Login failed')
      expect(JSON.stringify(res.body)).not.toContain('E11000')
      expect(JSON.stringify(res.body)).not.toContain('secret_internal_idx')
    })

    it('still surfaces the intentional "Invalid credentials" message', async () => {
      vi.spyOn(AuthService, 'validateCredentials').mockRejectedValueOnce(
        new Error('Invalid credentials')
      )

      const res = await request(buildApp(loginRouter))
        .post('/api/login')
        .send({ email: 'x@example.com', password: 'whatever-password', app: 'ezstart' })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toBe('Invalid credentials')
    })

    it('still surfaces the intentional "no password set" UX message', async () => {
      const msg = "You haven't set a password yet. Use Google sign-in or click Forgot Password."
      vi.spyOn(AuthService, 'validateCredentials').mockRejectedValueOnce(new Error(msg))

      const res = await request(buildApp(loginRouter))
        .post('/api/login')
        .send({ email: 'x@example.com', password: 'whatever-password', app: 'ezstart' })

      expect(res.status).toBe(401)
      expect(res.body.error.message).toBe(msg)
    })
  })

  describe('POST /api/token', () => {
    it('does NOT leak an unexpected error.message (returns generic message)', async () => {
      vi.spyOn(AuthService, 'exchangeCodeForToken').mockRejectedValueOnce(new Error(LEAKY_MESSAGE))

      const res = await request(buildApp(tokenRouter))
        .post('/api/token')
        .send({ code: 'some-code', app: 'ezstart' })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe('Token exchange failed')
      expect(JSON.stringify(res.body)).not.toContain('E11000')
    })

    it('still surfaces the intentional "Invalid or expired authorization code" message', async () => {
      vi.spyOn(AuthService, 'exchangeCodeForToken').mockRejectedValueOnce(
        new Error('Invalid or expired authorization code')
      )

      const res = await request(buildApp(tokenRouter))
        .post('/api/token')
        .send({ code: 'some-code', app: 'ezstart' })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe('Invalid or expired authorization code')
    })
  })

  describe('PUT /api/change-password', () => {
    it('does NOT leak an unexpected error.message (returns generic message)', async () => {
      const user = await createUser({
        email: 'cp-leak@example.com',
        username: 'cpleak',
        password: 'CorrectHorseBatteryStaple9',
        isVerified: true,
      })
      const token = generateAccessToken(user)

      // 2FA off so the auth middleware passes.
      vi.spyOn(TotpService, 'isEnabled').mockResolvedValue(false)

      // The controller fetches a real Mongoose document via `findById(userId)`
      // (the auth middleware uses a separate `.select().lean()` chain, so we
      // only override the controller's bare `findById` call). Force its
      // `save()` to reject with a leaky message AFTER credential + policy
      // checks pass so the generic-message catch block runs.
      //
      // `findById` is invoked twice on the SAME model object: first by the
      // auth middleware (`.select().lean()`), then by the controller (bare).
      // We let the first call run normally and only stub the SECOND call.
      const { getAuthUserModel } = await import('../../../models/auth-user.js')
      const AuthUser = await getAuthUserModel()
      const realFindById = AuthUser.findById.bind(AuthUser)
      const realDoc = await AuthUser.findById(user._id)
      if (!realDoc) throw new Error('fixture user missing')
      vi.spyOn(realDoc, 'save').mockRejectedValueOnce(new Error(LEAKY_MESSAGE))

      let calls = 0
      vi.spyOn(AuthUser, 'findById').mockImplementation(((id: unknown) => {
        calls += 1
        // 1st call = auth middleware (needs the real Query for .select().lean())
        // 2nd call = controller (return the doc whose save() rejects)
        if (calls >= 2) {
          return Promise.resolve(realDoc) as unknown as ReturnType<typeof AuthUser.findById>
        }
        return realFindById(id as string)
      }) as typeof AuthUser.findById)

      const res = await request(buildApp(changePasswordRouter))
        .put('/api/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'CorrectHorseBatteryStaple9',
          newPassword: 'qZ7!vBn3kLp2xWm9', // strong (score >= 3)
        })

      expect(res.status).toBe(500)
      expect(res.body.error.message).toBe('Unable to change password')
      expect(JSON.stringify(res.body)).not.toContain('E11000')
      expect(JSON.stringify(res.body)).not.toContain('secret_internal_idx')
    })
  })
})
