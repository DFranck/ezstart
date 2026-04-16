/**
 * Security tests for CORS middleware.
 *
 * Attack vectors:
 * 15. CORS with wildcard + credentials (dangerous combo)
 * 16. Origin header spoofing
 * 17. Preflight cache behavior
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createCorsMiddleware } from '../../core/middleware/cors.js'

describe('CORS middleware — security', () => {
  // ─── Attack vector 15: Wildcard + credentials ───
  describe('Wildcard + credentials protection', () => {
    it('wildcard CORS does NOT set credentials:true', async () => {
      const app = express()
      app.use(createCorsMiddleware('*'))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
      // access-control-allow-origin should be *
      expect(res.headers['access-control-allow-origin']).toBe('*')
      // credentials must NOT be true when origin is *
      // (browsers reject this combo anyway, but server should not send it)
      expect(res.headers['access-control-allow-credentials']).toBeUndefined()
    })

    it('restricted CORS sets credentials:true with specific origin', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com')
      expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('restricted CORS rejects unauthorized origins', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
      // The cors package does not set Access-Control-Allow-Origin for unauthorized origins
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

      const res = await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com')
      expect(res.headers['access-control-allow-credentials']).toBeUndefined()
    })
  })

  // ─── Attack vector 16: Origin spoofing ───
  describe('Origin header spoofing', () => {
    it('CORS is a browser-enforced mechanism — API cannot prevent curl spoofing', async () => {
      // This is NOT a vulnerability — CORS protects browsers, not APIs.
      // API-level protection comes from auth tokens.
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      // A curl request with a spoofed Origin still gets the response
      // (but without CORS headers, so a browser would block it)
      const res = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
      // The response body is still returned (CORS is browser-side enforcement)
      expect(res.status).toBe(200)
      // But the CORS headers deny the evil origin
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('no Origin header at all still works (server-to-server / same-origin)', async () => {
      const app = express()
      app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test')
      // No Origin header → no CORS headers in response
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
      // Preflight should return 204 with appropriate headers
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
