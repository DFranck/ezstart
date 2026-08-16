import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
} from '../core/middleware/rate-limit.js'
import '../core/express-aug.js'

// The shared `createRateLimiter` is auto-disabled in `NODE_ENV=test` so other
// suites' supertest fixtures don't share-IP-throttle each other. This file is
// one of the places we deliberately exercise the limiter, so we opt back in
// for the duration of the suite via the documented escape hatch.
let originalForce: string | undefined
beforeAll(() => {
  originalForce = process.env.RATE_LIMIT_FORCE
  process.env.RATE_LIMIT_FORCE = '1'
})
afterAll(() => {
  if (originalForce === undefined) delete process.env.RATE_LIMIT_FORCE
  else process.env.RATE_LIMIT_FORCE = originalForce
})

describe('createRateLimiter', () => {
  it('allows requests below the limit and exposes standard rate-limit headers', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 3, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/x')
    expect(res.status).toBe(200)
    expect(res.headers['ratelimit-limit']).toBeDefined()
    expect(res.headers['ratelimit-remaining']).toBeDefined()
  })

  it('emits 429 with structured envelope once the limit is exceeded', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    await request(app).get('/x')
    await request(app).get('/x')
    const blocked = await request(app).get('/x')

    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
    expect(typeof blocked.body.error.message).toBe('string')
    expect(typeof blocked.body.error.retryAfter).toBe('number')
  })

  it('skips the limiter for paths in skipPaths', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: ['/api/health'] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

    await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(blocked.status).toBe(429)

    const health = await request(app).get('/api/health')
    expect(health.status).toBe(200)
    const health2 = await request(app).get('/api/health')
    expect(health2.status).toBe(200)
  })

  it('honors a custom message and preserves the error envelope shape', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [], message: 'Slow down' }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.message).toBe('Slow down')
  })
})

describe('preset rate limiters', () => {
  it('strict limiter blocks after 5 requests', async () => {
    const app = express()
    app.post('/login', createStrictRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 5; i++) {
      const ok = await request(app).post('/login')
      expect(ok.status).toBe(200)
    }
    const blocked = await request(app).post('/login')
    expect(blocked.status).toBe(429)
  })

  it('very-strict limiter blocks after 3 requests with a registration-flavored message', async () => {
    const app = express()
    app.post('/register', createVeryStrictRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 3; i++) await request(app).post('/register')
    const blocked = await request(app).post('/register')
    expect(blocked.status).toBe(429)
    expect(String(blocked.body.error.message).toLowerCase()).toContain('registration')
  })

  it('moderate limiter blocks after 10 requests with a payment-flavored message', async () => {
    const app = express()
    app.post('/donate', createModerateRateLimiter(), (_req, res) => res.json({ ok: true }))

    for (let i = 0; i < 10; i++) await request(app).post('/donate')
    const blocked = await request(app).post('/donate')
    expect(blocked.status).toBe(429)
    expect(String(blocked.body.error.message).toLowerCase()).toContain('payment')
  })
})

describe('Per-bucket isolation (keyGenerator priority)', () => {
  type AuthShape = {
    userId?: string
    apiKeyId?: string
    userObjectId?: string
    userPayloadId?: string
  }

  function buildApp(authForRequest: (req: Request) => AuthShape | undefined): Express {
    const a = express()
    a.set('trust proxy', 2)
    a.use((req: Request, _res: Response, next: NextFunction) => {
      const auth = authForRequest(req)
      if (auth?.userId) req.userId = auth.userId
      if (auth?.userObjectId) {
        req.user = {
          _id: auth.userObjectId,
          userId: auth.userObjectId,
        }
      }
      if (auth?.userPayloadId) {
        req.user = { userId: auth.userPayloadId }
      }
      if (auth?.apiKeyId) {
        ;(req as Request & { apiKeyId?: string }).apiKeyId = auth.apiKeyId
      }
      next()
    })
    a.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
    a.get('/api/test', (_req, res) => res.json({ ok: true }))
    return a
  }

  it('should bucket per-user (req.userId) — different users from same IP get separate quotas', async () => {
    const a = buildApp(req => ({ userId: req.headers['x-test-user'] as string | undefined }))

    // user-A burns 2/2
    await request(a).get('/api/test').set('x-test-user', 'user-A')
    await request(a).get('/api/test').set('x-test-user', 'user-A')
    const aBlocked = await request(a).get('/api/test').set('x-test-user', 'user-A')
    expect(aBlocked.status).toBe(429)

    // user-B has its OWN bucket (same IP)
    const bAllowed1 = await request(a).get('/api/test').set('x-test-user', 'user-B')
    expect(bAllowed1.status).toBe(200)
    const bAllowed2 = await request(a).get('/api/test').set('x-test-user', 'user-B')
    expect(bAllowed2.status).toBe(200)
    const bBlocked = await request(a).get('/api/test').set('x-test-user', 'user-B')
    expect(bBlocked.status).toBe(429)
  })

  it('should bucket per req.user._id when req.userId is missing', async () => {
    const a = buildApp(req => ({
      userObjectId: req.headers['x-test-user-oid'] as string | undefined,
    }))

    await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
    await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
    const blocked1 = await request(a).get('/api/test').set('x-test-user-oid', 'oid-1')
    expect(blocked1.status).toBe(429)

    const ok = await request(a).get('/api/test').set('x-test-user-oid', 'oid-2')
    expect(ok.status).toBe(200)
  })

  it('should bucket per req.user.userId when only payload userId is present', async () => {
    const a = buildApp(req => ({
      userPayloadId: req.headers['x-test-user-payload'] as string | undefined,
    }))

    await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
    await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
    const blocked = await request(a).get('/api/test').set('x-test-user-payload', 'p-1')
    expect(blocked.status).toBe(429)

    const ok = await request(a).get('/api/test').set('x-test-user-payload', 'p-2')
    expect(ok.status).toBe(200)
  })

  it('should bucket per-API-key (req.apiKeyId) when no user is authenticated', async () => {
    const a = buildApp(req => ({ apiKeyId: req.headers['x-test-key'] as string | undefined }))

    await request(a).get('/api/test').set('x-test-key', 'key-1')
    await request(a).get('/api/test').set('x-test-key', 'key-1')
    const blocked = await request(a).get('/api/test').set('x-test-key', 'key-1')
    expect(blocked.status).toBe(429)

    const ok = await request(a).get('/api/test').set('x-test-key', 'key-2')
    expect(ok.status).toBe(200)
  })

  it('should prioritize req.userId > req.apiKeyId when both are present', async () => {
    // Force the same apiKeyId for all requests but vary user — if priority is
    // wrong, bucketing collapses to apiKey and user-B would be blocked.
    const a = buildApp(req => ({
      userId: req.headers['x-test-user'] as string | undefined,
      apiKeyId: 'shared-key',
    }))

    await request(a).get('/api/test').set('x-test-user', 'user-A')
    await request(a).get('/api/test').set('x-test-user', 'user-A')
    const aBlocked = await request(a).get('/api/test').set('x-test-user', 'user-A')
    expect(aBlocked.status).toBe(429)

    // user-B with the same shared apiKey should still have its own bucket
    const bOk = await request(a).get('/api/test').set('x-test-user', 'user-B')
    expect(bOk.status).toBe(200)
  })

  it('should fall back to IP for fully anonymous traffic', async () => {
    const a = buildApp(() => undefined)

    // All requests come from same IP → share bucket
    await request(a).get('/api/test')
    await request(a).get('/api/test')
    const blocked = await request(a).get('/api/test')
    expect(blocked.status).toBe(429)
  })

  it('should track different IPs independently when anonymous (XFF with ≥2 hops)', async () => {
    const a = buildApp(() => undefined)

    // X-Forwarded-For with 2 IPs — `trust proxy: 2` strips trusted hops and
    // exposes the leftmost as req.ip. Confirm anonymous bucketing still works
    // when X-Forwarded-For has 2+ IPs (which is what real Fastly→Railway
    // produces).
    for (let i = 0; i < 2; i++) {
      await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
    }
    const blocked = await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
    expect(blocked.status).toBe(429)

    const ok = await request(a).get('/api/test').set('X-Forwarded-For', '2.2.2.2, 10.0.0.1')
    expect(ok.status).toBe(200)
  })

  it('should treat all requests behind the LB as separate IPs only when XFF is well-formed', async () => {
    const a = buildApp(() => undefined)

    // With `trust proxy: 2`, Express picks the (n-2)th-from-right IP in XFF.
    // Real Fastly→Railway sends XFF = "<client>, <fastly>, <railway>" — Express
    // strips the last 2 (trusted hops) and uses <client> as req.ip.
    //
    // If consumers behind the SAME real client IP attack at scale, they share
    // the bucket — exactly the desired behavior for anonymous routes.
    for (let i = 0; i < 2; i++) {
      await request(a).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 192.168.0.1, 10.0.0.1')
    }
    const blocked = await request(a)
      .get('/api/test')
      .set('X-Forwarded-For', '1.1.1.1, 192.168.0.1, 10.0.0.1')
    expect(blocked.status).toBe(429)
  })

  it('should accept a custom keyGenerator that overrides the default', async () => {
    const app = express()
    app.set('trust proxy', 2)
    // Bucket EVERYTHING into a single global key
    app.use(
      createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [], keyGenerator: () => 'global' })
    )
    app.get('/api/test', (_req, res) => res.json({ ok: true }))

    await request(app).get('/api/test').set('X-Forwarded-For', '1.1.1.1, 10.0.0.1')
    await request(app).get('/api/test').set('X-Forwarded-For', '2.2.2.2, 10.0.0.1')
    const blocked = await request(app).get('/api/test').set('X-Forwarded-For', '3.3.3.3, 10.0.0.1')
    expect(blocked.status).toBe(429)
  })
})

// ─── H4 hardening: explicit opt-in disable (no NODE_ENV auto-bypass) ───
describe('H4 — explicit disable opt-in', () => {
  // These tests must NOT have RATE_LIMIT_FORCE set in their inner closure —
  // they verify the post-H4 behavior where the limiter is always on unless
  // the caller passes `disabled: true`. The suite-level beforeAll above does
  // set RATE_LIMIT_FORCE=1 for backward-compat with the old skip logic, but
  // since that env var is now ignored entirely, leaving it set here is a
  // no-op (kept to document the transition).

  it('rate-limits in NODE_ENV=test by default (no implicit bypass)', async () => {
    const prevNodeEnv = process.env.NODE_ENV
    const prevForce = process.env.RATE_LIMIT_FORCE
    process.env.NODE_ENV = 'test'
    delete process.env.RATE_LIMIT_FORCE
    try {
      const app = express()
      app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
      app.get('/x', (_req, res) => res.json({ ok: true }))

      await request(app).get('/x')
      await request(app).get('/x')
      const blocked = await request(app).get('/x')
      // Without explicit `disabled: true`, the limiter MUST fire even when
      // NODE_ENV=test and RATE_LIMIT_FORCE is unset. This is the core of H4.
      expect(blocked.status).toBe(429)
      expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    } finally {
      process.env.NODE_ENV = prevNodeEnv
      if (prevForce === undefined) delete process.env.RATE_LIMIT_FORCE
      else process.env.RATE_LIMIT_FORCE = prevForce
    }
  })

  it('disabled: true bypasses the limiter entirely', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [], disabled: true }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    // 5 requests against a max=1 limiter all succeed when disabled is true.
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get('/x')
      expect(res.status).toBe(200)
    }
  })

  it('disabled: false (default) enforces the limiter normally', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [], disabled: false }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(blocked.status).toBe(429)
  })

  it('disabled flag also forwards through preset limiters', async () => {
    // createStrictRateLimiter spreads ...options, so disabled must pass through.
    const app = express()
    app.post('/login', createStrictRateLimiter({ disabled: true }), (_req, res) =>
      res.json({ ok: true })
    )

    // Strict limiter is normally 5/min — 10 requests must all pass when disabled.
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/login')
      expect(res.status).toBe(200)
    }
  })

  it('RATE_LIMIT_FORCE env var is now ignored (was the old escape hatch)', async () => {
    // Pre-H4: setting RATE_LIMIT_FORCE=1 was required to bypass the implicit
    // NODE_ENV=test skip. Post-H4: the limiter is always on, so this var is
    // a no-op. The kept-around setting in suite beforeAll is harmless legacy.
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    process.env.RATE_LIMIT_FORCE = '0' // explicitly OFF — still doesn't matter
    try {
      const app = express()
      app.use(createRateLimiter({ max: 1, windowMs: 60_000, skipPaths: [] }))
      app.get('/x', (_req, res) => res.json({ ok: true }))

      await request(app).get('/x')
      const blocked = await request(app).get('/x')
      // Limiter fires regardless of RATE_LIMIT_FORCE value.
      expect(blocked.status).toBe(429)
    } finally {
      process.env.NODE_ENV = prevNodeEnv
      process.env.RATE_LIMIT_FORCE = '1' // restore suite default
    }
  })
})

// ─── M6 hardening: OPTIONS preflight bypass ───
describe('M6 — OPTIONS bypass in rate-limit', () => {
  it('100 OPTIONS requests do not consume the rate budget (max=5)', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 5, windowMs: 60_000, skipPaths: [] }))
    // Mount an OPTIONS handler so Express doesn't 404 before the middleware
    // has a chance to be exercised (express-rate-limit's `skip` runs before
    // route resolution, so a 404 still hits the limiter — but the test asserts
    // a 204 response, which requires the route to exist).
    app.options('/x', (_req, res) => {
      res.status(204).end()
    })

    for (let i = 0; i < 100; i += 1) {
      const r = await request(app).options('/x')
      expect(r.status).toBe(204)
    }
  })

  it('GET still hits the budget normally (max=2)', async () => {
    const app = express()
    app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    const ok1 = await request(app).get('/x')
    const ok2 = await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(ok1.status).toBe(200)
    expect(ok2.status).toBe(200)
    expect(blocked.status).toBe(429)
  })

  it('OPTIONS preflights do not consume budget that GET later relies on', async () => {
    // Realistic attack scenario: attacker spams OPTIONS to lock out a user.
    // Post-M6, the user's GET budget is untouched after 100 OPTIONS.
    const app = express()
    app.use(createRateLimiter({ max: 2, windowMs: 60_000, skipPaths: [] }))
    app.get('/x', (_req, res) => res.json({ ok: true }))
    app.options('/x', (_req, res) => res.status(204).end())

    // Attacker burns 100 OPTIONS
    for (let i = 0; i < 100; i += 1) {
      await request(app).options('/x')
    }

    // Victim still has the full GET budget
    const ok1 = await request(app).get('/x')
    const ok2 = await request(app).get('/x')
    const blocked = await request(app).get('/x')
    expect(ok1.status).toBe(200)
    expect(ok2.status).toBe(200)
    expect(blocked.status).toBe(429)
  })

  it('OPTIONS bypass also applies to strict preset', async () => {
    const app = express()
    app.use('/login', createStrictRateLimiter())
    app.options('/login', (_req, res) => res.status(204).end())
    app.post('/login', (_req, res) => res.json({ ok: true }))

    // 50 OPTIONS preflights (limiter is 5/min) — all should pass.
    for (let i = 0; i < 50; i += 1) {
      const r = await request(app).options('/login')
      expect(r.status).toBe(204)
    }
    // The POST budget (5/min) is still intact.
    for (let i = 0; i < 5; i += 1) {
      const r = await request(app).post('/login')
      expect(r.status).toBe(200)
    }
    const blocked = await request(app).post('/login')
    expect(blocked.status).toBe(429)
  })
})
