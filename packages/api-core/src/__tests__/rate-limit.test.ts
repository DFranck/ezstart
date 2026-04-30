import express from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
} from '../core/middleware/rate-limit.js'

// The shared `createRateLimiter` is auto-disabled in `NODE_ENV=test` so other
// suites' supertest fixtures don't share-IP-throttle each other. This file is
// one of the places we deliberately exercise the limiter, so we opt back in
// for the duration of the suite via the documented escape hatch.
let originalForce: string | undefined
beforeAll(() => {
  originalForce = process.env.RATE_LIMIT_FORCE
  process.env.RATE_LIMIT_FORCE = '1'
})
afterAll(() => {
  if (originalForce === undefined) delete process.env.RATE_LIMIT_FORCE
  else process.env.RATE_LIMIT_FORCE = originalForce
})

describe('createRateLimiter', () => {
  it('allows requests below the limit and exposes standard rate-limit headers', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 3, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/x')
    expect(res.status).toBe(200)
    expect(res.headers['ratelimit-limit']).toBeDefined()
    expect(res.headers['ratelimit-remaining']).toBeDefined()
  })

  it('emits 429 with structured envelope once the limit is exceeded', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    await request(app).get('/x')
    await request(app).get('/x')
    const blocked = await request(app).get('/x')

    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
    expect(typeof blocked.body.error.message).toBe('string')
    expect(typeof blocked.body.error.retryAfter).toBe('number')
  })

  it('skips the limiter for paths in skipPaths', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: ['/api/health'] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

    await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(blocked.status).toBe(429)

    const health = await request(app).get('/api/health')
    expect(health.status).toBe(200)
    const health2 = await request(app).get('/api/health')
    expect(health2.status).toBe(200)
  })

  it('honors a custom message and preserves the error envelope shape', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [], message: 'Slow down' }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.message).toBe('Slow down')
  })
})

describe('preset rate limiters', () => {
  it('strict limiter blocks after 5 requests', async () => {
    const app = express()
    app.post('/login', createStrictRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 5; i++) {
      const ok = await request(app).post('/login')
      expect(ok.status).toBe(200)
    }
    const blocked = await request(app).post('/login')
    expect(blocked.status).toBe(429)
  })

  it('very-strict limiter blocks after 3 requests with a registration-flavored message', async () => {
    const app = express()
    app.post('/register', createVeryStrictRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 3; i++) await request(app).post('/register')
    const blocked = await request(app).post('/register')
    expect(blocked.status).toBe(429)
    expect(String(blocked.body.error.message).toLowerCase()).toContain('registration')
  })

  it('moderate limiter blocks after 10 requests with a payment-flavored message', async () => {
    const app = express()
    app.post('/donate', createModerateRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 10; i++) await request(app).post('/donate')
    const blocked = await request(app).post('/donate')
    expect(blocked.status).toBe(429)
    expect(String(blocked.body.error.message).toLowerCase()).toContain('payment')
  })
})
