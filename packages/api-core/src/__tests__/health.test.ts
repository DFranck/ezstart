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
