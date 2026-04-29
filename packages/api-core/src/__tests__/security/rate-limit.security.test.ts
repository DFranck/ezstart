/**
 * Security tests for rate limiting middleware.
 *
 * Attack vectors:
 * 10. X-Forwarded-For spoofing (trust proxy misconfiguration)
 * 11. Rate limit bypass via different paths to same handler
 * 12. Rate limit counter at exact boundary
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '../../core/middleware/rate-limit.js'
import { createBaseApiServer } from '../../core/create-server.js'

describe('Rate limiting — security', () => {
  // ─── Attack vector 10: X-Forwarded-For spoofing ───
  describe('X-Forwarded-For spoofing', () => {
    it('FINDING: trust proxy true + express-rate-limit validate.trustProxy=false allows XFF spoofing', async () => {
      // createBaseApiServer sets app.set('trust proxy', true)
      // The rate limiter has validate: { trustProxy: false } — this DISABLES
      // the express-rate-limit warning about trust proxy, but does NOT fix
      // the underlying issue. With trust proxy = true, Express trusts
      // X-Forwarded-For, so a client can rotate IPs to bypass rate limits.
      const { app } = createBaseApiServer({
        port: 0,
        rateLimit: { preset: 'standard', options: { max: 2, windowMs: 60_000, skipPaths: [] } },
      })
      app.get('/api/test', (_req, res) => res.json({ ok: true }))

      // Two requests from "IP1" — should exhaust the limit
      await request(app).get('/api/test').set('X-Forwarded-For', '1.2.3.4')
      await request(app).get('/api/test').set('X-Forwarded-For', '1.2.3.4')
      const blocked = await request(app).get('/api/test').set('X-Forwarded-For', '1.2.3.4')
      expect(blocked.status).toBe(429)

      // But a "different IP" (spoofed) is NOT rate limited
      const spoofed = await request(app).get('/api/test').set('X-Forwarded-For', '5.6.7.8')
      // FINDING: This succeeds — attacker can bypass rate limits by rotating XFF
      expect(spoofed.status).toBe(200)
    })

    it('rate limit applies per-IP correctly without XFF spoofing', async () => {
      const app = express()
      app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      await request(app).get('/test')
      await request(app).get('/test')
      const blocked = await request(app).get('/test')
      expect(blocked.status).toBe(429)
    })
  })

  // ─── Attack vector 11: Path-based bypass ───
  describe('Path-based rate limit bypass', () => {
    it('global limiter counts ALL paths toward the same limit', async () => {
      const app = express()
      app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
      app.get('/a', (_req, res) => res.json({ path: 'a' }))
      app.get('/b', (_req, res) => res.json({ path: 'b' }))

      await request(app).get('/a')
      await request(app).get('/b')
      // Third request to a different path — should be blocked
      const blocked = await request(app).get('/a')
      expect(blocked.status).toBe(429)
    })

    it('per-route limiter only counts requests to that specific route', async () => {
      const app = express()
      const limiter = createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [] })
      app.get('/limited', limiter, (_req, res) => res.json({ ok: true }))
      app.get('/free', (_req, res) => res.json({ ok: true }))

      await request(app).get('/limited')
      const blocked = await request(app).get('/limited')
      expect(blocked.status).toBe(429)

      // But /free is not limited
      const free = await request(app).get('/free')
      expect(free.status).toBe(200)
    })

    it('skipPaths correctly bypasses health endpoints even under load', async () => {
      const app = express()
      app.use(createRateLimiter({ max: 1, windowMs: 60_000 }))
      app.get('/health', (_req, res) => res.json({ status: 'ok' }))
      app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      await request(app).get('/test')
      const blocked = await request(app).get('/test')
      expect(blocked.status).toBe(429)

      // Health is still reachable
      const health1 = await request(app).get('/health')
      expect(health1.status).toBe(200)
      const health2 = await request(app).get('/api/health')
      expect(health2.status).toBe(200)
    })
  })

  // ─── Attack vector 12: Boundary behavior ───
  describe('Exact boundary behavior', () => {
    it('allows exactly max requests and blocks the (max+1)th', async () => {
      const max = 5
      const app = express()
      app.use(createRateLimiter({ max, windowMs: 60_000, skipPaths: [] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      for (let i = 0; i < max; i++) {
        const res = await request(app).get('/test')
        expect(res.status).toBe(200)
      }

      const blocked = await request(app).get('/test')
      expect(blocked.status).toBe(429)
      expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(blocked.body.error.retryAfter).toBeGreaterThan(0)
    })

    it('429 response includes standard rate limit headers', async () => {
      const app = express()
      app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [] }))
      app.get('/test', (_req, res) => res.json({ ok: true }))

      await request(app).get('/test')
      const blocked = await request(app).get('/test')
      expect(blocked.status).toBe(429)
      expect(blocked.headers['ratelimit-limit']).toBe('1')
      expect(blocked.headers['ratelimit-remaining']).toBe('0')
    })
  })
})
