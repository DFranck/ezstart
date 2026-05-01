/**
 * Tests for `createKeyHashRateLimiter` — per-key in-memory sliding window.
 *
 * Covers the contract documented on the factory:
 *   - under-limit calls fall through to `next()`,
 *   - over-limit calls emit a 429 envelope with `code` + `retryAfter`,
 *   - expired windows reset the counter,
 *   - missing keys (`null`/`undefined`) bypass the limiter,
 *   - `errorCode` / `errorMessage` overrides are honored,
 *   - `.reset()` clears the in-memory state for test suites.
 */

import express from 'express'
import type { Express } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createKeyHashRateLimiter } from '../core/middleware/key-hash-rate-limit.js'

function buildApp(
  limiter: ReturnType<typeof createKeyHashRateLimiter>,
  handler: express.RequestHandler = (_req, res) => res.json({ ok: true })
): Express {
  const app = express()
  app.get('/x', limiter, handler)
  return app
}

describe('createKeyHashRateLimiter', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes requests through when below the limit', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 3,
      extractKey: req => String(req.query.key ?? ''),
    })
    const app = buildApp(limiter)

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app).get('/x?key=alice')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    }
  })

  it('returns 429 with structured envelope when the limit is exceeded', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 2,
      extractKey: req => String(req.query.key ?? ''),
    })
    const app = buildApp(limiter)

    await request(app).get('/x?key=alice')
    await request(app).get('/x?key=alice')
    const blocked = await request(app).get('/x?key=alice')

    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
    expect(typeof blocked.body.error.message).toBe('string')
    expect(typeof blocked.body.error.retryAfter).toBe('number')
    expect(blocked.body.error.retryAfter).toBeGreaterThan(0)
  })

  it('isolates counters per key — bob is not throttled by alice', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 1,
      extractKey: req => String(req.query.key ?? ''),
    })
    const app = buildApp(limiter)

    await request(app).get('/x?key=alice')
    const aliceBlocked = await request(app).get('/x?key=alice')
    const bobOk = await request(app).get('/x?key=bob')

    expect(aliceBlocked.status).toBe(429)
    expect(bobOk.status).toBe(200)
  })

  it('resets the counter once the window expires', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const limiter = createKeyHashRateLimiter({
      max: 1,
      windowMs: 60_000,
      extractKey: req => String(req.query.key ?? ''),
    })
    const app = buildApp(limiter)

    await request(app).get('/x?key=alice')
    const blocked = await request(app).get('/x?key=alice')
    expect(blocked.status).toBe(429)

    // Advance past the window so the next call resets the entry.
    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'))

    const rebound = await request(app).get('/x?key=alice')
    expect(rebound.status).toBe(200)
  })

  it('bypasses the limiter when extractKey returns null/empty', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 1,
      extractKey: req => {
        const k = req.query.key
        return typeof k === 'string' && k.length > 0 ? k : null
      },
    })
    const handler = vi.fn((_req: express.Request, res: express.Response) => res.json({ ok: true }))
    const app = buildApp(limiter, handler)

    // Three requests without `key=` — all must hit the downstream handler.
    await request(app).get('/x')
    await request(app).get('/x')
    await request(app).get('/x')

    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('honors custom errorCode and errorMessage', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 1,
      extractKey: req => String(req.query.key ?? ''),
      errorCode: 'CUSTOM_THROTTLED',
      errorMessage: 'Slow down please',
    })
    const app = buildApp(limiter)

    await request(app).get('/x?key=alice')
    const blocked = await request(app).get('/x?key=alice')

    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('CUSTOM_THROTTLED')
    expect(blocked.body.error.message).toBe('Slow down please')
  })

  it('exposes a .reset() method that clears the in-memory state', async () => {
    const limiter = createKeyHashRateLimiter({
      max: 1,
      extractKey: req => String(req.query.key ?? ''),
    })
    const app = buildApp(limiter)

    await request(app).get('/x?key=alice')
    const blocked = await request(app).get('/x?key=alice')
    expect(blocked.status).toBe(429)

    limiter.reset()

    const rebound = await request(app).get('/x?key=alice')
    expect(rebound.status).toBe(200)
  })
})
