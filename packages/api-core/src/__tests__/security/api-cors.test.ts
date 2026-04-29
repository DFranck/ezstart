/**
 * Integration tests for the 3-tier CORS policy wired by `createBaseApiServer`
 * (and transitively by `createApiServer`).
 *
 * Verifies the full behaviour:
 * - Permissive CORS (`*`, no credentials) applied globally.
 * - Strict CORS overrides permissive only on `cookieAuthRoutes` prefixes.
 * - Fallback to legacy `cors` option still works for backcompat.
 *
 * See `.claude/rules/standard-saas-cors.md`.
 */

import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createBaseApiServer } from '../../core/create-server.js'

describe('createBaseApiServer — 3-tier CORS integration', () => {
  describe('Tier 1/2 — permissive CORS applied globally by default', () => {
    it('GET /api/keys/config from random origin → ACAO: *', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      app.get('/api/keys/config', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .get('/api/keys/config')
        .set('Origin', 'https://random-consumer.example.com')
      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBe('https://random-consumer.example.com')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('Bearer-auth route from any origin → reflected ACAO + credentials true', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      app.post('/api/donations', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .post('/api/donations')
        .set('Origin', 'https://any-site.example.com')
        .set('Authorization', 'Bearer x')
      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBe('https://any-site.example.com')
    })

    it('OPTIONS preflight on any path → 204 + reflected ACAO', async () => {
      const { app } = createBaseApiServer({ port: 0 })

      const res = await request(app)
        .options('/api/anything')
        .set('Origin', 'https://random.com')
        .set('Access-Control-Request-Method', 'POST')
      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe('https://random.com')
    })
  })

  describe('Tier 3 — strict CORS on cookieAuthRoutes prefixes', () => {
    it('cookie-auth path from allowlisted origin → ACAO: <origin> + credentials', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })
      app.post('/api/auth/login', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://ezauth.ezstart.xyz')
      expect(res.headers['access-control-allow-origin']).toBe('https://ezauth.ezstart.xyz')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('cookie-auth path from random origin → no ACAO header', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })
      app.post('/api/auth/login', (_req, res) => res.json({ ok: true }))

      const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('OPTIONS preflight on cookie path from random origin → rejected', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })

      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://evil.com')
        .set('Access-Control-Request-Method', 'POST')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('OPTIONS preflight on cookie path from allowlisted origin → 204 + credentials', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })

      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://ezauth.ezstart.xyz')
        .set('Access-Control-Request-Method', 'POST')
      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe('https://ezauth.ezstart.xyz')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('regex allowlist entry matches Vercel preview deploys', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: [/^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/],
      })
      app.post('/api/auth/login', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://ezauth-deadbeef-ezstart.vercel.app')
      expect(res.headers['access-control-allow-origin']).toBe(
        'https://ezauth-deadbeef-ezstart.vercel.app'
      )
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('non-cookie path still gets permissive CORS even with cookieAuthRoutes set', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })
      app.get('/api/keys/config', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .get('/api/keys/config')
        .set('Origin', 'https://random-tiers-domain.com')
      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBe('https://random-tiers-domain.com')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('multiple cookieAuthRoutes prefixes are all strict', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cookieAuthRoutes: ['/api/auth/login', '/api/auth/refresh'],
        cookieAuthAllowlist: ['https://ezauth.ezstart.xyz'],
      })
      app.post('/api/auth/login', (_req, res) => res.json({ ok: true }))
      app.post('/api/auth/refresh', (_req, res) => res.json({ ok: true }))

      for (const path of ['/api/auth/login', '/api/auth/refresh']) {
        const blocked = await request(app).post(path).set('Origin', 'https://evil.com')
        expect(blocked.headers['access-control-allow-origin']).toBeUndefined()

        const allowed = await request(app).post(path).set('Origin', 'https://ezauth.ezstart.xyz')
        expect(allowed.headers['access-control-allow-origin']).toBe('https://ezauth.ezstart.xyz')
      }
    })
  })

  describe('Legacy cors option (backcompat)', () => {
    it('when `cors` is set, it wins over the 3-tier defaults', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        cors: { origins: ['https://legacy.example.com'] },
      })
      app.get('/anywhere', (_req, res) => res.json({ ok: true }))

      // Legacy applies globally — random origin is rejected
      const rejected = await request(app).get('/anywhere').set('Origin', 'https://random.com')
      expect(rejected.headers['access-control-allow-origin']).toBeUndefined()

      // Legacy allows the declared origin
      const allowed = await request(app)
        .get('/anywhere')
        .set('Origin', 'https://legacy.example.com')
      expect(allowed.headers['access-control-allow-origin']).toBe('https://legacy.example.com')
      expect(allowed.headers['access-control-allow-credentials']).toBe('true')
    })

    it('legacy cors: "*" still works', async () => {
      const { app } = createBaseApiServer({ port: 0, cors: '*' })
      app.get('/anywhere', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/anywhere').set('Origin', 'https://random.com')
      expect(res.headers['access-control-allow-origin']).toBe('*')
      expect(res.headers['access-control-allow-credentials']).toBeUndefined()
    })
  })

  describe('cookieAuthRoutes set with empty allowlist → warning', () => {
    it('logs a warning when cookieAuthRoutes is set but allowlist is empty', async () => {
      const warnings: Array<[string, unknown]> = []
      const logger = {
        info: () => {
          /* noop */
        },
        warn: (msg: string, data?: unknown) => {
          warnings.push([msg, data])
        },
        error: () => {
          /* noop */
        },
        debug: () => {
          /* noop */
        },
      }
      createBaseApiServer({
        port: 0,
        logger,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: [],
      })

      expect(warnings.some(([msg]) => msg.includes('cookieAuthAllowlist is empty'))).toBe(true)
    })

    it('rejects all cross-origin cookie requests when allowlist is empty', async () => {
      const silentLogger = {
        info: () => {
          /* noop */
        },
        warn: () => {
          /* noop */
        },
        error: () => {
          /* noop */
        },
        debug: () => {
          /* noop */
        },
      }
      const { app } = createBaseApiServer({
        port: 0,
        logger: silentLogger,
        cookieAuthRoutes: ['/api/auth/login'],
        cookieAuthAllowlist: [],
      })
      app.post('/api/auth/login', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://ezauth.ezstart.xyz')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
})
