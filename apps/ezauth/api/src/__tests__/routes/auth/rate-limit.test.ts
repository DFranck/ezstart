/**
 * Per-route rate-limit smoke tests.
 *
 * Asserts each sensitive auth route is wired with `createStrictRateLimiter()`
 * at the documented budget. The limiter runs BEFORE the controller / auth
 * middleware, so we don't need MongoDB or valid credentials — we just send
 * the route bytes and count `429`s.
 *
 * Budgets (cf. .claude/rules/standard-saas.md §1.2):
 *   - register        3 req/min  (anti-spam account creation)
 *   - forgot-password 2 req/min  (anti email-bombing)
 *   - reset-password  5 req/min  (token validation, default strict)
 *   - verify-email    5 req/min  (token validation, default strict)
 *   - sso/authorize  10 req/min  (legitimate cross-app SSO bursts)
 *   - sso/exchange   10 req/min  (legitimate cross-app SSO bursts)
 */

import express from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import registerRouter from '../../../routes/auth/register.js'
import forgotPasswordRouter from '../../../routes/auth/forgot-password.js'
import resetPasswordRouter from '../../../routes/auth/reset-password.js'
import verifyEmailRouter from '../../../routes/auth/verify-email.js'
import ssoAuthorizeRouter from '../../../routes/auth/sso-authorize.js'
import ssoExchangeRouter from '../../../routes/auth/sso-exchange.js'

interface RouteRateLimitCase {
  label: string
  router: express.Router
  method: 'post'
  path: string
  body: Record<string, unknown>
  /** Number of requests allowed BEFORE 429 fires (= configured `max`). */
  max: number
}

const CASES: RouteRateLimitCase[] = [
  {
    label: 'POST /register — 3/min',
    router: registerRouter,
    method: 'post',
    path: '/register',
    body: {},
    max: 3,
  },
  {
    label: 'POST /forgot-password — 2/min',
    router: forgotPasswordRouter,
    method: 'post',
    path: '/forgot-password',
    body: {},
    max: 2,
  },
  {
    label: 'POST /reset-password — 5/min',
    router: resetPasswordRouter,
    method: 'post',
    path: '/reset-password',
    body: {},
    max: 5,
  },
  {
    label: 'POST /verify-email — 5/min',
    router: verifyEmailRouter,
    method: 'post',
    path: '/verify-email',
    body: {},
    max: 5,
  },
  {
    label: 'POST /sso/authorize — 10/min',
    router: ssoAuthorizeRouter,
    method: 'post',
    path: '/sso/authorize',
    body: {},
    max: 10,
  },
  {
    label: 'POST /sso/exchange — 10/min',
    router: ssoExchangeRouter,
    method: 'post',
    path: '/sso/exchange',
    body: {},
    max: 10,
  },
]

function buildApp(router: express.Router): express.Express {
  const app = express()
  app.use(express.json())
  // The router files mount their handlers at root paths (/register, etc.) so we
  // mount the router itself at root.
  app.use(router)
  return app
}

describe('Auth routes — strict rate limit wiring', () => {
  // The shared `createRateLimiter` is auto-disabled in `NODE_ENV=test` so other
  // suites' supertest fixtures don't share-IP-throttle each other. This file
  // is the ONE place we deliberately exercise the limiter, so we opt back in.
  let originalForce: string | undefined
  beforeAll(() => {
    originalForce = process.env.RATE_LIMIT_FORCE
    process.env.RATE_LIMIT_FORCE = '1'
  })
  afterAll(() => {
    if (originalForce === undefined) delete process.env.RATE_LIMIT_FORCE
    else process.env.RATE_LIMIT_FORCE = originalForce
  })

  it.each(CASES)(
    '$label: $max requests pass, the next returns 429 with RATE_LIMIT_EXCEEDED + Retry-After',
    async ({ router, method, path, body, max }) => {
      const app = buildApp(router)

      // Burn through `max` requests — they MAY return any non-429 status (validation
      // 400, auth 401, etc.) because we don't send valid bodies. The point is the
      // limiter let them through.
      for (let i = 0; i < max; i++) {
        const res = await request(app)[method](path).send(body)
        expect(res.status).not.toBe(429)
      }

      const blocked = await request(app)[method](path).send(body)
      expect(blocked.status).toBe(429)
      expect(blocked.body).toMatchObject({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED' },
      })
      expect(typeof blocked.body.error.retryAfter).toBe('number')
      expect(blocked.body.error.retryAfter).toBeGreaterThan(0)
      // express-rate-limit sets standard `RateLimit-*` headers AND legacy
      // `Retry-After` on the 429 response.
      expect(blocked.headers['retry-after']).toBeDefined()
    }
  )
})

// NOTE: each route file instantiates its rate limiter at module load, so the
// MemoryStore lives for the lifetime of the test process. We therefore exercise
// each route exactly once per test run (via `it.each` above). To reset the
// counter mid-suite you'd need a custom store with `.resetAll()`, which is
// orthogonal to what we want to assert here (correct wiring + correct max).
