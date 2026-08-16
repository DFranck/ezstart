import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validateBody, validateParams, validateQuery } from '../core/middleware/validate.js'

describe('validateBody', () => {
  it('passes valid payloads through and populates req.validatedBody', async () => {
    const app = express()
    app.use(express.json())
    const schema = z.object({ name: z.string() })
    app.post('/x', validateBody(schema), (req, res) => {
      res.json({ received: req.validatedBody })
    })

    const res = await request(app).post('/x').send({ name: 'ada' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: { name: 'ada' } })
  })

  it('responds with 422 + VALIDATION_ERROR on invalid body', async () => {
    const app = express()
    app.use(express.json())
    const schema = z.object({ email: z.string().email() })
    app.post('/x', validateBody(schema), (_req, res) => {
      res.json({ ok: true })
    })

    const res = await request(app).post('/x').send({ email: 'not-email' })
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(res.body.error.details)).toBe(true)
  })
})

describe('validateQuery', () => {
  it('responds with 400 on invalid query', async () => {
    const app = express()
    const schema = z.object({ page: z.coerce.number().min(1) })
    app.get('/x', validateQuery(schema), (req, res) => {
      res.json({ query: req.validatedQuery })
    })

    const bad = await request(app).get('/x?page=abc')
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('VALIDATION_ERROR')

    const ok = await request(app).get('/x?page=3')
    expect(ok.status).toBe(200)
    expect(ok.body).toEqual({ query: { page: 3 } })
  })
})

describe('validateParams', () => {
  it('responds with 400 on invalid params', async () => {
    const app = express()
    const schema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
    app.get('/items/:id', validateParams(schema), (req, res) => {
      res.json({ params: req.validatedParams })
    })

    const bad = await request(app).get('/items/not-a-mongo-id')
    expect(bad.status).toBe(400)

    const ok = await request(app).get('/items/507f1f77bcf86cd799439011')
    expect(ok.status).toBe(200)
  })
})
