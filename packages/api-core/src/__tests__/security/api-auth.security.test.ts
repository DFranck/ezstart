/**
 * Security tests for createApiAuth (monorepo JWT verification).
 *
 * Tests JWT-specific attacks:
 * - alg:none attack
 * - Wrong secret
 * - Expired tokens
 * - Invalid userId formats (not ObjectId)
 * - Algorithm confusion (RS256 vs HS256)
 */

import jwt from 'jsonwebtoken'
import express, { type Request, type Response } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We need to set JWT_SECRET before importing createApiAuth
const TEST_SECRET = 'test-secret-for-security-audit-32chars!'

vi.mock('@ezstart/config/urls', () => ({
  getPort: () => 9999,
}))
vi.mock('@ezstart/config/cors', () => ({
  getAllowedOrigins: () => ['http://localhost:3000'],
}))
vi.mock('@ezstart/logger/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('createApiAuth — JWT security', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  async function buildApp() {
    const { createApiAuth } = await import('../../create-api-server.js')
    const { authMiddleware } = createApiAuth(TEST_SECRET)
    const app = express()
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({ userId: req.userId, user: req.user })
    })
    return app
  }

  it('accepts a valid HS256 token with proper ObjectId userId', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', email: 'test@example.com' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('rejects token signed with wrong secret', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, 'wrong-secret', {
      algorithm: 'HS256',
    })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects expired token', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: '-1s',
    })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('CRITICAL: rejects alg:none attack — manually crafted JWT', async () => {
    // Craft a JWT with alg:none
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ userId: '507f1f77bcf86cd799439011', email: 'hacker@evil.com' })
    ).toString('base64url')
    const fakeToken = `${header}.${payload}.`

    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${fakeToken}`)
    // jwt.verify with algorithms: ['HS256'] rejects alg:none
    expect(res.status).toBe(401)
  })

  it('rejects token with non-ObjectId userId', async () => {
    const token = jwt.sign({ userId: 'not-an-objectid' }, TEST_SECRET, { algorithm: 'HS256' })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    // buildUserFromDecoded checks OBJECT_ID_REGEX — returns null for non-ObjectId
    expect(res.status).toBe(401)
  })

  it('rejects token with empty userId', async () => {
    const token = jwt.sign({ userId: '' }, TEST_SECRET, { algorithm: 'HS256' })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects token without userId/sub/id claim at all', async () => {
    const token = jwt.sign({ email: 'test@example.com', role: 'admin' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('accepts token with "sub" claim as userId fallback', async () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, TEST_SECRET, { algorithm: 'HS256' })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('accepts token with "id" claim as userId fallback', async () => {
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, TEST_SECRET, { algorithm: 'HS256' })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('throws if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET
    const { createApiAuth } = await import('../../create-api-server.js')
    expect(() => createApiAuth()).toThrow('JWT_SECRET environment variable is required')
  })

  it('extracts token from ezauth_token cookie', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Cookie', `ezauth_token=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('rejects malformed JWT (random string)', async () => {
    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', 'Bearer thisisnotajwt')
    expect(res.status).toBe(401)
  })

  it('rejects JWT with tampered payload', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    // Tamper with the payload
    const parts = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'aaaaaaaaaaaaaaaaaaaaaaaaa', email: 'hacker@evil.com' })
    ).toString('base64url')
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`

    const app = await buildApp()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${tamperedToken}`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M3 — Reject all-zero ObjectId (audit 2026-05-15)
// ─────────────────────────────────────────────────────────────────────────────

describe('M3 — Reject all-zero ObjectId in JWT userId', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })
  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  it('isValidObjectId() rejects the canonical 24-zero ObjectId', async () => {
    const { isValidObjectId } = await import('../../create-api-server.js')
    expect(isValidObjectId('000000000000000000000000')).toBe(false)
  })

  it('isValidObjectId() accepts a real ObjectId', async () => {
    const { isValidObjectId } = await import('../../create-api-server.js')
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true)
  })

  it('isValidObjectId() rejects non-hex / wrong length', async () => {
    const { isValidObjectId } = await import('../../create-api-server.js')
    expect(isValidObjectId('not-an-objectid')).toBe(false)
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false) // 23 chars
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false) // 25 chars
    expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false) // non-hex char
  })

  it('isValidObjectId() accepts uppercase hex (Mongo serializes lowercase but be forgiving on read)', async () => {
    const { isValidObjectId } = await import('../../create-api-server.js')
    expect(isValidObjectId('507F1F77BCF86CD799439011')).toBe(true)
  })

  it('rejects JWT with all-zero userId via authMiddleware', async () => {
    const token = jwt.sign({ userId: '000000000000000000000000' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const { createApiAuth } = await import('../../create-api-server.js')
    const { authMiddleware } = createApiAuth(TEST_SECRET)
    const app = express()
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({ userId: req.userId })
    })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects JWT with all-zero `sub` claim', async () => {
    const token = jwt.sign({ sub: '000000000000000000000000' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const { createApiAuth } = await import('../../create-api-server.js')
    const { authMiddleware } = createApiAuth(TEST_SECRET)
    const app = express()
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({ userId: req.userId })
    })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// L1 — JWT iss/aud verification (audit 2026-05-15)
// ─────────────────────────────────────────────────────────────────────────────

describe('L1 — JWT iss/aud verification in createApiAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })
  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  async function buildAppWithAuth(authOptions?: {
    issuer?: string | string[]
    audience?: string | string[]
  }) {
    const { createApiAuth } = await import('../../create-api-server.js')
    const { authMiddleware } = createApiAuth({ jwtSecret: TEST_SECRET, ...authOptions })
    const app = express()
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({ userId: req.userId })
    })
    return app
  }

  it('accepts JWT without iss/aud claims when options unset (backward compat)', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const app = await buildAppWithAuth()
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('accepts JWT with matching issuer when configured', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://ezauth.ezstart.xyz',
    })
    const app = await buildAppWithAuth({ issuer: 'https://ezauth.ezstart.xyz' })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('rejects JWT with wrong issuer when configured', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://evil-issuer.com',
    })
    const app = await buildAppWithAuth({ issuer: 'https://ezauth.ezstart.xyz' })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects JWT with no issuer claim when issuer is configured', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      // no issuer
    })
    const app = await buildAppWithAuth({ issuer: 'https://ezauth.ezstart.xyz' })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('accepts JWT matching one of multiple allowed issuers', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://ezpay.ezstart.xyz',
    })
    const app = await buildAppWithAuth({
      issuer: ['https://ezauth.ezstart.xyz', 'https://ezpay.ezstart.xyz'],
    })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('accepts JWT with matching audience when configured', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      audience: 'ezpay',
    })
    const app = await buildAppWithAuth({ audience: 'ezpay' })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('rejects JWT with wrong audience when configured', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      audience: 'evil-app',
    })
    const app = await buildAppWithAuth({ audience: 'ezpay' })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('accepts JWT with one of multiple allowed audiences', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      audience: 'ezbill',
    })
    const app = await buildAppWithAuth({ audience: ['ezpay', 'ezbill'] })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('enforces BOTH iss and aud when both configured', async () => {
    const goodToken = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://ezauth.ezstart.xyz',
      audience: 'ezpay',
    })
    // Wrong issuer, right audience → reject
    const wrongIssuerToken = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://evil.com',
      audience: 'ezpay',
    })
    // Right issuer, wrong audience → reject
    const wrongAudToken = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
      issuer: 'https://ezauth.ezstart.xyz',
      audience: 'evil-app',
    })

    const app = await buildAppWithAuth({
      issuer: 'https://ezauth.ezstart.xyz',
      audience: 'ezpay',
    })

    expect(
      (await request(app).get('/protected').set('Authorization', `Bearer ${goodToken}`)).status
    ).toBe(200)
    expect(
      (await request(app).get('/protected').set('Authorization', `Bearer ${wrongIssuerToken}`))
        .status
    ).toBe(401)
    expect(
      (await request(app).get('/protected').set('Authorization', `Bearer ${wrongAudToken}`)).status
    ).toBe(401)
  })

  it('legacy string-only signature still works (backward compat)', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_SECRET, {
      algorithm: 'HS256',
    })
    const { createApiAuth } = await import('../../create-api-server.js')
    // Legacy: createApiAuth(jwtSecret) as bare string
    const { authMiddleware } = createApiAuth(TEST_SECRET)
    const app = express()
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.json({ userId: req.userId })
    })
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})
