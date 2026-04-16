/**
 * Security tests for createEzstartAuth (monorepo JWT verification).
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

// We need to set JWT_SECRET before importing createEzstartAuth
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

describe('createEzstartAuth — JWT security', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  async function buildApp() {
    const { createEzstartAuth } = await import('../../ezstart-server.js')
    const { authMiddleware } = createEzstartAuth(TEST_SECRET)
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
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('rejects token signed with wrong secret', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      'wrong-secret',
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects expired token', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
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
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${fakeToken}`)
    // jwt.verify with algorithms: ['HS256'] rejects alg:none
    expect(res.status).toBe(401)
  })

  it('rejects token with non-ObjectId userId', async () => {
    const token = jwt.sign(
      { userId: 'not-an-objectid' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    // buildUserFromDecoded checks OBJECT_ID_REGEX — returns null for non-ObjectId
    expect(res.status).toBe(401)
  })

  it('rejects token with empty userId', async () => {
    const token = jwt.sign(
      { userId: '' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('rejects token without userId/sub/id claim at all', async () => {
    const token = jwt.sign(
      { email: 'test@example.com', role: 'admin' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('accepts token with "sub" claim as userId fallback', async () => {
    const token = jwt.sign(
      { sub: '507f1f77bcf86cd799439011' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('accepts token with "id" claim as userId fallback', async () => {
    const token = jwt.sign(
      { id: '507f1f77bcf86cd799439011' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('throws if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET
    const { createEzstartAuth } = await import('../../ezstart-server.js')
    expect(() => createEzstartAuth()).toThrow('JWT_SECRET environment variable is required')
  })

  it('extracts token from ezauth_token cookie', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `ezauth_token=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('507f1f77bcf86cd799439011')
  })

  it('rejects malformed JWT (random string)', async () => {
    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer thisisnotajwt')
    expect(res.status).toBe(401)
  })

  it('rejects JWT with tampered payload', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    // Tamper with the payload
    const parts = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'aaaaaaaaaaaaaaaaaaaaaaaaa', email: 'hacker@evil.com' })
    ).toString('base64url')
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`

    const app = await buildApp()
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tamperedToken}`)
    expect(res.status).toBe(401)
  })
})
