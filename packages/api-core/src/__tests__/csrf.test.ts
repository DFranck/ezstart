/**
 * Tests for CSRF middleware.
 */

import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { describe, expect, it } from 'vitest'
import { createCsrfMiddleware } from '../core/middleware/csrf.js'

/** Minimal cookie parser — populates req.cookies from the Cookie header. */
function parseCookies(req: Request, _res: Response, next: NextFunction) {
  req.cookies = {}
  const header = req.headers.cookie
  if (typeof header === 'string') {
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=')
      if (idx > 0) {
        const key = pair.slice(0, idx).trim()
        req.cookies[key] = pair.slice(idx + 1).trim()
      }
    }
  }
  next()
}

function buildApp() {
  const app = express()
  app.use(parseCookies)
  const csrf = createCsrfMiddleware()
  app.use(csrf.generateToken)
  app.use(csrf.verifyToken)
  app.get('/api/data', (_req, res) => res.json({ ok: true }))
  app.post('/api/data', (_req, res) => res.json({ created: true }))
  return app
}

/** Extract the raw Set-Cookie string for a given cookie name. */
function extractSetCookie(res: request.Response, name: string): string | undefined {
  const cookies = res.headers['set-cookie']
  if (Array.isArray(cookies)) {
    return cookies.find((c: string) => c.startsWith(`${name}=`))
  }
  if (typeof cookies === 'string' && cookies.startsWith(`${name}=`)) {
    return cookies
  }
  return undefined
}

describe('createCsrfMiddleware', () => {
  it('sets csrf-token cookie and X-CSRF-Token header on GET', async () => {
    const app = buildApp()

    const res = await request(app).get('/api/data')
    expect(res.status).toBe(200)
    expect(res.headers['x-csrf-token']).toBeDefined()
    expect(res.headers['x-csrf-token'].length).toBeGreaterThan(0)

    const csrfCookie = extractSetCookie(res, 'csrf-token')
    expect(csrfCookie).toBeDefined()
  })

  it('allows GET requests without CSRF validation', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/data')
    expect(res.status).toBe(200)
  })

  it('rejects POST when no CSRF token is provided', async () => {
    const app = buildApp()
    const res = await request(app).post('/api/data')
    expect(res.status).toBe(403)
    expect(res.body.error.message).toBe('CSRF token mismatch')
  })

  it('rejects POST when header token does not match cookie token', async () => {
    const app = buildApp()

    // GET to obtain a valid cookie
    const getRes = await request(app).get('/api/data')
    const cookies = getRes.headers['set-cookie']
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies)

    const res = await request(app)
      .post('/api/data')
      .set('Cookie', cookieStr)
      .set('X-CSRF-Token', 'wrong-token')
    expect(res.status).toBe(403)
  })

  it('accepts POST when cookie and header tokens match', async () => {
    const app = buildApp()

    const getRes = await request(app).get('/api/data')
    const token = getRes.headers['x-csrf-token'] as string
    const cookies = getRes.headers['set-cookie']
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies)

    const res = await request(app)
      .post('/api/data')
      .set('Cookie', cookieStr)
      .set('X-CSRF-Token', token)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ created: true })
  })

  it('skips validation for HEAD and OPTIONS methods', async () => {
    const app = express()
    app.use(parseCookies)
    const csrf = createCsrfMiddleware()
    app.use(csrf.generateToken)
    app.use(csrf.verifyToken)
    app.options('/api/data', (_req, res) => res.sendStatus(204))
    app.head('/api/data', (_req, res) => res.sendStatus(200))

    const optRes = await request(app).options('/api/data')
    expect(optRes.status).toBe(204)

    const headRes = await request(app).head('/api/data')
    expect(headRes.status).toBe(200)
  })
})

/**
 * Wave B Lot 1 — Timing-safe compare regression suite.
 *
 * Standard reference: .claude/rules/standard-saas-security.md §6
 * ("Timing-safe comparison ... JAMAIS `===` sur signatures").
 *
 * Builds a minimal app where the middleware-chain runs verifyToken DIRECTLY
 * (without generateToken in front), so we control both cookie and header
 * tokens explicitly and can assert behavior on length-mismatch and same-length
 * mismatch cases.
 */
describe('createCsrfMiddleware — timing-safe compare (Wave B Lot 1)', () => {
  function buildVerifyOnlyApp() {
    const app = express()
    app.use(parseCookies)
    const csrf = createCsrfMiddleware()
    // verifyToken ONLY — no generateToken overwriting incoming state.
    app.use(csrf.verifyToken)
    app.get('/x', (_req, res) => res.json({ ok: true }))
    app.post('/x', (_req, res) => res.json({ ok: true }))
    return app
  }

  it('accepts matching cookie + header tokens (same value, same length)', async () => {
    const app = buildVerifyOnlyApp()
    const token = 'a'.repeat(64)
    const res = await request(app)
      .post('/x')
      .set('Cookie', `csrf-token=${token}`)
      .set('X-CSRF-Token', token)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('rejects mismatched tokens with the SAME length (timing-safe path)', async () => {
    const app = buildVerifyOnlyApp()
    const a = 'a'.repeat(64)
    const b = 'b'.repeat(64)
    const res = await request(app)
      .post('/x')
      .set('Cookie', `csrf-token=${a}`)
      .set('X-CSRF-Token', b)
    expect(res.status).toBe(403)
    expect(res.body.error.message).toBe('CSRF token mismatch')
  })

  it('rejects mismatched tokens with DIFFERENT lengths (no TypeError leak)', async () => {
    // Regression: crypto.timingSafeEqual throws TypeError when buffer lengths
    // differ. The middleware MUST length-check first and return 403 cleanly.
    const app = buildVerifyOnlyApp()
    const a = 'short'
    const b = 'definitely-much-longer-token-string'
    const res = await request(app)
      .post('/x')
      .set('Cookie', `csrf-token=${a}`)
      .set('X-CSRF-Token', b)
    expect(res.status).toBe(403)
    expect(res.body.error.message).toBe('CSRF token mismatch')
  })

  it('rejects when cookie token is missing', async () => {
    const app = buildVerifyOnlyApp()
    const res = await request(app).post('/x').set('X-CSRF-Token', 'x')
    expect(res.status).toBe(403)
  })

  it('rejects when header token is missing', async () => {
    const app = buildVerifyOnlyApp()
    const res = await request(app).post('/x').set('Cookie', 'csrf-token=x')
    expect(res.status).toBe(403)
  })

  it('skips GET/HEAD/OPTIONS (safe methods are never compared)', async () => {
    const app = buildVerifyOnlyApp()
    // No cookie, no header — would 403 on POST, but GET must bypass.
    const res = await request(app).get('/x')
    expect(res.status).toBe(200)
  })

  it('rejects when both cookie and header are empty strings (falsy guard)', async () => {
    // Defense-in-depth: empty string is falsy, must hit the missing-token
    // branch BEFORE the timing-safe compare (which would otherwise pass on
    // two zero-length buffers).
    const app = buildVerifyOnlyApp()
    const res = await request(app).post('/x').set('Cookie', 'csrf-token=').set('X-CSRF-Token', '')
    expect(res.status).toBe(403)
  })
})
