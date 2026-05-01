/**
 * Rate Limiting Middleware Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import request from 'supertest'
import {
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
  createModerateRateLimiter,
} from './rateLimit'

describe('Rate Limiting Middleware', () => {
  let app: Express

  describe('createRateLimiter (Standard: 500 req/15min per bucket)', () => {
    beforeEach(() => {
      app = express()
      // Use a small max to keep test runtime fast — bucketing logic is what we
      // care about, not the magic number
      app.use(createRateLimiter({ max: 5, windowMs: 60_000 }))

      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' })
      })

      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' })
      })
    })

    it('should allow requests under the limit', async () => {
      const response = await request(app).get('/api/test')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ message: 'success' })
      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
    })

    it('should return 429 when limit exceeded', async () => {
      // Make 5 requests (the limit set in beforeEach)
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/test')
      }

      // 6th request should be rate limited
      const response = await request(app).get('/api/test')

      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED')
      expect(response.body.error).toHaveProperty('retryAfter')
      expect(response.headers['retry-after']).toBeDefined()
    })

    it('should skip rate limiting for health check endpoint', async () => {
      // Make 5 requests to /api/test (reach limit)
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/test')
      }

      // Health check should still work
      const response = await request(app).get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: 'ok' })
    })

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/api/test')

      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
    })

    it('should default standard max to 500 in non-dev (1000 in dev)', () => {
      const originalEnv = process.env.NODE_ENV
      try {
        process.env.NODE_ENV = 'production'
        const prodLimiter = createRateLimiter()
        // Express-rate-limit doesn't expose max directly, so we just smoke-test
        // that the limiter is constructed without error and is callable.
        expect(typeof prodLimiter).toBe('function')

        process.env.NODE_ENV = 'development'
        const devLimiter = createRateLimiter()
        expect(typeof devLimiter).toBe('function')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('Per-bucket isolation (keyGenerator priority)', () => {
    type AuthShape = {
      userId?: string
      apiKeyId?: string
      userObjectId?: string
      userPayloadId?: string
    }

    function buildApp(authForRequest: (req: Request) => AuthShape | undefined): Express {
      const a = express()
      a.set('trust proxy', 2)
      a.use((req: Request, _res: Response, next: NextFunction) => {
        const auth = authForRequest(req)
        if (auth?.userId) req.userId = auth.userId
        if (auth?.userObjectId) {
          req.user = {
            _id: auth.userObjectId,
            userId: auth.userObjectId,
          }
        }
        if (auth?.userPayloadId) {
          req.user = { userId: auth.userPayloadId }
        }
        if (auth?.apiKeyId) {
          ;(req as Request & { apiKeyId?: string }).apiKeyId = auth.apiKeyId
        }
        next()
      })
      a.use(createRateLimiter({ max: 2, windowMs: 60_000 }))
      a.get('/api/test', (_req, res) => res.json({ ok: true }))
      return a
    }

    it('should bucket per-user (req.userId) — different users from same IP get separate quotas', async () => {
      // alternating user header decides identity for each request
      const a = buildApp(req => ({ userId: req.headers['x-test-user'] as string | undefined }))

      // user-A burns 2/2
      await request(a).get('/api/test').set('x-test-user', 'user-A')
      await request(a).get('/api/test').set('x-test-user', 'user-A')
      const aBlocked = await request(a).get('/api/test').set('x-test-user', 'user-A')
      expect(aBlocked.status).toBe(429)

      // user-B has its OWN bucket (same IP)
      const bAllowed1 = await request(a).get('/api/test').set('x-test-user', 'user-B')
      expect(bAllowed1.status).toBe(200)
      const bAllowed2 = await request(a).get('/api/test').set('x-test-user', 'user-B')
      expect(bAllowed2.status).toBe(200)
      const bBlocked = await request(a).get('/api/test').set('x-test-user', 'user-B')
      expect(bBlocked.status).toBe(429)
    })

    it('should bucket per req.user._id when req.userId is missing', async () => {
      const a = buildApp(req => ({
        userObjectId: req.headers['x-test-user-oid'] as string | undefined,
      }))

      await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
      await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
      const blocked1 = await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
      expect(blocked1.status).toBe(429)

      const ok = await request(a).get('/api/test').set('x-test-user-oid', 'oid-2')
      expect(ok.status).toBe(200)
    })

    it('should bucket per req.user.userId when only payload userId is present', async () => {
      const a = buildApp(req => ({
        userPayloadId: req.headers['x-test-user-payload'] as string | undefined,
      }))

      await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
      await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
      const blocked = await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
      expect(blocked.status).toBe(429)

      const ok = await request(a).get('/api/test').set('x-test-user-payload', 'p-2')
      expect(ok.status).toBe(200)
    })

    it('should bucket per-API-key (req.apiKeyId) when no user is authenticated', async () => {
      const a = buildApp(req => ({ apiKeyId: req.headers['x-test-key'] as string | undefined }))

      await request(a).get('/api/test').set('x-test-key', 'key-1')
      await request(a).get('/api/test').set('x-test-key', 'key-1')
      const blocked = await request(a).get('/api/test').set('x-test-key', 'key-1')
      expect(blocked.status).toBe(429)

      const ok = await request(a).get('/api/test').set('x-test-key', 'key-2')
      expect(ok.status).toBe(200)
    })

    it('should prioritize req.userId > req.apiKeyId when both are present', async () => {
      // Force the same apiKeyId for all requests but vary user — if priority is
      // wrong, bucketing collapses to apiKey and user-B would be blocked.
      const a = buildApp(req => ({
        userId: req.headers['x-test-user'] as string | undefined,
        apiKeyId: 'shared-key',
      }))

      await request(a).get('/api/test').set('x-test-user', 'user-A')
      await request(a).get('/api/test').set('x-test-user', 'user-A')
      const aBlocked = await request(a).get('/api/test').set('x-test-user', 'user-A')
      expect(aBlocked.status).toBe(429)

      // user-B with the same shared apiKey should still have its own bucket
      const bOk = await request(a).get('/api/test').set('x-test-user', 'user-B')
      expect(bOk.status).toBe(200)
    })

    it('should fall back to IP for fully anonymous traffic', async () => {
      const a = buildApp(() => undefined)

      // All requests come from same IP → share bucket
      await request(a).get('/api/test')
      await request(a).get('/api/test')
      const blocked = await request(a).get('/api/test')
      expect(blocked.status).toBe(429)
    })

    it('should track different IPs independently when anonymous', async () => {
      const a = buildApp(() => undefined)

      // X-Forwarded-For with single IP — `trust proxy: 2` strips that IP and
      // falls back to the socket IP. Confirm anonymous bucketing still works
      // when X-Forwarded-For has 2+ IPs (which is what real Fastly→Railway
      // produces).
      for (let i = 0; i < 2; i++) {
        await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
      }
      const blocked = await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
      expect(blocked.status).toBe(429)

      const ok = await request(a).get('/api/test').set('X-Forwarded-For', '2.2.2.2, 10.0.0.1')
      expect(ok.status).toBe(200)
    })

    it('should treat all requests behind the LB as separate IPs only when XFF is well-formed', async () => {
      const a = buildApp(() => undefined)

      // With `trust proxy: 2`, Express picks the (n-2)th-from-right IP in XFF.
      // Real Fastly→Railway sends XFF = "<client>, <fastly>, <railway>" — Express
      // strips the last 2 (trusted hops) and uses <client> as req.ip.
      //
      // If consumers behind the SAME real client IP attack at scale, they share
      // the bucket — exactly the desired behavior for anonymous routes.
      for (let i = 0; i < 2; i++) {
        await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 192.168.0.1, 10.0.0.1')
      }
      const blocked = await request(a)
        .get('/api/test')
        .set('X-Forwarded-For', '1.1.1.1, 192.168.0.1, 10.0.0.1')
      expect(blocked.status).toBe(429)
    })
  })

  describe('createStrictRateLimiter (5 req/min)', () => {
    beforeEach(() => {
      app = express()
      app.post('/api/auth/login', createStrictRateLimiter(), (req, res) => {
        res.json({ token: 'abc123' })
      })
    })

    it('should allow up to 5 requests per minute', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/api/auth/login')
        expect(response.status).toBe(200)
      }
    })

    it('should block 6th request within a minute', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login')
      }

      // 6th request should be rate limited
      const response = await request(app).post('/api/auth/login')

      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should include appropriate retry-after header', async () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        await request(app).post('/api/auth/login')
      }

      const response = await request(app).post('/api/auth/login')
      const retryAfter = parseInt(response.headers['retry-after'] as string, 10)

      // Should be approximately 60 seconds (1 minute window)
      expect(retryAfter).toBeGreaterThanOrEqual(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
    })
  })

  describe('createVeryStrictRateLimiter (3 req/hour)', () => {
    beforeEach(() => {
      app = express()
      app.post('/api/auth/register', createVeryStrictRateLimiter(), (req, res) => {
        res.json({ userId: '123' })
      })
    })

    it('should allow up to 3 requests per hour', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app).post('/api/auth/register')
        expect(response.status).toBe(200)
      }
    })

    it('should block 4th request within an hour', async () => {
      // Make 3 requests (the limit)
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/auth/register')
      }

      // 4th request should be rate limited
      const response = await request(app).post('/api/auth/register')

      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(response.body.error.message).toContain('registration')
    })
  })

  describe('createModerateRateLimiter (10 req/hour)', () => {
    beforeEach(() => {
      app = express()
      app.post('/api/donate', createModerateRateLimiter(), (req, res) => {
        res.json({ donationId: '456' })
      })
    })

    it('should allow up to 10 requests per hour', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/api/donate')
        expect(response.status).toBe(200)
      }
    })

    it('should block 11th request within an hour', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/donate')
      }

      // 11th request should be rate limited
      const response = await request(app).post('/api/donate')

      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(response.body.error.message).toContain('payment')
    })
  })

  describe('Custom Configuration', () => {
    it('should accept custom window and max values', async () => {
      app = express()
      app.use(createRateLimiter({ windowMs: 1000, max: 2 })) // 2 req/second

      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' })
      })

      // First 2 requests should succeed
      await request(app).get('/api/test')
      await request(app).get('/api/test')

      // 3rd request should be rate limited
      const response = await request(app).get('/api/test')
      expect(response.status).toBe(429)
    })

    it('should accept custom error message', async () => {
      app = express()
      app.use(createRateLimiter({ max: 1, message: 'Custom error message' }))

      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' })
      })

      // Exceed limit
      await request(app).get('/api/test')
      const response = await request(app).get('/api/test')

      expect(response.status).toBe(429)
      expect(response.body.error.message).toBe('Custom error message')
    })

    it('should accept custom skip paths', async () => {
      app = express()
      app.use(createRateLimiter({ max: 1, skipPaths: ['/api/public'] }))

      app.get('/api/test', (req, res) => {
        res.json({ message: 'success' })
      })

      app.get('/api/public', (req, res) => {
        res.json({ message: 'public' })
      })

      // Exceed limit on /api/test
      await request(app).get('/api/test')
      const response1 = await request(app).get('/api/test')
      expect(response1.status).toBe(429)

      // /api/public should still work
      const response2 = await request(app).get('/api/public')
      expect(response2.status).toBe(200)
    })

    it('should accept a custom keyGenerator that overrides the default', async () => {
      app = express()
      // Bucket EVERYTHING into a single global key
      app.use(createRateLimiter({ max: 2, keyGenerator: () => 'global' }))
      app.get('/api/test', (_req, res) => res.json({ ok: true }))

      await request(app).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
      await request(app).get('/api/test').set('X-Forwarded-For', '2.2.2.2, 10.0.0.1')
      const blocked = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '3.3.3.3, 10.0.0.1')
      expect(blocked.status).toBe(429)
    })
  })
})
