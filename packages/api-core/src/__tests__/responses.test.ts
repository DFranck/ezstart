import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { sendError, sendSuccess, sendValidationError } from '../core/responses.js'

function appWith(handler: express.RequestHandler): express.Express {
  const app = express()
  app.get('/x', handler)
  return app
}

describe('sendSuccess', () => {
  it('emits { success: true, data } without meta by default', async () => {
    const res = await request(appWith((_req, res) => sendSuccess(res, { id: 'u_1' }))).get('/x')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { id: 'u_1' } })
  })

  it('includes meta when provided', async () => {
    const res = await request(
      appWith((_req, res) => sendSuccess(res, [1, 2, 3], { total: 3, limit: 10, offset: 0 }))
    ).get('/x')
    expect(res.body).toEqual({
      success: true,
      data: [1, 2, 3],
      meta: { total: 3, limit: 10, offset: 0 },
    })
  })

  it('does not add a meta key when meta is undefined', async () => {
    const res = await request(appWith((_req, res) => sendSuccess(res, 'ok', undefined))).get('/x')
    expect(res.body).not.toHaveProperty('meta')
  })
})

describe('sendError', () => {
  it('emits { success: false, error: { message } } with default status 500', async () => {
    const res = await request(appWith((_req, res) => sendError(res, 'Boom'))).get('/x')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, error: { message: 'Boom' } })
  })

  it('honors custom status + options (code, details, retryAfter)', async () => {
    const res = await request(
      appWith((_req, res) =>
        sendError(res, 'Too many', 429, {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
          details: { ip: '1.2.3.4' },
        })
      )
    ).get('/x')
    expect(res.status).toBe(429)
    expect(res.body).toEqual({
      success: false,
      error: {
        message: 'Too many',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        details: { ip: '1.2.3.4' },
      },
    })
  })

  it('omits optional fields when not provided', async () => {
    const res = await request(
      appWith((_req, res) => sendError(res, 'nope', 404, { code: 'NOT_FOUND' }))
    ).get('/x')
    expect(res.body.error).toEqual({ message: 'nope', code: 'NOT_FOUND' })
    expect(res.body.error).not.toHaveProperty('details')
    expect(res.body.error).not.toHaveProperty('retryAfter')
  })
})

describe('sendValidationError', () => {
  it('converts Zod errors into structured details', async () => {
    const schema = z.object({ email: z.string().email(), age: z.number().min(18) })

    const app = express()
    app.get('/x', (_req, res) => {
      const parsed = schema.safeParse({ email: 'nope', age: 12 })
      if (!parsed.success) {
        sendValidationError(res, parsed.error)
        return
      }
      res.json({ ok: true })
    })

    const res = await request(app).get('/x')
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(res.body.error.details)).toBe(true)
    expect(res.body.error.details.length).toBe(2)
    expect(res.body.error.details[0].path).toBe('email')
    expect(res.body.error.details[1].path).toBe('age')
  })
})
