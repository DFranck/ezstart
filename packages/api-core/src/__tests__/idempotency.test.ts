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

/**
 * Regression tests for hacker findings B3-C / H6 + H7
 * (see `tmp/audit-api-core-hacker.md` §H6 §H7).
 *
 * H6 — Caching 5xx blocks retries of transient downstream failures.
 * H7 — Replay loses `Set-Cookie` / `Location` / custom headers.
 */
describe('H6 — never cache transient failures (5xx, 408, 425, 429)', () => {
  function buildFlakyApp(
    statuses: number[],
    handler?: (status: number, req: express.Request, res: express.Response) => void
  ) {
    const app = express()
    app.use(express.json())
    let callIndex = 0
    app.post('/api/charges', createIdempotencyMiddleware(), (req, res) => {
      const status = statuses[Math.min(callIndex, statuses.length - 1)]
      callIndex += 1
      if (handler) {
        handler(status, req, res)
      } else {
        // Distinct body per call so we can prove a non-cached retry actually re-ran.
        res.status(status).json({ status, callIndex, body: req.body })
      }
    })
    return { app, getCallCount: () => callIndex }
  }

  it('skips cache on 500 — second request with same key actually re-runs the handler', async () => {
    const { app, getCallCount } = buildFlakyApp([500, 200])

    const first = await request(app)
      .post('/api/charges')
      .set('Idempotency-Key', 'idem_5xx')
      .send({})
    const second = await request(app)
      .post('/api/charges')
      .set('Idempotency-Key', 'idem_5xx')
      .send({})

    expect(first.status).toBe(500)
    expect(second.status).toBe(200) // retry actually executed the handler — got the recovered 200
    expect(second.headers['x-idempotent-replayed']).toBeUndefined()
    expect(getCallCount()).toBe(2) // proves the handler was invoked twice (no replay)
  })

  it('skips cache on 503', async () => {
    const { app } = buildFlakyApp([503, 200])
    const first = await request(app).post('/api/charges').set('Idempotency-Key', 'k').send({})
    const second = await request(app).post('/api/charges').set('Idempotency-Key', 'k').send({})
    expect(first.status).toBe(503)
    expect(second.status).toBe(200)
    expect(second.headers['x-idempotent-replayed']).toBeUndefined()
  })

  it('skips cache on 408 / 425 / 429 (transient client conditions)', async () => {
    for (const transientCode of [408, 425, 429]) {
      const { app } = buildFlakyApp([transientCode, 200])
      const first = await request(app)
        .post('/api/charges')
        .set('Idempotency-Key', `k_${transientCode}`)
        .send({})
      const second = await request(app)
        .post('/api/charges')
        .set('Idempotency-Key', `k_${transientCode}`)
        .send({})
      expect(first.status).toBe(transientCode)
      expect(second.status).toBe(200)
      expect(second.headers['x-idempotent-replayed']).toBeUndefined()
    }
  })

  it('CACHES 4xx (deterministic client errors are safe to replay)', async () => {
    // 400 / 402 / 409 / 422 are deterministic for the same input — replaying them
    // is the correct behavior (idempotent: same input → same error).
    for (const deterministicCode of [400, 402, 409, 422]) {
      const { app, getCallCount } = buildFlakyApp([deterministicCode, deterministicCode])
      const first = await request(app)
        .post('/api/charges')
        .set('Idempotency-Key', `k4xx_${deterministicCode}`)
        .send({})
      const second = await request(app)
        .post('/api/charges')
        .set('Idempotency-Key', `k4xx_${deterministicCode}`)
        .send({})

      expect(first.status).toBe(deterministicCode)
      expect(second.status).toBe(deterministicCode)
      expect(second.body).toEqual(first.body) // proves replay (same callIndex baked in)
      expect(second.headers['x-idempotent-replayed']).toBe('true')
      expect(getCallCount()).toBe(1) // handler only ran once — second hit was replay
    }
  })

  it('caches 2xx normally (the success path is unchanged)', async () => {
    const { app, getCallCount } = buildFlakyApp([200, 200])
    const first = await request(app).post('/api/charges').set('Idempotency-Key', 'k2xx').send({})
    const second = await request(app).post('/api/charges').set('Idempotency-Key', 'k2xx').send({})

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(second.headers['x-idempotent-replayed']).toBe('true')
    expect(getCallCount()).toBe(1)
  })

  it('caches 3xx redirects (also deterministic)', async () => {
    const { app, getCallCount } = buildFlakyApp([302, 302], (status, _req, res) => {
      // Set Content-Type explicitly so supertest's auto-JSON parsing doesn't choke
      // on the plain-text body. The point of the test is the Location header + status.
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Location', '/success')
      res.status(status).send('Found')
    })
    const first = await request(app).post('/api/charges').set('Idempotency-Key', 'k3xx').send({})
    const second = await request(app).post('/api/charges').set('Idempotency-Key', 'k3xx').send({})

    expect(first.status).toBe(302)
    expect(second.status).toBe(302)
    expect(second.headers['location']).toBe('/success')
    expect(second.headers['x-idempotent-replayed']).toBe('true')
    expect(getCallCount()).toBe(1)
  })
})

describe('H7 — replay full response headers (Set-Cookie, Location, custom)', () => {
  it('replays Set-Cookie on cache hit (single cookie)', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/login', createIdempotencyMiddleware(), (_req, res) => {
      res.setHeader('Set-Cookie', 'session=eyJUSER=abc; Path=/; HttpOnly')
      sendSuccess(res, { user: { id: 'u_1' } })
    })

    const first = await request(app).post('/api/login').set('Idempotency-Key', 'k_cookie').send({})
    const second = await request(app).post('/api/login').set('Idempotency-Key', 'k_cookie').send({})

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    // supertest exposes Set-Cookie as a string array
    expect(second.headers['set-cookie']).toBeDefined()
    expect(second.headers['set-cookie']).toEqual(first.headers['set-cookie'])
    expect(second.headers['set-cookie']?.[0]).toContain('session=eyJUSER=abc')
    expect(second.headers['x-idempotent-replayed']).toBe('true')
  })

  it('replays multiple Set-Cookie values (auth + CSRF)', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/login', createIdempotencyMiddleware(), (_req, res) => {
      res.setHeader('Set-Cookie', [
        'session=eyJUSER=abc; HttpOnly; Secure',
        'csrf=token123; Path=/',
      ])
      sendSuccess(res, { ok: true })
    })

    const first = await request(app)
      .post('/api/login')
      .set('Idempotency-Key', 'k_multicookie')
      .send({})
    const second = await request(app)
      .post('/api/login')
      .set('Idempotency-Key', 'k_multicookie')
      .send({})

    const firstCookies = first.headers['set-cookie'] ?? []
    const secondCookies = second.headers['set-cookie'] ?? []
    expect(secondCookies).toHaveLength(2)
    expect(secondCookies).toEqual(firstCookies)
    expect(secondCookies.some(c => c.includes('session='))).toBe(true)
    expect(secondCookies.some(c => c.includes('csrf=token123'))).toBe(true)
  })

  it('replays Location on 302', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/redirect', createIdempotencyMiddleware(), (_req, res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Location', '/dashboard')
      res.status(302).send('Found')
    })

    const first = await request(app).post('/api/redirect').set('Idempotency-Key', 'k_loc').send({})
    const second = await request(app).post('/api/redirect').set('Idempotency-Key', 'k_loc').send({})

    expect(first.status).toBe(302)
    expect(second.status).toBe(302)
    expect(second.headers['location']).toBe('/dashboard')
    expect(second.headers['location']).toBe(first.headers['location'])
    expect(second.headers['x-idempotent-replayed']).toBe('true')
  })

  it('replays custom X-* headers (ETag, X-Request-Id, X-Trace-Id)', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/create', createIdempotencyMiddleware(), (_req, res) => {
      res.setHeader('ETag', 'W/"abc123"')
      res.setHeader('X-Request-Id', 'req_xyz')
      res.setHeader('X-Trace-Id', 'trace_42')
      sendSuccess(res, { id: 'created_1' })
    })

    const first = await request(app).post('/api/create').set('Idempotency-Key', 'k_custom').send({})
    const second = await request(app)
      .post('/api/create')
      .set('Idempotency-Key', 'k_custom')
      .send({})

    expect(second.headers['etag']).toBe('W/"abc123"')
    expect(second.headers['x-request-id']).toBe('req_xyz')
    expect(second.headers['x-trace-id']).toBe('trace_42')
    expect(second.headers['x-idempotent-replayed']).toBe('true')
    // Sanity — replay matches original
    expect(second.headers['etag']).toBe(first.headers['etag'])
  })

  it('strips hop-by-hop headers (Connection, Keep-Alive, etc.) at capture time', async () => {
    // Inspect the persisted record directly — Node's HTTP layer refuses to emit
    // some hop-by-hop combinations (e.g. Transfer-Encoding + Content-Length) so
    // we can't reliably observe them on the wire via supertest. The contract we
    // care about is: whatever the handler sets, the cache must NOT replay
    // hop-by-hop headers on a subsequent request.
    const captured: Record<string, IdempotencyRecord> = {}
    const inspectStore: IdempotencyStore = {
      get(key) {
        return captured[key] ?? null
      },
      set(key, record) {
        captured[key] = record
      },
    }

    const app = express()
    app.use(express.json())
    app.post('/api/items', createIdempotencyMiddleware({ store: inspectStore }), (_req, res) => {
      // Set hop-by-hop headers that ARE safe to assign at the handler level
      // (Keep-Alive, Proxy-Authenticate, TE, Upgrade). Connection /
      // Transfer-Encoding are managed by Node itself so we don't set them here
      // — the strip logic still handles them if they ever leak through.
      res.setHeader('Keep-Alive', 'timeout=5')
      res.setHeader('Proxy-Authenticate', 'Basic')
      res.setHeader('TE', 'trailers')
      res.setHeader('Upgrade', 'websocket')
      res.setHeader('X-Safe-Header', 'kept')
      res.setHeader('Set-Cookie', 'session=abc')
      sendSuccess(res, { ok: true })
    })

    await request(app).post('/api/items').set('Idempotency-Key', 'k_hop').send({})

    const record = captured['k_hop']
    expect(record).toBeDefined()
    const headerNames = Object.keys(record.headers).map(h => h.toLowerCase())
    // Hop-by-hop headers stripped at capture time
    expect(headerNames).not.toContain('keep-alive')
    expect(headerNames).not.toContain('proxy-authenticate')
    expect(headerNames).not.toContain('te')
    expect(headerNames).not.toContain('upgrade')
    expect(headerNames).not.toContain('connection')
    expect(headerNames).not.toContain('transfer-encoding')
    // Safe headers preserved
    expect(headerNames).toContain('x-safe-header')
    expect(headerNames).toContain('set-cookie')
    expect(headerNames).toContain('content-type')
  })

  it('preserves Content-Type when handler explicitly sets a non-JSON type', async () => {
    const app = express()
    app.use(express.json())
    app.post('/api/xml', createIdempotencyMiddleware(), (_req, res) => {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8')
      res.status(200).send('<root><id>1</id></root>')
    })

    const first = await request(app).post('/api/xml').set('Idempotency-Key', 'k_xml').send({})
    const second = await request(app).post('/api/xml').set('Idempotency-Key', 'k_xml').send({})

    expect(second.headers['content-type']).toBe('application/xml; charset=utf-8')
    expect(second.headers['content-type']).toBe(first.headers['content-type'])
    expect(second.text).toBe(first.text)
  })
})
