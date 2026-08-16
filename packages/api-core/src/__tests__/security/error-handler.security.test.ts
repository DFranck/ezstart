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
import { createErrorHandler, sanitizeErrorForLog } from '../../core/middleware/error-handler.js'
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

describe('createErrorHandler — persistError callback', () => {
  it('invokes persistError with err + req before sending the response', async () => {
    const persistError = vi.fn()
    const app = express()
    app.get('/boom', () => {
      throw new Error('persisted boom')
    })
    app.use(createErrorHandler({ persistError }))

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    expect(persistError).toHaveBeenCalledTimes(1)
    const [err, req] = persistError.mock.calls[0] ?? []
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe('persisted boom')
    expect(req).toMatchObject({ method: 'GET' })
  })

  it('does not block the response when persistError returns a slow promise', async () => {
    let resolveSlow: (() => void) | null = null
    const slowPromise = new Promise<void>(resolve => {
      resolveSlow = resolve
    })
    const persistError = vi.fn(() => slowPromise)

    const app = express()
    app.get('/boom', () => {
      throw new Error('async persist')
    })
    app.use(createErrorHandler({ persistError }))

    const response = await request(app).get('/boom')

    // The response was sent BEFORE the slow promise resolved — fire-and-forget.
    expect(response.status).toBe(500)
    expect(persistError).toHaveBeenCalledTimes(1)
    // Resolve the slow promise to avoid Vitest hanging on unresolved promises.
    resolveSlow?.()
  })

  it('survives a synchronous throw inside persistError (contract violation)', async () => {
    const warnSpy = vi.fn()
    const logger = { info: vi.fn(), warn: warnSpy, error: vi.fn(), debug: vi.fn() }
    const persistError = vi.fn(() => {
      throw new Error('persist contract violation')
    })

    const app = express()
    app.get('/boom', () => {
      throw new Error('downstream')
    })
    app.use(createErrorHandler({ persistError, logger }))

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('persistError callback threw'),
      expect.objectContaining({ err: expect.any(Error) })
    )
  })

  it('survives a rejected promise from persistError (contract violation)', async () => {
    const warnSpy = vi.fn()
    const logger = { info: vi.fn(), warn: warnSpy, error: vi.fn(), debug: vi.fn() }
    const persistError = vi.fn(() => Promise.reject(new Error('async contract violation')))

    const app = express()
    app.get('/boom', () => {
      throw new Error('downstream')
    })
    app.use(createErrorHandler({ persistError, logger }))

    const response = await request(app).get('/boom')

    expect(response.status).toBe(500)
    // Wait one microtask tick for the rejection handler to run.
    await new Promise(r => setTimeout(r, 10))
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('persistError callback rejected'),
      expect.objectContaining({ err: expect.any(Error) })
    )
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

/**
 * L5 (2026-05-15) — sanitizeErrorForLog must strip PII from Mongoose
 * ValidationError and MongoDB duplicate-key errors before the error reaches
 * Pino / Sentry. The leak vector: `err.errors[field].value` carries the
 * raw user-supplied value that failed validation (often an email or password
 * for a signup flow).
 */
describe('sanitizeErrorForLog', () => {
  it('keeps name + message + stack for a plain Error', () => {
    const err = new Error('something broke')
    const safe = sanitizeErrorForLog(err)
    expect(safe.name).toBe('Error')
    expect(safe.message).toBe('something broke')
    expect(typeof safe.stack).toBe('string')
    expect((safe.stack as string).length).toBeGreaterThan(0)
    expect(Object.keys(safe).sort()).toEqual(['message', 'name', 'stack'])
  })

  it('handles non-Error throwable (string)', () => {
    expect(sanitizeErrorForLog('boom')).toEqual({ error: 'boom' })
  })

  it('handles non-Error throwable (number, undefined, object)', () => {
    expect(sanitizeErrorForLog(42)).toEqual({ error: '42' })
    expect(sanitizeErrorForLog(undefined)).toEqual({ error: 'undefined' })
    expect(sanitizeErrorForLog({ msg: 'plain object' })).toEqual({
      error: '[object Object]',
    })
  })

  it('strips Mongoose ValidationError.errors[*].value, keeps field name + kind', () => {
    const err = new Error('Validation failed')
    err.name = 'ValidationError'
    ;(
      err as unknown as {
        errors: Record<string, { kind: string; path: string; value: string }>
      }
    ).errors = {
      email: { kind: 'unique', path: 'email', value: 'leak-pii@example.com' },
      password: { kind: 'minlength', path: 'password', value: 'plaintextLeakHash' },
    }

    const safe = sanitizeErrorForLog(err)
    const serialized = JSON.stringify(safe)

    // PII values MUST NOT appear anywhere in the sanitized output.
    expect(serialized).not.toContain('leak-pii@example.com')
    expect(serialized).not.toContain('plaintextLeakHash')

    // Field-name metadata IS preserved so operators can still triage.
    expect(safe.name).toBe('ValidationError')
    expect(safe.message).toBe('Validation failed')
    expect(safe.validationFields).toEqual([
      { field: 'email', kind: 'unique' },
      { field: 'password', kind: 'minlength' },
    ])

    // Raw errors bag is dropped.
    expect(safe).not.toHaveProperty('errors')
  })

  it('handles ValidationError with errors[*].kind missing', () => {
    const err = new Error('partial validation')
    err.name = 'ValidationError'
    ;(err as unknown as { errors: Record<string, { value: string }> }).errors = {
      anyfield: { value: 'secret-value' },
    }

    const safe = sanitizeErrorForLog(err)
    expect(JSON.stringify(safe)).not.toContain('secret-value')
    expect(safe.validationFields).toEqual([{ field: 'anyfield', kind: 'unknown' }])
  })

  it('strips MongoServerError keyValue (E11000 duplicate key) values', () => {
    const err = new Error('E11000 duplicate key error')
    err.name = 'MongoServerError'
    ;(err as unknown as { code: number }).code = 11000
    ;(
      err as unknown as { keyValue: Record<string, unknown>; keyPattern: Record<string, unknown> }
    ).keyValue = {
      email: 'duplicate-leak@example.com',
    }
    ;(err as unknown as { keyPattern: Record<string, unknown> }).keyPattern = { email: 1 }

    const safe = sanitizeErrorForLog(err)
    const serialized = JSON.stringify(safe)

    expect(serialized).not.toContain('duplicate-leak@example.com')
    expect(safe.duplicateFields).toEqual(['email'])
    expect(safe).not.toHaveProperty('keyValue')
    expect(safe).not.toHaveProperty('keyPattern')
  })

  it('falls back to keyPattern when keyValue is absent (some Mongo driver versions)', () => {
    const err = new Error('E11000')
    err.name = 'MongoServerError'
    ;(err as unknown as { code: number }).code = 11000
    ;(err as unknown as { keyPattern: Record<string, unknown> }).keyPattern = {
      username: 1,
      tenantId: 1,
    }

    const safe = sanitizeErrorForLog(err)
    expect(safe.duplicateFields).toEqual(['username', 'tenantId'])
  })

  it('does not add duplicateFields on a non-11000 MongoServerError', () => {
    const err = new Error('other mongo error')
    err.name = 'MongoServerError'
    ;(err as unknown as { code: number }).code = 121 // DocumentValidationFailure
    ;(err as unknown as { keyValue: Record<string, unknown> }).keyValue = {
      secret: 'should-not-leak',
    }

    const safe = sanitizeErrorForLog(err)
    expect(safe).not.toHaveProperty('duplicateFields')
    // But the keyValue is still NOT copied to the output (we never spread err).
    expect(JSON.stringify(safe)).not.toContain('should-not-leak')
  })

  it('handles a custom Error subclass without crashing', () => {
    class MyAppError extends Error {
      constructor(
        message: string,
        public readonly code: string
      ) {
        super(message)
        this.name = 'MyAppError'
      }
    }
    const err = new MyAppError('app boom', 'APP_BOOM')
    const safe = sanitizeErrorForLog(err)
    expect(safe.name).toBe('MyAppError')
    expect(safe.message).toBe('app boom')
    // Custom .code on the error is NOT copied (sanitizer only keeps name + message + stack).
    expect(safe).not.toHaveProperty('code')
  })
})

/**
 * L5 integration: the error-handler middleware must use the sanitizer when
 * calling logger.error — even on a raw Mongoose-shaped ValidationError, the
 * PII value must never reach the logger payload.
 */
describe('createErrorHandler — sanitizes Mongoose ValidationError before log (L5)', () => {
  it('logger.error receives sanitized err (no PII value)', async () => {
    const errorSpy = vi.fn()
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      debug: vi.fn(),
    }

    const app = express()
    app.get('/boom', (_req, _res, next) => {
      const err = new Error('User validation failed')
      err.name = 'ValidationError'
      ;(err as unknown as { errors: Record<string, { kind: string; value: string }> }).errors = {
        email: { kind: 'unique', value: 'leak@example.com' },
        password: { kind: 'minlength', value: 'hunter2plaintext' },
      }
      next(err)
    })
    app.use(createErrorHandler({ logger, isProd: true }))

    await request(app).get('/boom')

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const [, payload] = errorSpy.mock.calls[0] ?? []
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('leak@example.com')
    expect(serialized).not.toContain('hunter2plaintext')

    // Sanity check: the sanitized err is still useful for triage.
    const pl = payload as { err: { name: string; validationFields: unknown } }
    expect(pl.err.name).toBe('ValidationError')
    expect(pl.err.validationFields).toEqual([
      { field: 'email', kind: 'unique' },
      { field: 'password', kind: 'minlength' },
    ])
  })

  it('logger.error receives sanitized err for MongoServerError E11000', async () => {
    const errorSpy = vi.fn()
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      debug: vi.fn(),
    }

    const app = express()
    app.get('/boom', (_req, _res, next) => {
      const err = new Error('E11000 duplicate key')
      err.name = 'MongoServerError'
      ;(err as unknown as { code: number }).code = 11000
      ;(err as unknown as { keyValue: Record<string, unknown> }).keyValue = {
        email: 'already-registered-pii@example.com',
      }
      next(err)
    })
    app.use(createErrorHandler({ logger, isProd: true }))

    await request(app).get('/boom')

    const [, payload] = errorSpy.mock.calls[0] ?? []
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('already-registered-pii@example.com')
    const pl = payload as { err: { duplicateFields: string[] } }
    expect(pl.err.duplicateFields).toEqual(['email'])
  })
})
