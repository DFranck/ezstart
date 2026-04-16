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
