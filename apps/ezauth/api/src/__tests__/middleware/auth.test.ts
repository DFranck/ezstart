import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyTokenMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js'
import { createUser, generateAccessToken, generateExpiredToken, cleanAllCollections } from '../helpers/setup.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  // Protected route
  app.get('/protected', verifyTokenMiddleware, (req, res) => {
    res.json({ success: true, data: { userId: req.user?._id, email: req.user?.email } })
  })

  // Optional auth route
  app.get('/optional', optionalAuthMiddleware, (req, res) => {
    res.json({
      success: true,
      data: { authenticated: !!req.user, userId: req.user?._id || null },
    })
  })

  return app
}

describe('Auth Middleware', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('verifyTokenMiddleware', () => {
    it('should pass with valid Bearer token', async () => {
      const user = await createUser({ email: 'auth@test.com', username: 'authtest' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.userId).toBe(user._id!.toString())
      expect(res.body.data.email).toBe('auth@test.com')
    })

    it('should pass with valid cookie token', async () => {
      const user = await createUser({ email: 'cookie@test.com', username: 'cookietest' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/protected')
        .set('Cookie', `ezauth_token=${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.userId).toBe(user._id!.toString())
    })

    it('should reject when no token is provided', async () => {
      const res = await request(app).get('/protected')

      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('Authentication required')
    })

    it('should reject an invalid token', async () => {
      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-garbage-token')

      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('Invalid token')
    })

    it('should reject an expired token', async () => {
      const user = await createUser({ email: 'expired@test.com', username: 'expiredtest' })
      const token = generateExpiredToken(user)

      // Small delay to ensure expiry
      await new Promise(r => setTimeout(r, 50))

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('Token expired')
    })

    it('should reject when user no longer exists in DB', async () => {
      const user = await createUser({ email: 'deleted@test.com', username: 'deletedtest' })
      const token = generateAccessToken(user)

      // Delete user from DB
      const { getAuthUserModel } = await import('../../models/auth-user.js')
      const AuthUser = await getAuthUserModel()
      await AuthUser.findByIdAndDelete(user._id)

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('User not found')
    })

    it('should prefer Bearer token over cookie', async () => {
      const user1 = await createUser({ email: 'bearer@test.com', username: 'bearertest' })
      const user2 = await createUser({ email: 'cookie2@test.com', username: 'cookietest2' })
      const bearerToken = generateAccessToken(user1)
      const cookieToken = generateAccessToken(user2)

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${bearerToken}`)
        .set('Cookie', `ezauth_token=${cookieToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.userId).toBe(user1._id!.toString())
    })
  })

  describe('optionalAuthMiddleware', () => {
    it('should proceed without auth and set no user', async () => {
      const res = await request(app).get('/optional')

      expect(res.status).toBe(200)
      expect(res.body.data.authenticated).toBe(false)
      expect(res.body.data.userId).toBeNull()
    })

    it('should attach user when valid token provided', async () => {
      const user = await createUser({ email: 'optional@test.com', username: 'optionaltest' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.authenticated).toBe(true)
      expect(res.body.data.userId).toBe(user._id!.toString())
    })

    it('should silently skip invalid token', async () => {
      const res = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer bad-token')

      expect(res.status).toBe(200)
      expect(res.body.data.authenticated).toBe(false)
    })
  })
})
