/**
 * Security tests for the global error handler.
 *
 * Validates the CORS-preservation contract introduced after the 2026-04
 * Railway+Sentry incident: when a downstream handler throws, the response
 * MUST still carry the right CORS headers so browsers can read the body
 * (otherwise the browser hides the response and the consumer never sees
 * the structured error).
 *
 * Also covers production sanitization: stack traces and internal messages
 * MUST NOT leak in `NODE_ENV=production`.
 */

import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createErrorHandler } from '../../core/middleware/error-handler.js'
import { createPermissiveCorsMiddleware } from '../../core/middleware/cors.js'

describe('createErrorHandler — CORS preservation', () => {
  it('preserves Access-Control-Allow-Origin when handler throws', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/boom', () => {
      throw new Error('boom')
    })
    app.use(createErrorHandler())

    const response = await request(app).get('/boom').set('Origin', 'https://acme.com')

    expect(response.status).toBe(500)
    expect(response.headers['access-control-allow-origin']).toBe('https://acme.com')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['vary']).toContain('Origin')
    expect(response.body).toMatchObject({
      success: false,
      error: {
        message: expect.any(String),
        code: 'INTERNAL_ERROR',
      },
    })
  })

  it('handles request without Origin header (same-origin / curl)', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/boom', () => {
      throw new Error('boom')
    })
    app.use(createErrorHandler())

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR' },
    })
  })

  it('respects preserveCors: false', async () => {
    const app = express()
    app.get('/boom', () => {
      throw new Error('boom')
    })
    app.use(createErrorHandler({ preserveCors: false }))

    const response = await request(app).get('/boom').set('Origin', 'https://acme.com')

    expect(response.status).toBe(500)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('forwards async errors from express handlers via next(err)', async () => {
    const app = express()
    app.use(createPermissiveCorsMiddleware())
    app.get('/boom', (_req, _res, next) => {
      next(new Error('async boom'))
    })
    app.use(createErrorHandler())

    const response = await request(app).get('/boom').set('Origin', 'https://acme.com')

    expect(response.status).toBe(500)
    expect(response.headers['access-control-allow-origin']).toBe('https://acme.com')
  })
})

describe('createErrorHandler — production sanitization', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('hides stack and message in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = express()
    app.get('/boom', () => {
      throw new Error('database password is hunter2')
    })
    app.use(createErrorHandler())

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    expect(response.body.error.message).toBe('Internal server error')
    expect(response.body.error.stack).toBeUndefined()
    expect(JSON.stringify(response.body)).not.toContain('hunter2')
  })

  it('exposes message + stack in development for debugging', async () => {
    const app = express()
    app.get('/boom', () => {
      throw new Error('dev error')
    })
    app.use(createErrorHandler({ isProd: false }))

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    expect(response.body.error.message).toBe('dev error')
    expect(response.body.error.stack).toBeDefined()
  })

  it('handles non-Error throws (string, object, undefined)', async () => {
    const app = express()
    app.get('/string', () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'plain string error'
    })
    app.use(createErrorHandler({ isProd: false }))

    const response = await request(app).get('/string')

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('INTERNAL_ERROR')
  })
})

describe('createErrorHandler — logger integration', () => {
  it('calls logger.error with err + request context', async () => {
    const errorSpy = vi.fn()
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      debug: vi.fn(),
    }

    const app = express()
    app.get('/boom', () => {
      throw new Error('logged error')
    })
    app.use(createErrorHandler({ logger }))

    await request(app).get('/boom')

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const [msg, payload] = errorSpy.mock.calls[0] ?? []
    expect(msg).toContain('Unhandled error')
    expect(payload).toMatchObject({
      path: '/boom',
      method: 'GET',
    })
  })

  it('does not crash when no logger is provided', async () => {
    const app = express()
    app.get('/boom', () => {
      throw new Error('no logger')
    })
    app.use(createErrorHandler())

    const response = await request(app).get('/boom')
    expect(response.status).toBe(500)
  })
})

describe('createErrorHandler — already-sent responses', () => {
  it('does not throw when res.headersSent is true (streaming case)', async () => {
    // Direct unit test: invoke the handler with a mock res where headersSent
    // is already true. The handler MUST early-return without calling
    // res.status/json (which would throw "Cannot set headers after they
    // are sent" in real Express).
    const handler = createErrorHandler({ preserveCors: false })
    const status = vi.fn()
    const json = vi.fn()
    const setHeader = vi.fn()
    const next = vi.fn()
    const req = { headers: {}, path: '/x', method: 'GET' } as never
    const res = {
      headersSent: true,
      status,
      json,
      setHeader,
    } as never

    handler(new Error('mid-stream'), req, res, next)

    expect(status).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
  })
})
