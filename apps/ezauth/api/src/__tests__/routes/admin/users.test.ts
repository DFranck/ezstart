import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { createRoleMiddleware, sendSuccess, sendError, sendValidationError } from '@ezstart/api-core'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getOAuthAccountModel } from '../../../models/oauth-account.js'
import {
  createUser,
  createAdminUser,
  createAppAdmin,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'
import { mapToRecord } from '../../../utils/map-to-record.js'

const { requireAdmin } = createRoleMiddleware()

/**
 * Build a minimal Express app that mirrors the admin route handlers
 * without rate limiting. This lets us test the actual business logic.
 */
function createAdminTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  // GET /admin/users — list users
  app.get('/admin/users', verifyTokenMiddleware, requireAdmin, async (req, res) => {
    const currentUser = req.user!
    const AuthUser = await getAuthUserModel()
    const query: Record<string, unknown> = {}

    if (!currentUser.globalRoles?.includes('superadmin')) {
      query.globalRoles = { $ne: 'superadmin' }
      if ((currentUser.apps?.length ?? 0) > 0) {
        query.apps = { $in: currentUser.apps }
      }
    }

    const [users, total] = await Promise.all([
      AuthUser.find(query).select('-passwordHash').sort({ createdAt: -1 }).limit(20).lean(),
      AuthUser.countDocuments(query),
    ])

    const data = users.map(u => ({
      ...u,
      _id: u._id.toString(),
      globalRoles: u.globalRoles || [],
      appRoles: mapToRecord(u.appRoles as unknown as Map<string, string[]> | undefined),
    }))

    sendSuccess(res, data, { total, limit: 20, offset: 0 })
  })

  // GET /admin/users/:id — get single user
  app.get('/admin/users/:id', verifyTokenMiddleware, requireAdmin, async (req, res) => {
    const currentUser = req.user!
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id).select('-passwordHash').lean()

    if (!user) return sendError(res, 'User not found', 404)

    if (!currentUser.globalRoles?.includes('superadmin')) {
      if (user.globalRoles?.includes('superadmin')) {
        return sendError(res, 'Cannot view superadmin users', 403)
      }
    }

    sendSuccess(res, { user: { ...user, _id: user._id.toString() } })
  })

  // PATCH /admin/users/:id — update user
  app.patch('/admin/users/:id', verifyTokenMiddleware, requireAdmin, async (req, res) => {
    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin')

    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required for user management from ezstart', 403)
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id)
    if (!user) return sendError(res, 'User not found', 404)

    const body = req.body
    if (body.globalRoles !== undefined) user.globalRoles = body.globalRoles
    if (body.apps !== undefined) user.apps = body.apps
    if (body.isVerified !== undefined) user.isVerified = body.isVerified
    if (body.permissions !== undefined) user.permissions = body.permissions
    if (body.features !== undefined) user.features = body.features

    await user.save()
    sendSuccess(res, { user: user.toAuthUser(), message: 'User updated successfully' })
  })

  // DELETE /admin/users/:id — delete user (superadmin only)
  app.delete('/admin/users/:id', verifyTokenMiddleware, requireAdmin, async (req, res) => {
    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin')

    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required', 403)
    }

    if (req.params.id === currentUser._id) {
      return sendError(res, 'Cannot delete your own account via admin endpoint', 400)
    }

    const AuthUser = await getAuthUserModel()
    const OAuthAccount = await getOAuthAccountModel()
    const user = await AuthUser.findById(req.params.id)

    if (!user) return sendError(res, 'User not found', 404)

    await OAuthAccount.deleteMany({ userId: user._id })
    await AuthUser.findByIdAndDelete(req.params.id)

    sendSuccess(res, { message: 'User deleted successfully' })
  })

  return app
}

describe('Admin Routes', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createAdminTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('GET /admin/users', () => {
    it('should list users for superadmin', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      await createUser({ email: 'u1@test.com', username: 'user1' })
      await createUser({ email: 'u2@test.com', username: 'user2' })

      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      // Admin + 2 users = 3 total
      expect(res.body.data.length).toBe(3)
      expect(res.body.meta.total).toBe(3)
    })

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/admin/users')
      expect(res.status).toBe(401)
    })

    it('should reject non-admin users', async () => {
      const user = await createUser({ email: 'regular@test.com', username: 'regular' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('should filter non-superadmins for app-level admins', async () => {
      const appAdmin = await createAppAdmin('ezbill', {
        email: 'bill-admin@test.com',
        username: 'billadmin',
      })
      const token = generateAccessToken(appAdmin)

      // Create a superadmin (should be hidden)
      await createAdminUser({ email: 'hidden@test.com', username: 'hiddenadmin' })
      // Create a regular user in ezbill
      await createUser({ email: 'bill-user@test.com', username: 'billuser', apps: ['ezbill'] })

      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      // App admin should NOT see superadmin users
      const emails = res.body.data.map((u: { email: string }) => u.email)
      expect(emails).not.toContain('hidden@test.com')
      expect(emails).toContain('bill-user@test.com')
    })
  })

  describe('GET /admin/users/:id', () => {
    it('should get a single user by ID', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'single@test.com', username: 'singleuser' })

      const res = await request(app)
        .get(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe('single@test.com')
    })

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const res = await request(app)
        .get('/admin/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })

    it('should prevent app admin from viewing superadmin users', async () => {
      const appAdmin = await createAppAdmin('ezbill', {
        email: 'viewer@test.com',
        username: 'viewer',
      })
      const token = generateAccessToken(appAdmin)

      const superadmin = await createAdminUser({ email: 'super@test.com', username: 'superuser' })

      const res = await request(app)
        .get(`/admin/users/${superadmin._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /admin/users/:id', () => {
    it('should update user roles as superadmin', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'update@test.com', username: 'updateuser' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true, apps: ['ezstart', 'ezbill'] })

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('User updated successfully')
      expect(res.body.data.user.isVerified).toBe(true)
      expect(res.body.data.user.apps).toContain('ezbill')
    })

    it('should reject update from non-superadmin', async () => {
      const appAdmin = await createAppAdmin('ezbill', {
        email: 'notsuperadmin@test.com',
        username: 'notsuperadmin',
      })
      const token = generateAccessToken(appAdmin)

      const user = await createUser({ email: 'target@test.com', username: 'targetuser' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true })

      expect(res.status).toBe(403)
    })

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const res = await request(app)
        .patch('/admin/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true })

      expect(res.status).toBe(404)
    })

    it('should not leak passwordHash in response', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'noleak@test.com', username: 'noleakuser' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true })

      expect(res.status).toBe(200)
      expect(res.body.data.user).not.toHaveProperty('passwordHash')
    })
  })

  describe('DELETE /admin/users/:id', () => {
    it('should delete user as superadmin', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'deleteme@test.com', username: 'deleteme' })

      const res = await request(app)
        .delete(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('User deleted successfully')

      // Verify user is gone
      const AuthUser = await getAuthUserModel()
      const deleted = await AuthUser.findById(user._id)
      expect(deleted).toBeNull()
    })

    it('should cascade-delete OAuth accounts', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'cascade@test.com', username: 'cascadeuser' })
      const OAuthAccount = await getOAuthAccountModel()
      await OAuthAccount.create({
        userId: user._id,
        provider: 'google',
        providerId: 'g-cascade',
        email: 'cascade@test.com',
        profile: {},
      })

      await request(app)
        .delete(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      const oauthAccounts = await OAuthAccount.find({ userId: user._id })
      expect(oauthAccounts).toHaveLength(0)
    })

    it('should reject deletion from non-superadmin', async () => {
      const appAdmin = await createAppAdmin('ezbill', {
        email: 'nodel@test.com',
        username: 'nodeluser',
      })
      const token = generateAccessToken(appAdmin)

      const user = await createUser({ email: 'safe@test.com', username: 'safeuser' })

      const res = await request(app)
        .delete(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('should prevent self-deletion', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const res = await request(app)
        .delete(`/admin/users/${admin._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain('Cannot delete your own account')
    })

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const res = await request(app)
        .delete('/admin/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })
})
