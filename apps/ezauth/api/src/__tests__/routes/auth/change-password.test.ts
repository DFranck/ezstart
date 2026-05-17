/**
 * HAC-HIGH-5 (2026-05-17) — schema-level coverage for the password floor
 * on `PUT /api/auth/change-password`.
 *
 * The route's Zod schema (`changePasswordSchema`) enforces `newPassword`
 * `min(12).max(128)` — matches `RegisterRequestSchema` and
 * `ResetPasswordRequestSchema`. Previously it was `min(8)`, which let a
 * user downgrade their password floor from 12 chars (set at registration)
 * to 8 chars via this route.
 *
 * Cf. `standard-saas-security.md` §2 ("password strength enforcement").
 *
 * Note: HAC-HIGH-2 ALSO wires `requireEmailVerified` on this route. The
 * cases below seed `isVerified: true` users so the gate is satisfied and
 * we exercise the schema check (not the gate).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import changePasswordRouter from '../../../routes/auth/change-password.js'
import { createUser, generateAccessToken, cleanAllCollections } from '../../helpers/setup.js'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', changePasswordRouter)
  return app
}

describe('PUT /api/change-password — newPassword min(12) policy (HAC-HIGH-5)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('rejects newPassword shorter than 12 characters', async () => {
    const user = await createUser({
      email: 'short@example.com',
      username: 'shortpw',
      password: 'Password123!',
      isVerified: true,
    })
    const token = generateAccessToken(user)

    const res = await request(buildApp())
      .put('/api/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'Short8!1' }) // 8 chars

    // api-core `sendValidationError` uses HTTP 422 (Unprocessable Entity).
    expect(res.status).toBe(422)
    // The Zod error issue carries the 'too_small' kind for `min` violations.
    // Surface both the message and the issue list so the assertion is
    // robust against the api-core envelope shape (`message` vs `details`).
    const flat = JSON.stringify(res.body)
    expect(flat).toMatch(/at least 12|too_small|12 characters/i)
  })

  it('rejects newPassword of exactly 11 characters (just below the floor)', async () => {
    const user = await createUser({
      email: 'eleven@example.com',
      username: 'elevenpw',
      password: 'Password123!',
      isVerified: true,
    })
    const token = generateAccessToken(user)

    const res = await request(buildApp())
      .put('/api/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'ElevenChar1' }) // 11 chars

    // api-core `sendValidationError` uses HTTP 422 (Unprocessable Entity).
    expect(res.status).toBe(422)
  })

  it('accepts newPassword of exactly 12 characters (boundary)', async () => {
    const user = await createUser({
      email: 'twelve@example.com',
      username: 'twelvepw',
      password: 'Password123!',
      isVerified: true,
    })
    const token = generateAccessToken(user)

    const res = await request(buildApp())
      .put('/api/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'TwelveChar1!' }) // 12 chars

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('accepts newPassword well above the floor', async () => {
    const user = await createUser({
      email: 'long@example.com',
      username: 'longpw',
      password: 'Password123!',
      isVerified: true,
    })
    const token = generateAccessToken(user)

    const res = await request(buildApp())
      .put('/api/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'A-much-longer-password-with-1-digit-and-some-entropy!',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('rejects newPassword over 128 characters (ceiling unchanged)', async () => {
    const user = await createUser({
      email: 'huge@example.com',
      username: 'hugepw',
      password: 'Password123!',
      isVerified: true,
    })
    const token = generateAccessToken(user)

    const res = await request(buildApp())
      .put('/api/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'a'.repeat(129),
      })

    // api-core `sendValidationError` uses HTTP 422 (Unprocessable Entity).
    expect(res.status).toBe(422)
  })
})
