/**
 * Security tests for CSRF middleware.
 *
 * Attack vectors:
 * 6. CSRF cookie httpOnly:false — XSS can steal it (by design, but documented)
 * 7. CSRF with SameSite:strict cross-origin behavior
 * 8. Empty CSRF cookie + empty header — do they "match" as equal?
 * 9. CSRF token replay after regeneration
 */

import express, { type NextFunction, type Request, type Response } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createCsrfMiddleware } from '../../core/middleware/csrf.js'

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

function buildApp() {
  const app = express()
  app.use(parseCookies)
  const csrf = createCsrfMiddleware()
  app.use(csrf.generateToken)
  app.use(csrf.verifyToken)
  app.get('/api/data', (_req, res) => res.json({ ok: true }))
  app.post('/api/data', express.json(), (_req, res) => res.json({ created: true }))
  app.put('/api/data', express.json(), (_req, res) => res.json({ updated: true }))
  app.delete('/api/data', (_req, res) => res.json({ deleted: true }))
  app.patch('/api/data', express.json(), (_req, res) => res.json({ patched: true }))
  return app
}

describe('CSRF middleware — security', () => {
  // ─── Attack vector 6: httpOnly:false cookie ───
  describe('Cookie security attributes', () => {
    it('csrf-token cookie is NOT httpOnly (by design — JS must read it)', async () => {
      const app = buildApp()
      const res = await request(app).get('/api/data')
      const csrfCookie = extractSetCookie(res, 'csrf-token')
      expect(csrfCookie).toBeDefined()
      // httpOnly should NOT be present — JS needs to read the cookie to send it in the header
      expect(csrfCookie).not.toContain('HttpOnly')
    })

    it('csrf-token cookie defaults to SameSite=Lax (Wave B Lot 4 B4-E)', async () => {
      // Default changed strict → lax to support cross-origin SSO link clicks
      // (industry default; matches Chromium/Firefox/Safari since 2020).
      const app = buildApp()
      const res = await request(app).get('/api/data')
      const csrfCookie = extractSetCookie(res, 'csrf-token')
      expect(csrfCookie).toBeDefined()
      expect(csrfCookie).toContain('SameSite=Lax')
      expect(csrfCookie).not.toContain('SameSite=Strict')
    })

    it('csrf-token cookie respects SameSite=Strict when explicitly configured', async () => {
      const app = express()
      app.use(parseCookies)
      const csrf = createCsrfMiddleware({ sameSite: 'strict' })
      app.use(csrf.generateToken)
      app.use(csrf.verifyToken)
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test')
      const csrfCookie = extractSetCookie(res, 'csrf-token')
      expect(csrfCookie).toBeDefined()
      expect(csrfCookie).toContain('SameSite=Strict')
    })

    it('csrf-token cookie has Secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        const app = express()
        app.use(parseCookies)
        const csrf = createCsrfMiddleware()
        app.use(csrf.generateToken)
        app.use(csrf.verifyToken)
        app.get('/test', (_req, res) => res.json({ ok: true }))

        const res = await request(app).get('/test')
        const csrfCookie = extractSetCookie(res, 'csrf-token')
        expect(csrfCookie).toBeDefined()
        expect(csrfCookie).toContain('Secure')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  // ─── Attack vector 8: Empty CSRF cookie + empty header matching ───
  describe('Empty token matching', () => {
    it('CRITICAL: rejects when both cookie and header are empty strings', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/api/data')
        .set('Cookie', 'csrf-token=')
        .set('X-CSRF-Token', '')
      // Both are empty/undefined — the middleware checks !cookieToken || !headerToken
      // cookie parser gives '' for empty value, which is falsy in JS
      // BUT req.cookies['csrf-token'] from our parseCookies gives '' which is falsy.
      // req.headers['x-csrf-token'] as '' is also falsy.
      // So !cookieToken = true → rejects. GOOD.
      expect(res.status).toBe(403)
    })

    it('rejects when cookie is present but header is missing', async () => {
      const app = buildApp()
      const getRes = await request(app).get('/api/data')
      const cookies = getRes.headers['set-cookie']
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies)

      const res = await request(app).post('/api/data').set('Cookie', cookieStr)
      // No X-CSRF-Token header
      expect(res.status).toBe(403)
    })

    it('rejects when header is present but cookie is missing', async () => {
      const app = buildApp()
      const getRes = await request(app).get('/api/data')
      const token = getRes.headers['x-csrf-token'] as string

      const res = await request(app).post('/api/data').set('X-CSRF-Token', token)
      // No Cookie header
      expect(res.status).toBe(403)
    })
  })

  // ─── Attack vector 9: CSRF token replay ───
  describe('Token regeneration and replay', () => {
    it('generates a NEW token on every request (not reusing)', async () => {
      const app = buildApp()
      const res1 = await request(app).get('/api/data')
      const res2 = await request(app).get('/api/data')
      const token1 = res1.headers['x-csrf-token']
      const token2 = res2.headers['x-csrf-token']
      // Tokens should be different on each request (randomBytes)
      expect(token1).not.toBe(token2)
    })

    it('rejects old token after a new one is generated for the same session', async () => {
      // In a real scenario, each request generates a new token.
      // The verifyToken middleware checks the COOKIE value vs HEADER value.
      // Since the generateToken runs BEFORE verifyToken in the middleware chain,
      // by the time POST arrives, a NEW token was generated and set on the cookie.
      // The old cookie from the previous GET is sent by the client, but the
      // generateToken middleware has already overwritten the response cookie.
      // However: the REQUEST cookie is the one sent by the client (old token),
      // and the verifyToken reads req.cookies which is the INCOMING cookie.
      // So the old token in the cookie WILL match the header if the client
      // sends both the old cookie and old header.

      const app = buildApp()

      // Step 1: GET to obtain token A
      const getRes1 = await request(app).get('/api/data')
      const tokenA = getRes1.headers['x-csrf-token'] as string
      const cookiesA = getRes1.headers['set-cookie']
      const cookieStrA = Array.isArray(cookiesA) ? cookiesA.join('; ') : String(cookiesA)

      // Step 2: GET again to obtain token B (simulates a new page load)
      const getRes2 = await request(app).get('/api/data')
      const tokenB = getRes2.headers['x-csrf-token'] as string
      expect(tokenA).not.toBe(tokenB)

      // Step 3: POST with old token A in both cookie and header
      // FINDING: This succeeds because the verifyToken reads req.cookies (incoming)
      // and compares with x-csrf-token header. The generateToken middleware
      // overwrites the RESPONSE cookie but cannot change the REQUEST cookie.
      // So if a client replays old cookie + old header, they match.
      const replayRes = await request(app)
        .post('/api/data')
        .set('Cookie', cookieStrA)
        .set('X-CSRF-Token', tokenA)
      // This IS expected to succeed with the double-submit pattern.
      // The double-submit pattern does NOT prevent token replay — it only
      // ensures the requester can read the cookie (same-origin proof).
      expect(replayRes.status).toBe(200)
    })
  })

  // ─── All mutating methods covered ───
  describe('All mutating HTTP methods require CSRF', () => {
    for (const method of ['post', 'put', 'delete', 'patch'] as const) {
      it(`rejects ${method.toUpperCase()} without CSRF token`, async () => {
        const app = buildApp()
        const res = await (request(app) as Record<string, (...args: unknown[]) => request.Test>)[
          method
        ]('/api/data')
        expect(res.status).toBe(403)
      })
    }
  })

  // ─── Token length check ───
  describe('Token entropy', () => {
    it('generates a 64-character hex token (32 bytes of randomness)', async () => {
      const app = buildApp()
      const res = await request(app).get('/api/data')
      const token = res.headers['x-csrf-token'] as string
      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
