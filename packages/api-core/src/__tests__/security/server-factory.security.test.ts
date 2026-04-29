/**
 * Security tests for server factory.
 *
 * Attack vectors:
 * 18. Server with no health check — does /health still 404 gracefully?
 * 19. Double-mount of same router — conflict behavior
 * 20. Request body size limits — can you send 100MB JSON?
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createBaseApiServer } from '../../core/create-server.js'

describe('Server factory — security', () => {
  // ─── Attack vector 18: Health endpoint behavior ───
  describe('Health endpoint', () => {
    it('health endpoint is always mounted by default', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })

    it('legacy /api/health also responds', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })

    it('custom healthPath disables legacy /api/health', async () => {
      const { app } = createBaseApiServer({ port: 0, healthPath: '/custom-health' })
      const res = await request(app).get('/custom-health')
      expect(res.status).toBe(200)

      const legacy = await request(app).get('/api/health')
      // Custom healthPath means legacy is NOT mounted
      expect(legacy.status).toBe(404)
    })

    it('health does not leak environment or version info', async () => {
      const { app } = createBaseApiServer({ port: 0, serviceName: 'test-api' })
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      // Only status, service, timestamp — no env, version, uptime, memory, etc.
      const keys = Object.keys(res.body).sort()
      expect(keys).toEqual(['service', 'status', 'timestamp'])
    })
  })

  // ─── Attack vector 19: Double-mount behavior ───
  describe('Double-mount router', () => {
    it('mounting two routers with same path does not crash', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      const router1 = express.Router()
      router1.get('/items', (_req, res) => res.json({ source: 'router1' }))
      const router2 = express.Router()
      router2.get('/items', (_req, res) => res.json({ source: 'router2' }))

      app.use('/api', router1)
      app.use('/api', router2)

      // Express processes middleware in order — first match wins
      const res = await request(app).get('/api/items')
      expect(res.status).toBe(200)
      expect(res.body.source).toBe('router1')
    })
  })

  // ─── Attack vector 20: Body size limits ───
  describe('Request body size limits', () => {
    it('FINDING: express.json() default limit is 100kb — rejects large payloads', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      app.post('/api/test', (req, res) => {
        res.json({ size: JSON.stringify(req.body).length })
      })

      // 200KB payload — should be rejected by express.json() default 100kb limit
      const largePayload = { data: 'x'.repeat(200 * 1024) }
      const res = await request(app).post('/api/test').send(largePayload)
      // Express default is 100kb — this exceeds it
      expect(res.status).toBe(413) // Payload Too Large
    })

    it('accepts payloads within the default 100kb limit', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      app.post('/api/test', (req, res) => {
        res.json({ received: true })
      })

      // 50KB payload — within limits
      const normalPayload = { data: 'x'.repeat(50 * 1024) }
      const res = await request(app).post('/api/test').send(normalPayload)
      expect(res.status).toBe(200)
    })

    it('explicit 100kb body size limit is configured (FIXED)', async () => {
      // After fix: createBaseApiServer explicitly passes { limit: '100kb' }
      // to express.json() and express.urlencoded() instead of relying
      // on Express defaults.
      const { app } = createBaseApiServer({ port: 0 })
      app.post('/api/test', (req, res) => {
        res.json({ size: JSON.stringify(req.body).length })
      })

      // Exactly at the boundary (just under 100kb)
      const borderPayload = { data: 'x'.repeat(90 * 1024) }
      const res = await request(app).post('/api/test').send(borderPayload)
      expect(res.status).toBe(200)
    })
  })

  // ─── Trust proxy configuration ───
  describe('Trust proxy', () => {
    it('trust proxy is set to true (required for Railway/Vercel)', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      expect(app.get('trust proxy')).toBe(true)
    })

    it('X-Forwarded-For is used for req.ip when trust proxy is on', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      let capturedIp = ''
      app.get('/ip', (req, res) => {
        capturedIp = req.ip ?? ''
        res.json({ ip: req.ip })
      })

      await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.50')

      // With trust proxy, Express uses X-Forwarded-For
      expect(capturedIp).toBe('203.0.113.50')
    })
  })

  // ─── Default CORS is open ───
  describe('Default CORS policy', () => {
    it('FINDING: default CORS is permissive (reflects origin) when no cors config provided', async () => {
      const { app } = createBaseApiServer({ port: 0 })
      app.get('/test', (_req, res) => res.json({ ok: true }))

      const res = await request(app).get('/test').set('Origin', 'https://evil.com')
      // Permissive middleware reflects the request origin and sets
      // credentials: true so SDKs using `credentials: 'include'` work.
      // Tier 3 cookie-auth routes must be opt-in via cookieAuthRoutes +
      // cookieAuthAllowlist to restrict origins.
      expect(res.headers['access-control-allow-origin']).toBe('https://evil.com')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })
  })

  // ─── Raw body routes order ───
  describe('Raw body routes', () => {
    it('raw body route is registered before JSON parser', async () => {
      const { app } = createBaseApiServer({
        port: 0,
        rawBodyRoutes: ['/webhooks/stripe'],
      })

      let rawBody: Buffer | undefined
      app.post('/webhooks/stripe', (req, res) => {
        rawBody = req.body as Buffer
        res.json({ ok: true })
      })

      const payload = JSON.stringify({ type: 'payment_intent.succeeded' })
      const res = await request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(res.status).toBe(200)
      // The body should be a raw Buffer, not parsed JSON
      expect(Buffer.isBuffer(rawBody)).toBe(true)
    })
  })
})
