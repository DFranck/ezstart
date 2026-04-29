/**
 * Tests for the idempotency-key middleware + in-memory LRU store.
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  createIdempotencyMiddleware,
  createInMemoryIdempotencyStore,
  type IdempotencyStore,
} from '../core/middleware/idempotency.js'
import { sendError, sendSuccess } from '../core/responses.js'

function buildApp(middleware: express.RequestHandler, handler?: express.RequestHandler) {
  const app = express()
  app.use(express.json())
  app.post(
    '/api/charges',
    middleware,
    handler ??
      ((req, res) => {
        sendSuccess(res, { id: 'ch_' + Math.random().toString(36).slice(2, 8), body: req.body })
      })
  )
  return app
}

describe('createIdempotencyMiddleware — in-memory default store', () => {
  it('passes the request through when no Idempotency-Key header is set', async () => {
    const app = buildApp(createIdempotencyMiddleware())
    const res1 = await request(app).post('/api/charges').send({ amount: 100 })
    const res2 = await request(app).post('/api/charges').send({ amount: 100 })

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    // Different responses — no cache key, no replay
    expect(res1.body.data.id).not.toBe(res2.body.data.id)
  })

  it('replays the exact previous response when the same key is reused', async () => {
    const app = buildApp(createIdempotencyMiddleware())
    const headers = { 'Idempotency-Key': 'idem_abc' }

    const first = await request(app).post('/api/charges').set(headers).send({ amount: 100 })
    const second = await request(app).post('/api/charges').set(headers).send({ amount: 100 })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(second.headers['x-idempotent-replayed']).toBe('true')
    expect(first.headers['x-idempotent-replayed']).toBeUndefined()
  })

  it('replays the original status code (e.g. 4xx errors)', async () => {
    const app = buildApp(createIdempotencyMiddleware(), (_req, res) => {
      sendError(res, 'Card declined', 402, { code: 'CARD_DECLINED' })
    })

    const first = await request(app)
      .post('/api/charges')
      .set('Idempotency-Key', 'idem_decline')
      .send({})
    const second = await request(app)
      .post('/api/charges')
      .set('Idempotency-Key', 'idem_decline')
      .send({})

    expect(first.status).toBe(402)
    expect(second.status).toBe(402)
    expect(second.body).toEqual(first.body)
    expect(second.headers['x-idempotent-replayed']).toBe('true')
  })

  it('skips the middleware on GET / HEAD / OPTIONS by default', async () => {
    const app = express()
    let counter = 0
    app.use(createIdempotencyMiddleware())
    app.get('/api/items', (_req, res) => {
      counter += 1
      sendSuccess(res, { count: counter })
    })

    const a = await request(app).get('/api/items').set('Idempotency-Key', 'k')
    const b = await request(app).get('/api/items').set('Idempotency-Key', 'k')

    expect(a.body.data.count).toBe(1)
    expect(b.body.data.count).toBe(2)
  })

  it('returns 400 when key is required but missing', async () => {
    const app = buildApp(createIdempotencyMiddleware({ required: true }))

    const res = await request(app).post('/api/charges').send({ amount: 100 })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'IDEMPOTENCY_KEY_REQUIRED' },
    })
  })

  it('refuses to replay when the same key is reused with a different request body hash', async () => {
    const app = buildApp(
      createIdempotencyMiddleware({
        hashRequest: req => JSON.stringify(req.body ?? {}),
      })
    )

    const headers = { 'Idempotency-Key': 'idem_mismatch' }
    const first = await request(app).post('/api/charges').set(headers).send({ amount: 100 })
    const second = await request(app).post('/api/charges').set(headers).send({ amount: 200 })

    expect(first.status).toBe(200)
    expect(second.status).toBe(422)
    expect(second.body).toMatchObject({
      success: false,
      error: { code: 'IDEMPOTENCY_KEY_REUSE_MISMATCH' },
    })
  })

  it('replays cleanly when the body hash matches', async () => {
    const app = buildApp(
      createIdempotencyMiddleware({
        hashRequest: req => JSON.stringify(req.body ?? {}),
      })
    )

    const headers = { 'Idempotency-Key': 'idem_match' }
    const first = await request(app).post('/api/charges').set(headers).send({ amount: 100 })
    const second = await request(app).post('/api/charges').set(headers).send({ amount: 100 })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(second.headers['x-idempotent-replayed']).toBe('true')
  })

  it('honors a custom header name', async () => {
    const app = buildApp(createIdempotencyMiddleware({ headerName: 'X-Request-Id' }))

    const headers = { 'X-Request-Id': 'req_42' }
    const first = await request(app).post('/api/charges').set(headers).send({})
    const second = await request(app).post('/api/charges').set(headers).send({})

    expect(second.body).toEqual(first.body)
    expect(second.headers['x-idempotent-replayed']).toBe('true')
  })

  it('returns 500 when the store throws on read', async () => {
    const failingStore: IdempotencyStore = {
      get() {
        throw new Error('redis down')
      },
      set() {},
    }
    const app = buildApp(createIdempotencyMiddleware({ store: failingStore }))

    const res = await request(app).post('/api/charges').set('Idempotency-Key', 'idem_bad').send({})
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'IDEMPOTENCY_STORE_ERROR' },
    })
  })

  it('does not crash the request when the store throws on write', async () => {
    const failingWriteStore: IdempotencyStore = {
      get() {
        return null
      },
      set() {
        throw new Error('redis down')
      },
    }
    const app = buildApp(createIdempotencyMiddleware({ store: failingWriteStore }))

    const res = await request(app).post('/api/charges').set('Idempotency-Key', 'idem_w').send({})
    // Response was already sent before the store failure — caller observes 200.
    expect(res.status).toBe(200)
  })

  it('only intercepts the configured methods', async () => {
    const app = express()
    app.use(express.json())
    app.use(createIdempotencyMiddleware({ methods: ['POST'] }))

    let count = 0
    app.put('/api/items/:id', (_req, res) => {
      count += 1
      sendSuccess(res, { count })
    })
    app.post('/api/items', (_req, res) => {
      count += 1
      sendSuccess(res, { count })
    })

    // PUT is NOT in the methods list — never cached
    const put1 = await request(app).put('/api/items/1').set('Idempotency-Key', 'k').send({})
    const put2 = await request(app).put('/api/items/1').set('Idempotency-Key', 'k').send({})
    expect(put1.body.data.count).not.toBe(put2.body.data.count)

    // POST is intercepted — second hit replays
    const post1 = await request(app).post('/api/items').set('Idempotency-Key', 'k2').send({})
    const post2 = await request(app).post('/api/items').set('Idempotency-Key', 'k2').send({})
    expect(post2.body).toEqual(post1.body)
  })
})

describe('createInMemoryIdempotencyStore', () => {
  it('round-trips a record', async () => {
    const store = createInMemoryIdempotencyStore()
    expect(await store.get('a')).toBeNull()
    await store.set('a', { status: 200, body: { ok: true }, headers: {}, storedAt: Date.now() })
    expect(await store.get('a')).toMatchObject({ status: 200, body: { ok: true } })
  })

  it('expires entries after the configured TTL', async () => {
    const store = createInMemoryIdempotencyStore({ ttlMs: 25 })
    await store.set('a', { status: 200, body: 'x', headers: {}, storedAt: Date.now() })
    expect(await store.get('a')).not.toBeNull()
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(await store.get('a')).toBeNull()
  })

  it('evicts the least-recently-used entry once the cap is reached', async () => {
    const store = createInMemoryIdempotencyStore({ maxEntries: 3 })
    const baseRecord = { status: 200, body: '', headers: {}, storedAt: Date.now() }

    await store.set('a', { ...baseRecord, body: 'A' })
    await store.set('b', { ...baseRecord, body: 'B' })
    await store.set('c', { ...baseRecord, body: 'C' })
    // Touch 'a' to make it most-recently-used
    await store.get('a')
    // Insert 'd' — 'b' is now the LRU and gets evicted
    await store.set('d', { ...baseRecord, body: 'D' })

    expect(await store.get('a')).not.toBeNull()
    expect(await store.get('b')).toBeNull()
    expect(await store.get('c')).not.toBeNull()
    expect(await store.get('d')).not.toBeNull()
  })

  it('clear() empties the cache', async () => {
    const store = createInMemoryIdempotencyStore()
    await store.set('a', { status: 200, body: 'x', headers: {}, storedAt: Date.now() })
    await store.clear?.()
    expect(await store.get('a')).toBeNull()
  })
})
