/**
 * Rate Limiting Middleware Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import {
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
  createModerateRateLimiter
} from './rateLimit'

describe('Rate Limiting Middleware', () => {
  let app: Express

  describe('createRateLimiter (Standard: 100 req/15min)', () => {
    beforeEach(() => {
      app = express()
      app.use(createRateLimiter())

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
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/test')
      }

      // 101st request should be rate limited
      const response = await request(app).get('/api/test')

      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED')
      expect(response.body.error).toHaveProperty('retryAfter')
      expect(response.headers['retry-after']).toBeDefined()
    })

    it('should skip rate limiting for health check endpoint', async () => {
      // Make 100 requests to /api/test (reach limit)
      for (let i = 0; i < 100; i++) {
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

    it('should track different IPs independently', async () => {
      // Enable trust proxy for X-Forwarded-For header
      app.set('trust proxy', 1)

      // Make 100 requests from IP 1
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/test').set('X-Forwarded-For', '1.1.1.1')
      }

      // IP 1 should be rate limited
      const response1 = await request(app).get('/api/test').set('X-Forwarded-For', '1.1.1.1')
      expect(response1.status).toBe(429)

      // IP 2 should still work
      const response2 = await request(app).get('/api/test').set('X-Forwarded-For', '2.2.2.2')
      expect(response2.status).toBe(200)
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
  })
})
