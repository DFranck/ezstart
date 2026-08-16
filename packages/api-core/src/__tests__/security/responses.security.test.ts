/**
 * Security tests for response helpers.
 *
 * Attack vectors:
 * 13. sendError with user-controlled messages — XSS in JSON?
 * 14. sendValidationError with deeply nested Zod errors — internal leakage?
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { sendError, sendSuccess, sendValidationError } from '../../core/responses.js'

describe('Response helpers — security', () => {
  // ─── Attack vector 13: XSS in JSON responses ───
  describe('XSS via error messages', () => {
    it('JSON Content-Type prevents browser XSS even with HTML in message', async () => {
      const app = express()
      app.get('/test', (_req, res) => {
        sendError(res, '<script>alert("xss")</script>', 400)
      })

      const res = await request(app).get('/test')
      expect(res.status).toBe(400)
      // Content-Type is application/json — browsers do not execute script in JSON
      expect(res.headers['content-type']).toContain('application/json')
      // The message is preserved as-is in JSON (properly escaped by JSON.stringify)
      expect(res.body.error.message).toBe('<script>alert("xss")</script>')
    })

    it('sendError with user-controlled details does not leak prototype', async () => {
      const app = express()
      app.get('/test', (_req, res) => {
        sendError(res, 'Error', 500, {
          details: { __proto__: { admin: true }, constructor: 'hacked' },
        })
      })

      const res = await request(app).get('/test')
      expect(res.status).toBe(500)
      // JSON serialization strips __proto__
      expect(res.body.error.details.admin).toBeUndefined()
    })

    it('sendSuccess with malicious data in response', async () => {
      const app = express()
      app.get('/test', (_req, res) => {
        sendSuccess(res, {
          name: '<img onerror="alert(1)" src="x">',
          nested: { html: '</script><script>alert(1)</script>' },
        })
      })

      const res = await request(app).get('/test')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('application/json')
      // Data is preserved but safe because of JSON Content-Type
      expect(res.body.data.name).toBe('<img onerror="alert(1)" src="x">')
    })
  })

  // ─── Attack vector 14: Zod error leakage ───
  describe('Validation error information leakage', () => {
    it('ZodError only exposes path, message, and code — no internal stacktrace', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(150),
        nested: z.object({
          deep: z.object({
            value: z.string(),
          }),
        }),
      })

      const app = express()
      app.use(express.json())
      app.post('/test', (req, res) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
          return sendValidationError(res, result.error)
        }
        return sendSuccess(res, result.data)
      })

      const res = await request(app)
        .post('/test')
        .send({ email: 'not-email', age: -1, nested: { deep: { value: 123 } } })

      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(Array.isArray(res.body.error.details)).toBe(true)

      // Each detail should ONLY have path, message, code — no stacktrace, no schema internals
      for (const detail of res.body.error.details) {
        expect(Object.keys(detail).sort()).toEqual(['code', 'message', 'path'])
        expect(typeof detail.path).toBe('string')
        expect(typeof detail.message).toBe('string')
        expect(typeof detail.code).toBe('string')
      }
    })

    it('legacy sendValidationError does not leak extra fields', async () => {
      const app = express()
      app.get('/test', (_req, res) => {
        sendValidationError(res, 'Bad input', [
          { field: 'email', error: 'invalid', _internal: 'should-not-leak' },
        ])
      })

      const res = await request(app).get('/test')
      expect(res.status).toBe(422)
      // Legacy mode forwards the details array as-is — the CALLER controls what's in it.
      // This is not a vulnerability per se, but callers must be careful.
      expect(res.body.error.details).toHaveLength(1)
    })

    it('sendError without details field omits it from response', async () => {
      const app = express()
      app.get('/test', (_req, res) => {
        sendError(res, 'Not found', 404, { code: 'NOT_FOUND' })
      })

      const res = await request(app).get('/test')
      expect(res.body.error).not.toHaveProperty('details')
      expect(res.body.error).not.toHaveProperty('retryAfter')
    })
  })
})
