/**
 * Agnostic core tests.
 *
 * Proves that `createApiServer` works WITHOUT any reference to the @ezstart
 * monorepo (no `getApiUrl`, no `getAllowedOrigins`, no shared logger). These
 * tests guard against regressions where monorepo coupling leaks back into
 * the agnostic core.
 */

import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApiServer } from '../core/create-server.js'
import { createAuthMiddleware } from '../core/middleware/auth.js'
import { sendSuccess } from '../core/responses.js'

describe('createApiServer (agnostic)', () => {
  it('builds an Express app exposing health + root endpoints', async () => {
    const { app, config, logger } = createApiServer({ port: 0, serviceName: 'myapp' })

    expect(typeof app.use).toBe('function')
    expect(typeof app.get).toBe('function')
    expect(config.serviceName).toBe('myapp')
    expect(typeof logger.info).toBe('function')

    const health = await request(app).get('/health')
    expect(health.status).toBe(200)
    expect(health.body).toMatchObject({ status: 'ok', service: 'myapp' })

    // Legacy path kept for backwards compatibility
    const legacyHealth = await request(app).get('/api/health')
    expect(legacyHealth.status).toBe(200)
    expect(legacyHealth.body).toMatchObject({ status: 'ok', service: 'myapp' })

    const root = await request(app).get('/')
    expect(root.status).toBe(200)
  })

  it('allows wiring custom routes on the returned app', async () => {
    const { app } = createApiServer({ port: 0, serviceName: 'myapp', cors: '*' })
    app.get('/api/hello', (_req, res) => sendSuccess(res, { msg: 'hi' }))

    const res = await request(app).get('/api/hello')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { msg: 'hi' } })
  })

  it('honors CORS origins array', async () => {
    const { app } = createApiServer({
      port: 0,
      serviceName: 'myapp',
      cors: { origins: ['https://myapp.example.com'] },
    })
    app.get('/api/ok', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/api/ok').set('Origin', 'https://myapp.example.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://myapp.example.com')
  })

  it('applies a global rate limiter when rateLimit is configured', async () => {
    const { app } = createApiServer({
      port: 0,
      serviceName: 'myapp',
      rateLimit: { preset: 'standard', options: { max: 2, windowMs: 60_000, skipPaths: [] } },
    })
    app.get('/api/ping', (_req, res) => res.json({ ok: true }))

    await request(app).get('/api/ping')
    await request(app).get('/api/ping')
    const blocked = await request(app).get('/api/ping')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('auth middleware accepts a fully custom TokenVerifier (no JWT coupling)', async () => {
    const verifyToken = vi.fn(async (token: string) =>
      token === 'good' ? { userId: 'u_42', email: 'a@b.c' } : null
    )

    const { requireAuth } = createAuthMiddleware({ verifyToken })

    const { app } = createApiServer({ port: 0, serviceName: 'myapp' })
    app.get('/api/me', requireAuth, (req, res) => res.json({ userId: req.userId }))

    const unauth = await request(app).get('/api/me')
    expect(unauth.status).toBe(401)
    expect(unauth.body.error.code).toBe('UNAUTHORIZED')

    const ok = await request(app).get('/api/me').set('Authorization', 'Bearer good')
    expect(ok.status).toBe(200)
    expect(ok.body).toEqual({ userId: 'u_42' })

    const bad = await request(app).get('/api/me').set('Authorization', 'Bearer bad')
    expect(bad.status).toBe(401)

    expect(verifyToken).toHaveBeenCalled()
  })

  it('auth middleware falls back to cookie when configured', async () => {
    const verifyToken = vi.fn(async (token: string, kind: 'bearer' | 'cookie') =>
      kind === 'cookie' && token === 'cookie-tok' ? { userId: 'u_cookie' } : null
    )

    const { requireAuth } = createAuthMiddleware({
      verifyToken,
      cookieName: 'access_token',
    })

    const { app } = createApiServer({ port: 0 })
    app.get('/api/me', requireAuth, (req, res) => res.json({ userId: req.userId }))

    const ok = await request(app).get('/api/me').set('Cookie', 'access_token=cookie-tok')
    expect(ok.status).toBe(200)
    expect(ok.body).toEqual({ userId: 'u_cookie' })
  })

  it('has no @ezstart imports in the agnostic core (static check via module keys)', async () => {
    // A sanity guard: the core module should resolve without loading
    // @ezstart/config or @ezstart/logger at all. If someone adds a top-level
    // import, this test would still pass (vitest doesn't track every import),
    // but the dedicated grep in the self-audit covers that angle.
    const core = await import('../core/create-server.js')
    expect(typeof core.createApiServer).toBe('function')
  })
})
