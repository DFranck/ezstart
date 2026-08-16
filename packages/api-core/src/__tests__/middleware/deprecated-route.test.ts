/**
 * Tests for the deprecatedRoute() middleware (RFC 8594 deprecation
 * signaling for HTTP endpoints).
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import {
  deprecatedRoute,
  type DeprecatedRouteLogEntry,
} from '../../core/middleware/deprecated-route.js'
import type { ServerLogger } from '../../core/types.js'
import { sendSuccess } from '../../core/responses.js'

function buildApp(middleware: express.RequestHandler) {
  const app = express()
  app.get('/api/v1/users', middleware, (_req, res) => sendSuccess(res, { users: [] }))
  return app
}

function makeFakeLogger(): ServerLogger & {
  calls: { level: 'info' | 'warn' | 'error' | 'debug'; msg: string; data?: unknown }[]
} {
  const calls: { level: 'info' | 'warn' | 'error' | 'debug'; msg: string; data?: unknown }[] = []
  return {
    info: (msg, data) => calls.push({ level: 'info', msg, data }),
    warn: (msg, data) => calls.push({ level: 'warn', msg, data }),
    error: (msg, data) => calls.push({ level: 'error', msg, data }),
    debug: (msg, data) => calls.push({ level: 'debug', msg, data }),
    calls,
  }
}

describe('deprecatedRoute', () => {
  it('always sets Deprecation: true header', async () => {
    const app = buildApp(deprecatedRoute())
    const res = await request(app).get('/api/v1/users')

    expect(res.status).toBe(200)
    expect(res.headers['deprecation']).toBe('true')
  })

  it('sets Sunset header when opts.sunset is provided', async () => {
    const app = buildApp(deprecatedRoute({ sunset: '2026-12-01' }))
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['sunset']).toBe('2026-12-01')
  })

  it('omits Sunset header when opts.sunset is missing', async () => {
    const app = buildApp(deprecatedRoute())
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['sunset']).toBeUndefined()
  })

  it('sets Warning header when opts.replacement is provided', async () => {
    const app = buildApp(deprecatedRoute({ replacement: 'GET /api/v2/users' }))
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['warning']).toBe('299 - "Endpoint deprecated, use GET /api/v2/users"')
  })

  it('omits Warning header when opts.replacement is missing', async () => {
    const app = buildApp(deprecatedRoute())
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['warning']).toBeUndefined()
  })

  it('sets Link header with rel="sunset" when opts.link is provided', async () => {
    const app = buildApp(deprecatedRoute({ link: 'https://docs.example.com/migration/v2' }))
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['link']).toBe('<https://docs.example.com/migration/v2>; rel="sunset"')
  })

  it('omits Link header when opts.link is missing', async () => {
    const app = buildApp(deprecatedRoute())
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['link']).toBeUndefined()
  })

  it('sets all four headers when all options are provided', async () => {
    const app = buildApp(
      deprecatedRoute({
        replacement: 'GET /api/v2/users',
        sunset: '2026-12-01',
        link: 'https://docs.example.com/migration/v2',
      })
    )
    const res = await request(app).get('/api/v1/users')

    expect(res.headers['deprecation']).toBe('true')
    expect(res.headers['sunset']).toBe('2026-12-01')
    expect(res.headers['warning']).toBe('299 - "Endpoint deprecated, use GET /api/v2/users"')
    expect(res.headers['link']).toBe('<https://docs.example.com/migration/v2>; rel="sunset"')
  })

  it('calls custom log callback with the structured entry when opts.log is provided', async () => {
    const log = vi.fn<(entry: DeprecatedRouteLogEntry) => void>()
    const app = buildApp(
      deprecatedRoute({
        replacement: 'GET /api/v2/users',
        sunset: '2026-12-01',
        log,
      })
    )

    const res = await request(app).get('/api/v1/users').set('User-Agent', 'test-agent/1.0')

    expect(res.status).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    const entry = log.mock.calls[0]?.[0]
    expect(entry).toMatchObject({
      deprecated: 'GET /api/v1/users',
      replacement: 'GET /api/v2/users',
      sunset: '2026-12-01',
      userAgent: 'test-agent/1.0',
    })
    expect(typeof entry?.ip).toBe('string')
  })

  it('calls injected logger.warn when opts.log is not provided', async () => {
    const logger = makeFakeLogger()
    const app = buildApp(
      deprecatedRoute({
        replacement: 'GET /api/v2/users',
        logger,
      })
    )

    await request(app).get('/api/v1/users')

    expect(logger.calls).toHaveLength(1)
    expect(logger.calls[0]?.level).toBe('warn')
    expect(logger.calls[0]?.msg).toBe('Deprecated endpoint called')
    expect(logger.calls[0]?.data).toMatchObject({
      deprecated: 'GET /api/v1/users',
      replacement: 'GET /api/v2/users',
    })
  })

  it('prefers custom log callback over injected logger when both are provided', async () => {
    const log = vi.fn<(entry: DeprecatedRouteLogEntry) => void>()
    const logger = makeFakeLogger()
    const app = buildApp(deprecatedRoute({ log, logger }))

    await request(app).get('/api/v1/users')

    expect(log).toHaveBeenCalledTimes(1)
    // Injected logger.warn should NOT have been called when custom log is set.
    expect(logger.calls.filter(c => c.level === 'warn')).toHaveLength(0)
  })

  it('uses the silent default logger when no logger nor log callback is provided', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = buildApp(deprecatedRoute())

    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(200)

    // The default logger is a no-op — must NOT touch the global console.
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('calls next() and lets the route handler respond normally', async () => {
    const app = buildApp(deprecatedRoute({ sunset: '2026-12-01' }))
    const res = await request(app).get('/api/v1/users')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { users: [] } })
  })

  it('works with no options at all (sets only Deprecation: true)', async () => {
    const app = buildApp(deprecatedRoute())
    const res = await request(app).get('/api/v1/users')

    expect(res.status).toBe(200)
    expect(res.headers['deprecation']).toBe('true')
    expect(res.headers['sunset']).toBeUndefined()
    expect(res.headers['warning']).toBeUndefined()
    expect(res.headers['link']).toBeUndefined()
  })

  it('logs the request method correctly for non-GET routes', async () => {
    const log = vi.fn<(entry: DeprecatedRouteLogEntry) => void>()
    const app = express()
    app.use(express.json())
    app.post('/api/v1/users', deprecatedRoute({ log }), (_req, res) => sendSuccess(res, { id: 1 }))

    await request(app).post('/api/v1/users').send({ name: 'Alice' })

    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]?.[0].deprecated).toBe('POST /api/v1/users')
  })

  it('omits userAgent in log entry when User-Agent header is absent', async () => {
    const log = vi.fn<(entry: DeprecatedRouteLogEntry) => void>()
    const app = buildApp(deprecatedRoute({ log }))

    // Supertest sends a default User-Agent, so use a raw express call via http.
    // Easier: stub req.get to simulate missing header by wiring directly.
    const handler = deprecatedRoute({ log })
    const fakeReq = {
      method: 'GET',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      get: () => undefined,
    } as unknown as express.Request
    const fakeRes = {
      setHeader: () => undefined,
    } as unknown as express.Response
    const next = vi.fn()
    handler(fakeReq, fakeRes, next)

    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]?.[0].userAgent).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })
})
