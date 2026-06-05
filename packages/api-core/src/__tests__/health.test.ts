/**
 * Tests for `/health/deep` deep readiness probe.
 *
 * Covers the agnostic core handler (`createDeepHealthHandler`), the
 * auto-mount in `createBaseApiServer`, the DB connector auto-derivation, and
 * the timeout / error handling.
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createBaseApiServer } from '../core/create-server.js'
import {
  aggregateStatus,
  createDbHealthCheck,
  createDeepHealthHandler,
  runHealthCheck,
  type HealthCheck,
} from '../core/health.js'
import type { DbConnector } from '../core/db-connector.js'

function fakeDb(connected: boolean): DbConnector {
  return {
    async connect() {},
    async disconnect() {},
    get isConnected() {
      return connected
    },
    get models() {
      return {}
    },
  }
}

describe('createDeepHealthHandler', () => {
  it('returns 200 + status: ok when no checks are configured', async () => {
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp' }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'myapp',
      checks: {},
    })
    expect(typeof res.body.uptime).toBe('number')
    expect(typeof res.body.timestamp).toBe('string')
  })

  it('aggregates the worst status across checks (down beats degraded beats ok)', async () => {
    const checks: HealthCheck[] = [
      { name: 'a', check: () => ({ status: 'ok' }) },
      { name: 'b', check: () => ({ status: 'degraded', message: 'slow' }) },
      { name: 'c', check: () => ({ status: 'down', message: 'unreachable' }) },
    ]

    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(503)
    expect(res.body.status).toBe('down')
    expect(res.body.checks.a).toMatchObject({ status: 'ok' })
    expect(res.body.checks.b).toMatchObject({ status: 'degraded', message: 'slow' })
    expect(res.body.checks.c).toMatchObject({ status: 'down', message: 'unreachable' })
    expect(typeof res.body.checks.a.durationMs).toBe('number')
  })

  it('returns 200 + status: degraded when no check is down but at least one is degraded', async () => {
    const checks: HealthCheck[] = [
      { name: 'a', check: () => ({ status: 'ok' }) },
      { name: 'b', check: () => ({ status: 'degraded' }) },
    ]
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('degraded')
  })

  it('captures thrown errors as down with sanitized message in production', async () => {
    const checks: HealthCheck[] = [
      {
        name: 'failing',
        check: () => {
          throw new Error('connection refused')
        },
      },
    ]
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks, isProd: true }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(503)
    expect(res.body.checks.failing.status).toBe('down')
    expect(res.body.checks.failing.message).toBe("Check 'failing' failed")
    expect(res.body.checks.failing.message).not.toContain('connection refused')
  })

  it('exposes raw error message in development (isProd: false)', async () => {
    const checks: HealthCheck[] = [
      {
        name: 'failing',
        check: () => {
          throw new Error('connection refused')
        },
      },
    ]
    const app = express()
    app.get(
      '/health/deep',
      createDeepHealthHandler({ serviceName: 'myapp', checks, isProd: false })
    )

    const res = await request(app).get('/health/deep')
    expect(res.body.checks.failing.message).toContain('connection refused')
  })

  it('reports a check as down when it exceeds its timeout', async () => {
    const checks: HealthCheck[] = [
      {
        name: 'hanging',
        timeoutMs: 50,
        check: () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ status: 'ok' }), 500)
          }),
      },
    ]
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(503)
    expect(res.body.checks.hanging.status).toBe('down')
    expect(res.body.checks.hanging.message).toMatch(/timed out after 50ms/)
  })

  it('appends an automatic db check derived from the DbConnector', async () => {
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', db: fakeDb(true) }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(200)
    expect(res.body.checks.db).toMatchObject({ status: 'ok' })
  })

  it('reports db as down when the connector is not connected', async () => {
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', db: fakeDb(false) }))

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(503)
    expect(res.body.checks.db).toMatchObject({ status: 'down' })
  })

  it('includes the optional version field in the snapshot when provided', async () => {
    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', version: '1.2.3' }))

    const res = await request(app).get('/health/deep')
    expect(res.body.version).toBe('1.2.3')
  })
})

describe('createBaseApiServer auto-mount', () => {
  it('mounts /health/deep automatically with a degraded-or-better default', async () => {
    const { app } = createBaseApiServer({ port: 0, serviceName: 'myapp' })

    const shallow = await request(app).get('/health')
    expect(shallow.status).toBe(200)
    expect(shallow.body).toMatchObject({ status: 'ok', service: 'myapp' })

    const deep = await request(app).get('/health/deep')
    expect(deep.status).toBe(200)
    expect(deep.body.status).toBe('ok')
    expect(deep.body.service).toBe('myapp')
    expect(deep.body.checks).toEqual({})
  })

  it('mounts the auto db check when a DbConnector is provided', async () => {
    const { app } = createBaseApiServer({
      port: 0,
      serviceName: 'myapp',
      db: fakeDb(true),
    })

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(200)
    expect(res.body.checks.db).toMatchObject({ status: 'ok' })
  })

  it('reports 503 when the DB connector is down', async () => {
    const { app } = createBaseApiServer({
      port: 0,
      serviceName: 'myapp',
      db: fakeDb(false),
    })

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(503)
    expect(res.body.checks.db.status).toBe('down')
  })

  it('honors a custom deepHealthPath when provided', async () => {
    const { app } = createBaseApiServer({
      port: 0,
      serviceName: 'myapp',
      deepHealthPath: '/healthz/ready',
    })

    const res = await request(app).get('/healthz/ready')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')

    const missing = await request(app).get('/health/deep')
    expect(missing.status).toBe(404)
  })

  it('runs caller-supplied deepHealthChecks alongside the auto db check', async () => {
    const { app } = createBaseApiServer({
      port: 0,
      serviceName: 'myapp',
      db: fakeDb(true),
      deepHealthChecks: [
        { name: 'redis', check: () => ({ status: 'ok' }) },
        {
          name: 'stripe',
          check: () => ({ status: 'degraded', message: 'high latency' }),
        },
      ],
    })

    const res = await request(app).get('/health/deep')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('degraded')
    expect(res.body.checks.db.status).toBe('ok')
    expect(res.body.checks.redis.status).toBe('ok')
    expect(res.body.checks.stripe).toMatchObject({ status: 'degraded', message: 'high latency' })
  })
})

describe('aggregateStatus', () => {
  it('returns ok when every entry is ok', () => {
    expect(aggregateStatus({ a: { status: 'ok' }, b: { status: 'ok' } })).toBe('ok')
  })
  it('returns degraded when at least one entry is degraded and none is down', () => {
    expect(aggregateStatus({ a: { status: 'ok' }, b: { status: 'degraded' } })).toBe('degraded')
  })
  it('returns down as soon as any entry is down', () => {
    expect(
      aggregateStatus({ a: { status: 'ok' }, b: { status: 'degraded' }, c: { status: 'down' } })
    ).toBe('down')
  })
  it('returns ok when the result map is empty', () => {
    expect(aggregateStatus({})).toBe('ok')
  })
})

describe('runHealthCheck', () => {
  it('measures duration accurately', async () => {
    const result = await runHealthCheck(
      {
        name: 'slow',
        check: async () => {
          await new Promise(resolve => setTimeout(resolve, 30))
          return { status: 'ok' }
        },
      },
      false
    )
    expect(result.status).toBe('ok')
    expect(result.durationMs).toBeGreaterThanOrEqual(25)
  })

  it('synchronous check still resolves correctly', async () => {
    const result = await runHealthCheck(
      { name: 'sync', check: () => ({ status: 'ok', message: 'fine' }) },
      false
    )
    expect(result).toMatchObject({ status: 'ok', message: 'fine' })
  })

  // Hacker-A8 V2 — factories like createMongoosePingCheck /
  // createStripeBalanceCheck / createHttpCheck catch internally and
  // RETURN `{ status: 'down', message: err.message }`, bypassing the
  // throw-branch sanitization. `runHealthCheck` must sanitize those
  // factory-returned messages in prod too.
  it('sanitizes factory-returned down messages in production (V2)', async () => {
    const check: HealthCheck = {
      name: 'mongo',
      // Simulate a factory that swallows the SDK error and returns down
      // with the raw upstream message.
      check: () => ({
        status: 'down',
        message: 'MongoServerError: bad auth: SCRAM-SHA-256: secret-LEAK',
      }),
    }
    const result = await runHealthCheck(check, true)
    expect(result.status).toBe('down')
    expect(result.message).toBe("Check 'mongo' failed")
    expect(result.message).not.toContain('SCRAM')
    expect(result.message).not.toContain('LEAK')
  })

  it('preserves the raw factory-returned message in development (V2)', async () => {
    const check: HealthCheck = {
      name: 'mongo',
      check: () => ({
        status: 'down',
        message: 'connection refused at 127.0.0.1:27017',
      }),
    }
    const result = await runHealthCheck(check, false)
    expect(result.status).toBe('down')
    expect(result.message).toBe('connection refused at 127.0.0.1:27017')
  })

  it('does NOT sanitize ok / degraded messages even in production (V2)', async () => {
    const okCheck: HealthCheck = {
      name: 'fast',
      check: () => ({ status: 'ok', message: 'all good' }),
    }
    const degradedCheck: HealthCheck = {
      name: 'slow',
      check: () => ({ status: 'degraded', message: 'Slow response (3000ms)' }),
    }
    const okResult = await runHealthCheck(okCheck, true)
    const degradedResult = await runHealthCheck(degradedCheck, true)
    expect(okResult.message).toBe('all good')
    expect(degradedResult.message).toBe('Slow response (3000ms)')
  })

  it('preserves details payload through sanitization (V2)', async () => {
    const check: HealthCheck = {
      name: 'http',
      check: () => ({
        status: 'down',
        message: 'HTTP 500 Internal Server Error',
        details: { url: 'https://example.com/api', status: 500, durationMs: 42 },
      }),
    }
    const result = await runHealthCheck(check, true)
    expect(result.message).toBe("Check 'http' failed")
    expect(result.details).toEqual({
      url: 'https://example.com/api',
      status: 500,
      durationMs: 42,
    })
  })
})

describe('createDbHealthCheck', () => {
  it('produces an "ok" check when the connector is connected', async () => {
    const check = createDbHealthCheck(fakeDb(true))
    expect(check.name).toBe('db')
    const result = await check.check()
    expect(result).toMatchObject({ status: 'ok' })
  })
  it('produces a "down" check when the connector is disconnected', async () => {
    const check = createDbHealthCheck(fakeDb(false))
    const result = await check.check()
    expect(result).toMatchObject({ status: 'down' })
  })
})

// ─── Wave B Lot 4 (M5) — cache + rate-limit on /health/deep ───
describe('M5 — createDeepHealthHandler cache', () => {
  it('caches the snapshot for the configured TTL (no second invocation within window)', async () => {
    let invocations = 0
    const checks: HealthCheck[] = [
      {
        name: 'counter',
        check: () => {
          invocations += 1
          return { status: 'ok', details: { invocations } }
        },
      },
    ]

    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks, cacheMs: 200 }))

    const first = await request(app).get('/health/deep')
    expect(first.status).toBe(200)
    expect(first.body.checks.counter.details.invocations).toBe(1)

    const second = await request(app).get('/health/deep')
    expect(second.status).toBe(200)
    expect(second.body.checks.counter.details.invocations).toBe(1)

    const third = await request(app).get('/health/deep')
    expect(third.body.checks.counter.details.invocations).toBe(1)
    expect(invocations).toBe(1)
  })

  it('serves a fresh snapshot after the cache expires', async () => {
    let invocations = 0
    const checks: HealthCheck[] = [
      {
        name: 'counter',
        check: () => {
          invocations += 1
          return { status: 'ok', details: { invocations } }
        },
      },
    ]

    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks, cacheMs: 50 }))

    const first = await request(app).get('/health/deep')
    expect(first.body.checks.counter.details.invocations).toBe(1)

    await new Promise(resolve => setTimeout(resolve, 80))

    const second = await request(app).get('/health/deep')
    expect(second.body.checks.counter.details.invocations).toBe(2)
    expect(invocations).toBe(2)
  })

  it('coalesces concurrent first calls onto a single backing run (DoS protection)', async () => {
    let invocations = 0
    const checks: HealthCheck[] = [
      {
        name: 'slow',
        check: async () => {
          invocations += 1
          await new Promise(resolve => setTimeout(resolve, 50))
          return { status: 'ok', details: { invocations } }
        },
      },
    ]

    const app = express()
    app.get(
      '/health/deep',
      createDeepHealthHandler({ serviceName: 'myapp', checks, cacheMs: 1_000 })
    )

    // 10 parallel pings against a cold cache — without coalescing each would
    // trigger its own backing check (10 invocations, 10 DB pool slots).
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request(app).get('/health/deep'))
    )

    for (const res of results) {
      expect(res.status).toBe(200)
      expect(res.body.checks.slow.details.invocations).toBe(1)
    }
    expect(invocations).toBe(1)
  })

  it('does NOT cache when cacheMs is 0 (default opt-in)', async () => {
    let invocations = 0
    const checks: HealthCheck[] = [
      {
        name: 'counter',
        check: () => {
          invocations += 1
          return { status: 'ok' }
        },
      },
    ]

    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks }))

    await request(app).get('/health/deep')
    await request(app).get('/health/deep')
    await request(app).get('/health/deep')
    expect(invocations).toBe(3)
  })

  it('caches 503 (down) responses with the right status code on replay', async () => {
    let invocations = 0
    const checks: HealthCheck[] = [
      {
        name: 'failing',
        check: () => {
          invocations += 1
          return { status: 'down', message: 'unreachable' }
        },
      },
    ]

    const app = express()
    app.get('/health/deep', createDeepHealthHandler({ serviceName: 'myapp', checks, cacheMs: 500 }))

    const first = await request(app).get('/health/deep')
    expect(first.status).toBe(503)
    expect(first.body.status).toBe('down')

    const second = await request(app).get('/health/deep')
    expect(second.status).toBe(503)
    expect(second.body.status).toBe('down')
    expect(invocations).toBe(1)
  })
})

describe('M5 — createBaseApiServer rate-limits /health/deep', () => {
  it('returns 429 after the strict preset quota (5 req/min) on the same bucket', async () => {
    const { app } = createBaseApiServer({ port: 0, serviceName: 'myapp' })

    // Burst 6 requests from the same source — the strict preset (5/min)
    // should let the first 5 through and 429 the 6th.
    const responses = []
    for (let i = 0; i < 6; i++) {
      // eslint-disable-next-line no-await-in-loop
      responses.push(await request(app).get('/health/deep'))
    }

    const successful = responses.filter(r => r.status === 200 || r.status === 503)
    const throttled = responses.filter(r => r.status === 429)

    expect(successful.length).toBe(5)
    expect(throttled.length).toBe(1)
    expect(throttled[0]?.body).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    })
  })

  it('cache serves the same snapshot to all 5 allowed requests within 1s', async () => {
    let invocations = 0
    const { app } = createBaseApiServer({
      port: 0,
      serviceName: 'myapp',
      deepHealthChecks: [
        {
          name: 'counter',
          check: () => {
            invocations += 1
            return { status: 'ok', details: { invocations } }
          },
        },
      ],
    })

    // Five parallel requests within the cache window — exactly 1 backing run.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).get('/health/deep'))
    )
    for (const res of results) {
      expect(res.status).toBe(200)
      expect(res.body.checks.counter.details.invocations).toBe(1)
    }
    expect(invocations).toBe(1)
  })
})
