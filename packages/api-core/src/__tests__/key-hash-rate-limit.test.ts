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

  // ─── H3 hardening: bounded Map (LRU eviction) ───
  describe('H3 — bounded Map (LRU)', () => {
    it('evicts the least-recently-used entry when maxEntries is exceeded', async () => {
      // maxEntries=3, max=1 per key: 4 distinct keys → 1st is evicted by 4th.
      const limiter = createKeyHashRateLimiter({
        max: 1,
        maxEntries: 3,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)

      // Seed 3 keys — each hits its quota (1/1).
      await request(app).get('/x?key=k1')
      await request(app).get('/x?key=k2')
      await request(app).get('/x?key=k3')

      // Confirm k1 is still tracked (would 429 if requested again).
      const k1Blocked = await request(app).get('/x?key=k1')
      expect(k1Blocked.status).toBe(429)

      // The k1 access above re-touched it, moving it to the tail.
      // Now insert k4 + k5 → k2 then k3 should be evicted (oldest in touch order).
      // After k1 was touched, order is [k2, k3, k1]. Inserting k4 evicts k2.
      await request(app).get('/x?key=k4')
      await request(app).get('/x?key=k5') // evicts k3

      // k2 was evicted → treated as new, gets a fresh quota (200, not 429).
      const k2Allowed = await request(app).get('/x?key=k2')
      expect(k2Allowed.status).toBe(200)

      // k3 was also evicted → fresh quota.
      const k3Allowed = await request(app).get('/x?key=k3')
      expect(k3Allowed.status).toBe(200)
    })

    it('LRU touch on get keeps frequently-used keys alive', async () => {
      const limiter = createKeyHashRateLimiter({
        max: 1,
        maxEntries: 2,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)

      // Insert k1, k2 (both at quota).
      await request(app).get('/x?key=k1')
      await request(app).get('/x?key=k2')

      // Touch k1 again — Map order becomes [k2, k1].
      const k1Blocked = await request(app).get('/x?key=k1')
      expect(k1Blocked.status).toBe(429)

      // Insert k3 → evicts k2 (oldest), keeps k1 (recently touched).
      await request(app).get('/x?key=k3')

      // k1 should still be rate-limited (not evicted).
      const k1StillBlocked = await request(app).get('/x?key=k1')
      expect(k1StillBlocked.status).toBe(429)

      // k2 was evicted → fresh quota.
      const k2Allowed = await request(app).get('/x?key=k2')
      expect(k2Allowed.status).toBe(200)
    })

    it('does not evict anything when below maxEntries', async () => {
      const limiter = createKeyHashRateLimiter({
        max: 1,
        maxEntries: 100,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)

      // Burn quota on 5 distinct keys.
      for (const k of ['a', 'b', 'c', 'd', 'e']) {
        await request(app).get(`/x?key=${k}`)
      }

      // All 5 should still be rate-limited.
      for (const k of ['a', 'b', 'c', 'd', 'e']) {
        const blocked = await request(app).get(`/x?key=${k}`)
        expect(blocked.status).toBe(429)
      }
    })

    it('uses 10_000 as the default maxEntries cap', async () => {
      // Smoke test the default — insert one entry, confirm normal limiter
      // behavior. We can't realistically populate 10K entries in a unit
      // test, but the LRU eviction path is exercised by the dedicated
      // bounded-cap tests above.
      const limiter = createKeyHashRateLimiter({
        max: 1,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)
      await request(app).get('/x?key=onlyone')
      const blocked = await request(app).get('/x?key=onlyone')
      expect(blocked.status).toBe(429)
    })
  })

  // ─── H4 hardening: explicit opt-in disable (no NODE_ENV auto-bypass) ───
  describe('H4 — explicit disable opt-in', () => {
    it('rate-limits in NODE_ENV=test by default (no implicit bypass)', async () => {
      const prev = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
      try {
        const limiter = createKeyHashRateLimiter({
          max: 2,
          extractKey: req => String(req.query.key ?? ''),
        })
        const app = buildApp(limiter)

        await request(app).get('/x?key=alice')
        await request(app).get('/x?key=alice')
        const blocked = await request(app).get('/x?key=alice')
        // Without explicit `disabled: true`, the limiter MUST fire even when
        // NODE_ENV=test. This is the core of the H4 fix.
        expect(blocked.status).toBe(429)
      } finally {
        process.env.NODE_ENV = prev
      }
    })

    it('disabled: true bypasses the limiter entirely', async () => {
      const limiter = createKeyHashRateLimiter({
        max: 1,
        disabled: true,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)

      // 5 requests against a max=1 limiter must all succeed when disabled.
      for (let i = 0; i < 5; i += 1) {
        const res = await request(app).get('/x?key=alice')
        expect(res.status).toBe(200)
      }
    })

    it('disabled: false (default) enforces the limiter normally', async () => {
      const limiter = createKeyHashRateLimiter({
        max: 1,
        disabled: false,
        extractKey: req => String(req.query.key ?? ''),
      })
      const app = buildApp(limiter)

      await request(app).get('/x?key=alice')
      const blocked = await request(app).get('/x?key=alice')
      expect(blocked.status).toBe(429)
    })
  })
})
