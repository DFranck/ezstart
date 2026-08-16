/**
 * End-to-end CSRF integration tests — SDK-CSRF-TOKEN-ALWAYS-001 Phase 1.
 *
 * Spins up a minimal Express app that wires the real `verifyCookieCsrf`
 * middleware in front of a write endpoint, then exercises the wire-level
 * behaviour with raw supertest calls (no SDK in the loop) to pin the
 * server-side contract the auth-sdk now relies on:
 *
 *  1. Cookie-auth POST without a CSRF token → 403 (CSRF mismatch).
 *  2. Cookie-auth POST with matching `csrf-token` cookie + `X-CSRF-Token`
 *     header → 200 (passes the guard).
 *  3. Cookie-auth POST with a MISMATCHED header → 403 (timing-safe compare).
 *  4. Bearer-auth POST without any CSRF token → 200 (middleware skipped).
 *
 * This is the contract the client-side helper in
 * `packages/auth-sdk/src/core/auth-client/csrf.ts` and `cookieWrite` rely on
 * — if it ever drifts, the SDK starts looping on 403s for every cookie-auth
 * write.
 *
 * The HIGH-1 stopgap (Origin-trusting `<known-app>-git-staging-ezstart.vercel.app`)
 * is kept intentionally — Phase 2 removes it AFTER staging deploy is green.
 * cf. `apps/ezauth/api/src/middleware/csrf.ts` SECURITY DEBT HIGH-1.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { createCsrfMiddleware, sendSuccess } from '@ezstart/api-core'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { createUser, generateAccessToken, cleanAllCollections } from '../helpers/setup.js'

/**
 * Build the minimal app under test:
 *   - `GET  /csrf-prime`     issues the `csrf-token` cookie (mirrors the
 *                            real `GET /api/auth/login-cookie/csrf` route).
 *   - `POST /protected-write` wears `verifyCookieCsrf` + a stub handler.
 *
 * No DB writes — auth is faked via the ezauth_token cookie / Authorization
 * header the way the real middleware reads them.
 */
function buildApp(): express.Express {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  const csrf = createCsrfMiddleware()
  app.get('/csrf-prime', csrf.generateToken, (_req, res) => {
    sendSuccess(res, { message: 'CSRF token generated' })
  })

  app.post('/protected-write', verifyCookieCsrf, (_req, res) => {
    sendSuccess(res, { message: 'write accepted' })
  })

  return app
}

/**
 * Extract a cookie value from a supertest `set-cookie` header. The header
 * may arrive as `string | string[]` depending on whether the server emitted
 * one or multiple `Set-Cookie` lines; normalize to array first. Returns
 * `undefined` when the cookie name is absent.
 */
function readSetCookie(
  setCookieHeader: string | string[] | undefined,
  name: string
): string | undefined {
  if (!setCookieHeader) return undefined
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  for (const raw of headers) {
    const match = raw.match(new RegExp(`^${name}=([^;]+)`))
    if (match) return match[1]
  }
  return undefined
}

describe('CSRF end-to-end — SDK-CSRF-TOKEN-ALWAYS-001 Phase 1', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = buildApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('rejects a cookie-auth write that omits the CSRF token (no token = 403)', async () => {
    const user = await createUser({ email: 'no-csrf@example.com', username: 'nocsrf' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .post('/protected-write')
      .set('Cookie', `ezauth_token=${token}`)
      // No Origin (untrusted) — verifyCookieCsrf falls through to the
      // standard double-submit token check, which fails without an
      // X-CSRF-Token header.
      .send({})

    expect(res.status).toBe(403)
    expect(res.body?.error?.message ?? res.body?.error).toContain('CSRF')
  })

  it('accepts a cookie-auth write with matching csrf-token cookie + X-CSRF-Token header', async () => {
    const user = await createUser({ email: 'csrf-ok@example.com', username: 'csrfok' })
    const token = generateAccessToken(user)

    // Step 1 — prime the CSRF cookie via the public priming endpoint.
    const primeRes = await request(app).get('/csrf-prime')
    expect(primeRes.status).toBe(200)
    const csrfCookieValue = readSetCookie(primeRes.headers['set-cookie'], 'csrf-token')
    expect(csrfCookieValue).toBeTruthy()

    // Step 2 — replay the token in both the cookie and the X-CSRF-Token
    // header on a cookie-auth write. Untrusted origin to bypass the
    // Origin allowlist short-circuit and force the double-submit check.
    const writeRes = await request(app)
      .post('/protected-write')
      .set('Cookie', `ezauth_token=${token}; csrf-token=${csrfCookieValue!}`)
      .set('Origin', 'https://untrusted-consumer.example.com')
      .set('X-CSRF-Token', csrfCookieValue!)
      .send({})

    expect(writeRes.status).toBe(200)
    expect(writeRes.body?.data?.message).toBe('write accepted')
  })

  it('rejects a cookie-auth write when the X-CSRF-Token header does not match the cookie (timing-safe compare)', async () => {
    const user = await createUser({ email: 'csrf-mismatch@example.com', username: 'csrfmm' })
    const token = generateAccessToken(user)

    const primeRes = await request(app).get('/csrf-prime')
    const csrfCookieValue = readSetCookie(primeRes.headers['set-cookie'], 'csrf-token')
    expect(csrfCookieValue).toBeTruthy()

    // Replay the cookie but send a DIFFERENT token in the header — the
    // server uses `crypto.timingSafeEqual` on equal-length buffers and a
    // length-check shortcut for unequal lengths. Both must reject.
    const writeRes = await request(app)
      .post('/protected-write')
      .set('Cookie', `ezauth_token=${token}; csrf-token=${csrfCookieValue!}`)
      .set('Origin', 'https://untrusted-consumer.example.com')
      .set('X-CSRF-Token', 'a-different-token-of-different-length')
      .send({})

    expect(writeRes.status).toBe(403)
    expect(writeRes.body?.error?.message ?? writeRes.body?.error).toContain('CSRF')
  })

  it('bearer-auth writes bypass CSRF entirely (no token required)', async () => {
    const user = await createUser({ email: 'bearer-write@example.com', username: 'bearerw' })
    const token = generateAccessToken(user)

    const writeRes = await request(app)
      .post('/protected-write')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    // verifyCookieCsrf short-circuits on `Authorization: Bearer ...` so the
    // request never reaches the double-submit check.
    expect(writeRes.status).toBe(200)
    expect(writeRes.body?.data?.message).toBe('write accepted')
  })
})
