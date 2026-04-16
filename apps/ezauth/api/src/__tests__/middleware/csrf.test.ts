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
    const res = await request(app)
      .post('/csrf-test')
      .send({})

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
})
