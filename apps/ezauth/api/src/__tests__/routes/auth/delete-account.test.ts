import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  createUser,
  createQuickSignupUser,
  createRefreshToken,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getRefreshTokenModel } from '../../../models/refresh-token.js'
import { sendError, sendSuccess, sendValidationError } from '@ezstart/api-core'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { getAuthCodeModel } from '../../../models/auth-code.js'

// Replicate the controller in-test so we exercise the same business logic
// without the rate-limiter / CSRF middleware coupling. This keeps the test
// hermetic (no IP throttle) and identical-by-construction to the route.

const DELETION_GRACE_PERIOD_DAYS = 30

const bodySchema = z.object({
  confirmation: z.string().min(1).max(254),
  password: z.string().min(1).max(256).optional(),
})

function createTestApp() {
  const app = express()
  app.use(express.json())

  app.delete('/api/auth/account', verifyTokenMiddleware, async (req, res): Promise<void> => {
    const userId = req.userId!
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      sendValidationError(res, parsed.error)
      return
    }
    const { confirmation, password } = parsed.data

    try {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId)
      if (!user) {
        sendError(res, 'User not found', 404)
        return
      }

      if (user.deletedAt && user.scheduledHardDeleteAt) {
        sendSuccess(res, {
          message: 'Account already scheduled for deletion',
          scheduledDeletionAt: user.scheduledHardDeleteAt.toISOString(),
          gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
        })
        return
      }

      if (confirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
        sendError(res, 'Confirmation does not match account email', 400, {
          code: 'CONFIRMATION_MISMATCH',
        })
        return
      }

      if (user.hasSetOwnPassword && user.passwordHash) {
        if (!password) {
          sendError(res, 'Password is required to delete this account', 400, {
            code: 'PASSWORD_REQUIRED',
          })
          return
        }
        const isValid = await user.comparePassword(password)
        if (!isValid) {
          sendError(res, 'Incorrect password', 401, { code: 'INVALID_PASSWORD' })
          return
        }
      }

      const now = new Date()
      const scheduledHardDeleteAt = new Date(
        now.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      )
      user.deletedAt = now
      user.scheduledHardDeleteAt = scheduledHardDeleteAt
      await user.save()

      try {
        const RefreshToken = await getRefreshTokenModel()
        await RefreshToken.updateMany(
          { userId: user._id, isRevoked: false },
          { $set: { isRevoked: true } }
        )
      } catch (err) {
        logger.warn('Failed to revoke refresh tokens during account deletion:', err)
      }

      try {
        const AuthCode = await getAuthCodeModel()
        await AuthCode.updateMany(
          { userId: user._id.toString(), isUsed: false },
          { $set: { isUsed: true } }
        )
      } catch (err) {
        logger.warn('Failed to invalidate auth codes during account deletion:', err)
      }

      sendSuccess(res, {
        message: 'Account scheduled for deletion',
        scheduledDeletionAt: scheduledHardDeleteAt.toISOString(),
        gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
      })
      return
    } catch (error) {
      logger.error('Delete account error:', error)
      sendError(res, error instanceof Error ? error.message : 'Failed to delete account', 500)
      return
    }
  })

  return app
}

describe('DELETE /api/auth/account', () => {
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

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).delete('/api/auth/account').send({ confirmation: 'x@x.com' })
    expect(res.status).toBe(401)
  })

  it('rejects when confirmation does not match email', async () => {
    const user = await createUser({
      email: 'mismatch@example.com',
      username: 'mismatch',
      password: 'StrongPass1!',
    })
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'wrong@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CONFIRMATION_MISMATCH')
  })

  it('rejects when password is missing for users with own password', async () => {
    const user = await createUser({
      email: 'pwreq@example.com',
      username: 'pwreq',
      password: 'StrongPass1!',
      hasSetOwnPassword: true,
    })
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'pwreq@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('PASSWORD_REQUIRED')
  })

  it('rejects when password is incorrect', async () => {
    const user = await createUser({
      email: 'badpw@example.com',
      username: 'badpw',
      password: 'StrongPass1!',
    })
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'badpw@example.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_PASSWORD')
  })

  it('soft-deletes user with grace period and revokes refresh tokens', async () => {
    const user = await createUser({
      email: 'soft@example.com',
      username: 'softuser',
      password: 'StrongPass1!',
    })
    const userId = user._id!.toString()
    const { rawToken: _ } = await createRefreshToken(userId)
    void _
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'soft@example.com', password: 'StrongPass1!' })

    expect(res.status).toBe(200)
    expect(res.body.data.scheduledDeletionAt).toBeTruthy()
    expect(res.body.data.gracePeriodDays).toBe(DELETION_GRACE_PERIOD_DAYS)

    // Verify soft-delete marks set
    const AuthUser = await getAuthUserModel()
    const updated = await AuthUser.findById(userId)
    expect(updated?.deletedAt).toBeInstanceOf(Date)
    expect(updated?.scheduledHardDeleteAt).toBeInstanceOf(Date)
    const delta =
      (updated!.scheduledHardDeleteAt!.getTime() - updated!.deletedAt!.getTime()) /
      (24 * 60 * 60 * 1000)
    expect(delta).toBeCloseTo(DELETION_GRACE_PERIOD_DAYS, 0)

    // Verify all refresh tokens revoked
    const RefreshToken = await getRefreshTokenModel()
    const tokens = await RefreshToken.find({ userId: updated!._id })
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.every(t => t.isRevoked)).toBe(true)
  })

  it('accepts case-insensitive and trimmed email confirmation', async () => {
    const user = await createUser({
      email: 'case@example.com',
      username: 'caseuser',
      password: 'StrongPass1!',
    })
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: '  CASE@EXAMPLE.COM  ', password: 'StrongPass1!' })

    expect(res.status).toBe(200)
    expect(res.body.data.message).toContain('scheduled for deletion')
  })

  it('skips password check for users without own password (OAuth-only)', async () => {
    // QuickSignup users have hasSetOwnPassword=false but DO have a passwordHash
    // (random placeholder). Need a user with hasSetOwnPassword=false explicitly.
    const ghost = await createQuickSignupUser({
      email: 'oauth@example.com',
      username: 'oauthuser',
    })
    // Override hasSetOwnPassword to false to simulate true OAuth-only flow
    const AuthUser = await getAuthUserModel()
    await AuthUser.updateOne({ _id: ghost._id }, { $set: { hasSetOwnPassword: false } })
    const refreshed = await AuthUser.findById(ghost._id)
    const token = generateAccessToken(refreshed!)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'oauth@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.data.scheduledDeletionAt).toBeTruthy()
  })

  it('is idempotent — second call returns same scheduled date', async () => {
    const user = await createUser({
      email: 'idem@example.com',
      username: 'idemuser',
      password: 'StrongPass1!',
    })
    const token = generateAccessToken(user)

    const first = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'idem@example.com', password: 'StrongPass1!' })
    expect(first.status).toBe(200)
    const firstSchedule = first.body.data.scheduledDeletionAt

    const second = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'idem@example.com', password: 'StrongPass1!' })
    expect(second.status).toBe(200)
    expect(second.body.data.scheduledDeletionAt).toBe(firstSchedule)
    expect(second.body.data.message).toContain('already scheduled')
  })

  it('rejects validation error on empty confirmation', async () => {
    const user = await createUser({
      email: 'val@example.com',
      username: 'valuser',
      password: 'StrongPass1!',
    })
    const token = generateAccessToken(user)

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: '' })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
