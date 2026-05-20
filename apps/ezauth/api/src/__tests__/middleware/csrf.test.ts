import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { createUser, generateAccessToken, cleanAllCollections } from '../helpers/setup.js'

function createCsrfTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.post('/csrf-test', verifyCookieCsrf, (_req, res) => {
    res.json({ success: true, data: { message: 'passed csrf' } })
  })

  return app
}

describe('CSRF Middleware', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createCsrfTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should skip CSRF for Bearer auth (not a CSRF vector)', async () => {
    const user = await createUser({ email: 'bearer@csrf.com', username: 'bearercsrf' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .post('/csrf-test')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('passed csrf')
  })

  it('should skip CSRF for unauthenticated requests (no cookie)', async () => {
    const res = await request(app).post('/csrf-test').send({})

    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('passed csrf')
  })

  it('should skip CSRF for trusted origins with cookie', async () => {
    const user = await createUser({ email: 'trusted@csrf.com', username: 'trustedcsrf' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .post('/csrf-test')
      .set('Cookie', `ezauth_token=${token}`)
      .set('Origin', 'http://localhost:6111')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('passed csrf')
  })

  it('should skip CSRF for ezstart.xyz subdomain origin', async () => {
    const user = await createUser({ email: 'sub@csrf.com', username: 'subcsrf' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .post('/csrf-test')
      .set('Cookie', `ezauth_token=${token}`)
      .set('Origin', 'https://ezbill.ezstart.xyz')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('passed csrf')
  })

  it('should enforce CSRF for cookie-auth request from unknown origin', async () => {
    const user = await createUser({ email: 'evil@csrf.com', username: 'evilcsrf' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .post('/csrf-test')
      .set('Cookie', `ezauth_token=${token}`)
      .set('Origin', 'https://evil.com')
      .send({})

    // Should get 403 from CSRF verification (no valid CSRF token)
    expect(res.status).toBe(403)
  })

  it('should enforce CSRF for cookie-auth request with no origin header', async () => {
    const user = await createUser({ email: 'noorig@csrf.com', username: 'noorigcsrf' })
    const token = generateAccessToken(user)

    // Request with auth cookie but no Origin → falls through to standardCsrf.verifyToken
    // which checks for the CSRF double-submit token (which we don't provide)
    const res = await request(app)
      .post('/csrf-test')
      .set('Cookie', `ezauth_token=${token}`)
      .send({})

    expect(res.status).toBe(403)
  })

  /**
   * HIGH-1 (Wave D Lot 3.5A) — Vercel `*.vercel.app` Origin-trust hardening.
   *
   * MED-4 had narrowed the loose `.*` pattern to `[a-z0-9-]+-ezstart.vercel.app`,
   * but that STILL trusts any attacker-registerable Vercel project ending in
   * `-ezstart` — e.g. `pwn-ezstart.vercel.app` — because `vercel.app` is a
   * SHARED public suffix. An attacker who registers such a project can fire a
   * cookie-auth CSRF (fire-and-forget; the CORS allowlist doesn't help because
   * the attacker never reads the response).
   *
   * The hardened policy Origin-trusts ONLY the exact staging git-branch URL of
   * a KNOWN app slug (`<known-app>-git-staging-ezstart.vercel.app`). Everything
   * else on `vercel.app` falls through to the double-submit token check (403
   * without a token). This is a documented STOPGAP — see `csrf.ts` SECURITY
   * DEBT HIGH-1; the real fix is the SDK always sending the CSRF token, after
   * which the vercel.app entry is removed entirely.
   */
  describe('HIGH-1 — Vercel public-suffix Origin-trust hardening', () => {
    it('REJECTS an attacker-registerable project ending in -ezstart (pwn-ezstart.vercel.app)', async () => {
      const user = await createUser({ email: 'pwn@csrf.com', username: 'pwncsrf' })
      const token = generateAccessToken(user)

      // `pwn-ezstart` is a perfectly registerable Vercel project name — the
      // old `[a-z0-9-]+-ezstart.vercel.app` pattern trusted it. It must now
      // fall through to the double-submit CSRF check → 403 (no token).
      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://pwn-ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(403)
    })

    it('REJECTS a build-hash preview deploy (now requires double-submit token)', async () => {
      const user = await createUser({ email: 'prev1@csrf.com', username: 'prev1csrf' })
      const token = generateAccessToken(user)

      // Build-hash previews are no longer Origin-trusted (the hash segment makes
      // them attacker-spoofable as a fresh project too). They still work via the
      // double-submit token path — here, with no token, they're rejected.
      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://ezauth-abc123-ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(403)
    })

    it('ACCEPTS the exact known-app staging git-branch deploy (stopgap allowance)', async () => {
      const user = await createUser({ email: 'prev2@csrf.com', username: 'prev2csrf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://ezpay-git-staging-ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('passed csrf')
    })

    it('REJECTS an unknown-slug staging git-branch deploy (not a real app)', async () => {
      const user = await createUser({ email: 'unkslug@csrf.com', username: 'unkslugcsrf' })
      const token = generateAccessToken(user)

      // `pwn-git-staging-ezstart` is registerable but `pwn` is not a known app
      // slug → must not be Origin-trusted.
      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://pwn-git-staging-ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(403)
    })

    it('REJECTS an attacker subdomain ending in .ezstart.vercel.app', async () => {
      const user = await createUser({ email: 'evil1@csrf.com', username: 'evil1csrf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://evil.ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(403)
    })

    it('REJECTS an attacker domain that embeds the suffix as a label', async () => {
      const user = await createUser({ email: 'evil2@csrf.com', username: 'evil2csrf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://attacker.com.ezstart.vercel.app')
        .send({})

      expect(res.status).toBe(403)
    })

    it('REJECTS an attacker subdomain ending in .ezstart.xyz', async () => {
      const user = await createUser({ email: 'evil3@csrf.com', username: 'evil3csrf' })
      const token = generateAccessToken(user)

      // Multi-label host under ezstart.xyz must not slip through the
      // single-label `[a-z0-9-]+\.ezstart\.xyz` pattern.
      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://evil.attacker.ezstart.xyz')
        .send({})

      expect(res.status).toBe(403)
    })

    it('still ACCEPTS the production apex/subdomain (exclusively-owned DNS)', async () => {
      const user = await createUser({ email: 'prod@csrf.com', username: 'prodcsrf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'https://ezauth.ezstart.xyz')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('passed csrf')
    })

    it('still ACCEPTS localhost dev origin', async () => {
      const user = await createUser({ email: 'dev@csrf.com', username: 'devcsrf' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/csrf-test')
        .set('Cookie', `ezauth_token=${token}`)
        .set('Origin', 'http://localhost:6111')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('passed csrf')
    })
  })
})
