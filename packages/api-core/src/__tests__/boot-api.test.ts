/**
 * Tests for `bootApi` — the unified API boot ceremony.
 *
 * The helper composes 4 collaborators (`createApiServer`, `connectToMongo`,
 * the derived-mode middlewares, `startServer`). We mock the heavyweight
 * dependencies (`@ezstart/config`, `@ezstart/logger`, `mongoose` and the
 * HTTP listener) so the tests stay hermetic and assert the orchestration
 * contract rather than re-testing each collaborator.
 */

import express, { Router, type Express } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ezstart/config/urls', () => ({
  getPort: (_appName: string, _layer: string) => 9876,
}))

vi.mock('@ezstart/config/cors', () => ({
  getAllowedOrigins: (_appName: string) => ['https://myapp.example.com'],
}))

const monorepoLoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@ezstart/logger/server', () => ({
  logger: monorepoLoggerMock,
}))

// Track the database name passed to connectToMongo. The mock returns the
// shared mongoose stub so the resolved value is observable but we never
// actually open a network socket.
const connectToMongoSpy = vi.fn(async (_dbName: string) => ({}) as unknown)
vi.mock('../connect-to-mongo.js', () => ({
  connectToMongo: (dbName: string) => connectToMongoSpy(dbName),
}))

// `startServer` does real work (binds a port, mounts routers, schedules
// graceful shutdown). For boot-api we only care about the call shape and the
// Express app it received, so the mock returns a stand-in `http.Server`.
const startServerSpy = vi.fn(async (app: Express, opts: Record<string, unknown>) => {
  return { _app: app, _opts: opts } as unknown
})
vi.mock('../core/server.js', async () => {
  // Re-export the real types — only the runtime function is replaced.
  const actual = await vi.importActual<typeof import('../core/server.js')>('../core/server.js')
  return {
    ...actual,
    startServer: (app: Express, opts: Record<string, unknown>) => startServerSpy(app, opts),
  }
})

describe('bootApi', () => {
  beforeEach(() => {
    Object.values(monorepoLoggerMock).forEach(fn => fn.mockReset())
    connectToMongoSpy.mockClear()
    startServerSpy.mockClear()
  })

  afterEach(() => {
    delete process.env.PORT
  })

  it('connects to MongoDB with the configured dbName', async () => {
    const { bootApi } = await import('../boot-api.js')

    await bootApi('ezbill', {
      mongoDbName: 'custom-db',
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
      },
    })

    expect(connectToMongoSpy).toHaveBeenCalledTimes(1)
    expect(connectToMongoSpy).toHaveBeenCalledWith('custom-db')
  })

  it('returns { app, server } from createApiServer + startServer', async () => {
    const { bootApi } = await import('../boot-api.js')

    const result = await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
      },
    })

    // Express apps are functions with a stable surface — sniff for `.use`.
    expect(typeof result.app).toBe('function')
    expect(typeof (result.app as Express).use).toBe('function')
    // The mocked startServer returns the marker object below.
    expect(result.server).toMatchObject({ _app: result.app })
    // apiServer surface is forwarded so post-listen callers can reuse the
    // resolved logger / config without re-creating an adapter.
    expect(result.apiServer.config.serviceName).toBe('ezbill')
    expect(typeof result.apiServer.logger.info).toBe('function')
  })

  it('mounts addVersionHeader on every response', async () => {
    const { bootApi } = await import('../boot-api.js')

    const routes = Router()
    routes.get('/ping', (_req, res) => {
      res.json({ ok: true })
    })

    const { app } = await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      serverConfig: {
        routes,
        basePath: '/api',
        serviceName: 'EZBill',
      },
    })

    // bootApi mounts addVersionHeader globally — but `startServer` (the part
    // that mounts `routes` at `basePath`) is mocked. Mount the same router
    // ourselves so we can assert the headers on a real round-trip.
    app.use('/api', routes)

    const res = await request(app).get('/api/ping')
    expect(res.status).toBe(200)
    expect(res.headers['api-version']).toBe('v1')
    expect(res.headers['x-api-version']).toBe('v1')
  })

  it('mounts attachDerivedMode + withRequestContextMiddleware when useDerivedMode=true', async () => {
    const { bootApi } = await import('../boot-api.js')
    const { getRequestContext } = await import('../core/context/request-context.js')

    const routes = Router()
    routes.get('/mode', (req, res) => {
      const ctx = getRequestContext()
      res.json({
        derivedMode: req.derivedMode ?? null,
        ctxMode: ctx?.derivedMode ?? null,
      })
    })

    const { app } = await bootApi('ezauth', {
      mongoDbName: 'ezauth',
      useDerivedMode: true,
      serverConfig: {
        routes,
        basePath: '/api',
        serviceName: 'EZAuth',
      },
    })

    // startServer mounted is mocked; mount the routes here so the request
    // hits both middlewares.
    app.use('/api', routes)

    const res = await request(app).get('/api/mode')
    expect(res.status).toBe(200)
    // No API key on the request → defaults to 'live'.
    expect(res.body.derivedMode).toBe('live')
    // The AsyncLocalStorage frame survives the await chain.
    expect(res.body.ctxMode).toBe('live')
  })

  it('does NOT mount derived-mode middlewares when useDerivedMode is omitted', async () => {
    const { bootApi } = await import('../boot-api.js')

    const routes = Router()
    routes.get('/mode', (req, res) => {
      res.json({ derivedMode: req.derivedMode ?? null })
    })

    const { app } = await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      serverConfig: {
        routes,
        basePath: '/api',
        serviceName: 'EZBill',
      },
    })

    app.use('/api', routes)

    const res = await request(app).get('/api/mode')
    expect(res.status).toBe(200)
    // `req.derivedMode` is never assigned when the middleware is absent.
    expect(res.body.derivedMode).toBeNull()
  })

  it('awaits onReady BEFORE startServer (sequencing contract)', async () => {
    const { bootApi } = await import('../boot-api.js')

    const callOrder: string[] = []
    connectToMongoSpy.mockImplementationOnce(async () => {
      callOrder.push('connectToMongo')
      return {} as unknown
    })
    startServerSpy.mockImplementationOnce(async (app, opts) => {
      callOrder.push('startServer')
      return { _app: app, _opts: opts } as unknown
    })

    await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      onReady: async () => {
        // Async work — sleep 1 tick to prove `await` is honoured.
        await new Promise(resolve => setImmediate(resolve))
        callOrder.push('onReady')
      },
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
      },
    })

    expect(callOrder).toEqual(['connectToMongo', 'onReady', 'startServer'])
  })

  it('passes the Express app + logger to onReady so callers can warm models', async () => {
    const { bootApi } = await import('../boot-api.js')

    const onReady = vi.fn(async (deps: { app: Express; logger: { info: () => void } }) => {
      expect(typeof deps.app).toBe('function')
      expect(typeof deps.app.use).toBe('function')
      expect(typeof deps.logger.info).toBe('function')
    })

    await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      onReady,
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
      },
    })

    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('forwards createApiServer options (rawBodyRoutes, cookieAuthRoutes, ...)', async () => {
    const { bootApi } = await import('../boot-api.js')

    // Use a real router that records hits to assert the raw-body parser does
    // not pre-consume `/webhooks/stripe`.
    const routes = Router()
    routes.post('/webhooks/stripe', express.raw({ type: '*/*' }), (req, res) => {
      res.json({ bodyType: Buffer.isBuffer(req.body) ? 'buffer' : 'object' })
    })

    const { app } = await bootApi('ezpay', {
      mongoDbName: 'ezpay',
      rawBodyRoutes: ['/api/webhooks/stripe'],
      cookieAuthRoutes: [],
      serverConfig: {
        routes,
        basePath: '/api',
        serviceName: 'EZPay',
      },
    })

    app.use('/api', routes)

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send('{"raw":true}')

    expect(res.status).toBe(200)
    // When rawBodyRoutes is honoured, downstream middleware sees a Buffer;
    // when it is missed, JSON parsing kicks in and the middleware sees an
    // object instead.
    expect(res.body.bodyType).toBe('buffer')
  })

  it('inherits port + logger from createApiServer when serverConfig omits them', async () => {
    const { bootApi } = await import('../boot-api.js')

    await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
      },
    })

    expect(startServerSpy).toHaveBeenCalledTimes(1)
    const opts = startServerSpy.mock.calls[0]?.[1] as Record<string, unknown>
    // Port resolved via the mocked getPort()
    expect(opts.port).toBe(9876)
    // Logger inherited from createApiServer (adapted monorepo logger)
    expect(opts.logger).toBeDefined()
    expect(typeof (opts.logger as { info: () => void }).info).toBe('function')
  })

  it('lets serverConfig.port override the resolved port', async () => {
    const { bootApi } = await import('../boot-api.js')

    await bootApi('ezbill', {
      mongoDbName: 'ezbill',
      serverConfig: {
        routes: Router(),
        serviceName: 'EZBill',
        port: 12345,
      },
    })

    const opts = startServerSpy.mock.calls[0]?.[1] as Record<string, unknown>
    expect(opts.port).toBe(12345)
  })

  it('propagates errors thrown in onReady (boot aborts)', async () => {
    const { bootApi } = await import('../boot-api.js')

    const boom = new Error('warmup blew up')
    await expect(
      bootApi('ezbill', {
        mongoDbName: 'ezbill',
        onReady: async () => {
          throw boom
        },
        serverConfig: {
          routes: Router(),
          serviceName: 'EZBill',
        },
      })
    ).rejects.toBe(boom)

    // startServer must NOT be called when onReady rejects.
    expect(startServerSpy).not.toHaveBeenCalled()
  })
})
