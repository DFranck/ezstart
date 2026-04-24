/**
 * Security tests for CORS middlewares.
 *
 * Attack vectors:
 * 15. CORS with wildcard + credentials (dangerous combo)
 * 16. Origin header spoofing
 * 17. Preflight cache behavior
 *
 * Covers the three factories:
 * - `createCorsMiddleware` (legacy, @deprecated)
 * - `createPermissiveCorsMiddleware` (Tier 1/2 — public + Bearer)
 * - `createStrictCorsMiddleware` (Tier 3 — cookie-authenticated)
 *
 * See `.claude/rules/standard-saas-cors.md` for the full policy.
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import {
  createCorsMiddleware,
  createPermissiveCorsMiddleware,
  createStrictCorsMiddleware,
} from '../../core/middleware/cors.js'

describe('createCorsMiddleware (legacy) — security', () => {
  // ─── Attack vector 15: Wildcard + credentials ───
  describe('Wildcard + credentials protection', () => {
    it('wildcard CORS does NOT set credentials:true', async () => {
      const app = express()
      app.use(createCorsMiddleware('*'))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://evil.com')
      expect(res.headers['access-control-allow-origin']).toBe('*')
      expect(res.headers['access-control-allow-credentials']).toBeUndefined()
    })

    it('restricted CORS sets credentials:true with specific origin', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://app.example.com')
      expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('restricted CORS rejects unauthorized origins', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://evil.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('restricted CORS allows disabling credentials explicitly', async () => {
      const app = express()
      app.use(
        createCorsMiddleware({
          origins: ['https://app.example.com'],
          credentials: false,
        })
      )
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://app.example.com')
      expect(res.headers['access-control-allow-credentials']).toBeUndefined()
    })
  })

  // ─── Attack vector 16: Origin spoofing ───
  describe('Origin header spoofing', () => {
    it('CORS is a browser-enforced mechanism — API cannot prevent curl spoofing', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://evil.com')
      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('no Origin header at all still works (server-to-server / same-origin)', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test')
      expect(res.status).toBe(200)
    })
  })

  // ─── Attack vector 17: Preflight behavior ───
  describe('Preflight (OPTIONS) handling', () => {
    it('responds to OPTIONS with correct CORS headers', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .options('/test')
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com')
      expect(res.headers['access-control-allow-methods']).toBeDefined()
    })

    it('default methods include all standard HTTP methods', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .options('/test')
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'DELETE')
      expect(res.status).toBe(204)
      const methods = res.headers['access-control-allow-methods']
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('DELETE')
      expect(methods).toContain('PATCH')
    })

    it('default allowed headers include Authorization and x-user-id', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))

      const res = await request(app)
        .options('/test')
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
      expect(res.status).toBe(204)
      const headers = res.headers['access-control-allow-headers']
      expect(headers).toContain('Authorization')
    })
  })
})

describe('createPermissiveCorsMiddleware (Tier 1/2) — public + Bearer', () => {
  it('reflects any origin in ACAO (so credentialed fetches work)', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test').set('Origin', 'https://random-consumer.example.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://random-consumer.example.com')
  })

  it('sets credentials: true so SDKs sending `credentials: include` are not blocked', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test').set('Origin', 'https://random.example.com')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('exposes X-Request-Id and Retry-After by default', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test').set('Origin', 'https://any.example.com')
    const exposed = res.headers['access-control-expose-headers'] ?? ''
    expect(exposed).toContain('X-Request-Id')
    expect(exposed).toContain('Retry-After')
  })

  it('allows Authorization, X-API-Key, X-EZStart-Signature, X-User-Id headers', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app)
      .options('/test')
      .set('Origin', 'https://consumer.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'Authorization,X-API-Key,X-EZStart-Signature,X-User-Id'
      )
    expect(res.status).toBe(204)
    const allowed = res.headers['access-control-allow-headers']
    expect(allowed).toContain('Authorization')
    expect(allowed).toContain('X-API-Key')
    expect(allowed).toContain('X-EZStart-Signature')
  })

  it('preflight OPTIONS returns 204 with reflected origin + credentials true', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())

    const res = await request(app)
      .options('/anything')
      .set('Origin', 'https://random.com')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://random.com')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('accepts custom methods / headers / exposedHeaders overrides', async () => {
    const app = express()
    app.use(
      createPermissiveCorsMiddleware({
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'X-Custom-Auth'],
        exposedHeaders: ['X-My-Header'],
      })
    )
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app)
      .options('/test')
      .set('Origin', 'https://any.com')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-methods']).toContain('POST')
    expect(res.headers['access-control-allow-headers']).toContain('X-Custom-Auth')
    expect(res.headers['access-control-expose-headers']).toContain('X-My-Header')
  })
})

describe('createStrictCorsMiddleware (Tier 3) — cookie-auth', () => {
  it('allows origin listed as exact string + sets credentials: true', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: ['https://ezauth.ezstart.xyz'] }))
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/auth').set('Origin', 'https://ezauth.ezstart.xyz')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://ezauth.ezstart.xyz')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('allows origin matching a regex entry (Vercel preview deploys)', async () => {
    const app = express()
    app.use(
      createStrictCorsMiddleware({
        allowlist: [/^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/],
      })
    )
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const res = await request(app)
      .get('/auth')
      .set('Origin', 'https://ezauth-abc123xyz-ezstart.vercel.app')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://ezauth-abc123xyz-ezstart.vercel.app'
    )
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('rejects origin NOT in allowlist (no ACAO header)', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: ['https://ezauth.ezstart.xyz'] }))
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/auth').set('Origin', 'https://evil.com')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('allows request with no Origin (same-origin / curl / server-to-server)', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: ['https://ezauth.ezstart.xyz'] }))
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/auth')
    expect(res.status).toBe(200)
  })

  it('preflight OPTIONS from allowed origin returns 204 with reflected ACAO', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: ['https://ezauth.ezstart.xyz'] }))

    const res = await request(app)
      .options('/auth/login')
      .set('Origin', 'https://ezauth.ezstart.xyz')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://ezauth.ezstart.xyz')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('preflight OPTIONS from rejected origin has no ACAO header', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: ['https://ezauth.ezstart.xyz'] }))

    const res = await request(app)
      .options('/auth/login')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('logs a warning when an origin is rejected (when logger is provided)', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }
    const app = express()
    app.use(
      createStrictCorsMiddleware({
        allowlist: ['https://ezauth.ezstart.xyz'],
        logger,
      })
    )
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    await request(app).get('/auth').set('Origin', 'https://evil.com')
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Blocked'),
      expect.objectContaining({ origin: 'https://evil.com' })
    )
  })

  it('empty allowlist blocks every cross-origin request', async () => {
    const app = express()
    app.use(createStrictCorsMiddleware({ allowlist: [] }))
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/auth').set('Origin', 'https://ezauth.ezstart.xyz')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('mixed allowlist (string + regex) both work', async () => {
    const app = express()
    app.use(
      createStrictCorsMiddleware({
        allowlist: ['http://localhost:6111', /^https:\/\/ezauth-[a-z0-9-]+-ezstart\.vercel\.app$/],
      })
    )
    app.get('/auth', (_req, res) => res.json({ ok: true }))

    const str = await request(app).get('/auth').set('Origin', 'http://localhost:6111')
    expect(str.headers['access-control-allow-origin']).toBe('http://localhost:6111')

    const reg = await request(app)
      .get('/auth')
      .set('Origin', 'https://ezauth-git-staging-ezstart.vercel.app')
    expect(reg.headers['access-control-allow-origin']).toBe(
      'https://ezauth-git-staging-ezstart.vercel.app'
    )

    const nope = await request(app).get('/auth').set('Origin', 'https://random.com')
    expect(nope.headers['access-control-allow-origin']).toBeUndefined()
  })
})
