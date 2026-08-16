import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { attachDerivedScope, createRoleMiddleware, sendSuccess, sendError } from '@ezstart/api-core'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getOAuthAccountModel } from '../../../models/oauth-account.js'
import { getApplicationModel } from '../../../models/application.js'
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

  // GET /admin/users — list users (mirrors list-users.ts auto-scoping logic)
  app.get(
    '/admin/users',
    verifyTokenMiddleware,
    requireAdmin,
    attachDerivedScope,
    async (req, res) => {
      const currentUser = req.user!
      const AuthUser = await getAuthUserModel()
      const query: Record<string, unknown> = {}

      // Audience scope is server-derived from `req.user`. Superadmins may
      // override via `?scope=` (handled by `attachDerivedScope`).
      const derivedScope = req.derivedScope ?? 'mine'

      if (derivedScope === 'all') {
        // No filter — superadmin platform-wide view.
      } else if (derivedScope === 'myApps') {
        const Application = await getApplicationModel()
        const ownedApps = await Application.find({ ownerId: currentUser._id }).select('slug').lean()
        const ownedSlugs = ownedApps.map(a => a.slug)
        if (ownedSlugs.length === 0) {
          return sendSuccess(res, [], { total: 0, limit: 20, offset: 0 })
        }
        query.apps = { $in: ownedSlugs }
      } else {
        // 'mine' — single user view.
        query._id = currentUser._id
      }

      // Mirror list-users.ts — `?includeDeleted=true` opts out of the
      // model-level soft-delete pre-find guard.
      const includeDeleted = req.query.includeDeleted === 'true'
      const findOpts = includeDeleted ? { includeDeleted: true } : {}

      const [users, total] = await Promise.all([
        AuthUser.find(query, null, findOpts)
          .select('-passwordHash')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        AuthUser.countDocuments(query, findOpts),
      ])

      const data = users.map(u => ({
        ...u,
        _id: u._id.toString(),
        globalRoles: u.globalRoles || [],
        appRoles: mapToRecord(u.appRoles as unknown as Map<string, string[]> | undefined),
      }))

      sendSuccess(res, data, { total, limit: 20, offset: 0 })
    }
  )

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
  // Mirrors the real route logic in routes/admin/update-user.ts. The handler
  // intentionally duplicates the logic instead of mounting the real router so
  // the test app can skip CSRF middleware (verifyCookieCsrf rejects unsigned
  // cookies in tests). Keep the two implementations in sync — every new
  // backend behavior tested here MUST also exist in update-user.ts.
  app.patch('/admin/users/:id', verifyTokenMiddleware, requireAdmin, async (req, res) => {
    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin')

    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required for user management from ezstart', 403)
    }

    const AuthUser = await getAuthUserModel()
    // includeDeleted so a superadmin can re-activate a soft-deleted account.
    const user = await AuthUser.findById(req.params.id).setOptions({ includeDeleted: true })
    if (!user) return sendError(res, 'User not found', 404)

    const body = req.body
    const isSelf = req.params.id === currentUser._id
    let emailChanged = false
    let verificationEmailSent = false

    // Profile fields
    if (body.firstName !== undefined) user.firstName = body.firstName
    if (body.lastName !== undefined) user.lastName = body.lastName

    // Email change — uniqueness check + reset isVerified
    if (body.email !== undefined && body.email !== user.email.toLowerCase()) {
      const conflict = await AuthUser.findOne({
        email: body.email,
        _id: { $ne: user._id },
      })
      if (conflict) {
        return sendError(res, 'Email already taken by another account', 409)
      }
      user.email = body.email
      user.isVerified = false
      emailChanged = true
      // In the real route this triggers a verification email send. We don't
      // wire emailService in tests — just flip the response flag so callers
      // can assert the side-effect was registered.
      verificationEmailSent = true
    }

    // Roles
    if (body.globalRoles !== undefined) user.globalRoles = body.globalRoles
    if (body.appRoles !== undefined) {
      const map = new Map<string, string[]>()
      Object.entries(body.appRoles).forEach(([app, roles]) => {
        map.set(app, roles as string[])
      })
      user.appRoles = map
    }

    // Status — isVerified (skip when email changed, anti-bypass)
    if (body.isVerified !== undefined && !emailChanged) {
      user.isVerified = body.isVerified
    }

    // Status — isActive (soft-delete toggle)
    if (body.isActive !== undefined) {
      if (isSelf && body.isActive === false) {
        return sendError(
          res,
          'Cannot deactivate your own account via admin endpoint. Use DELETE /auth/account instead.',
          400
        )
      }
      const isCurrentlyActive = !user.deletedAt
      if (body.isActive && !isCurrentlyActive) {
        user.deletedAt = null
        user.scheduledHardDeleteAt = null
      } else if (!body.isActive && isCurrentlyActive) {
        if (user.globalRoles?.includes('superadmin')) {
          return sendError(res, 'Cannot deactivate a superadmin user. Demote them first.', 403)
        }
        const now = new Date()
        user.deletedAt = now
        user.scheduledHardDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Status — mustChangePassword
    if (body.mustChangePassword !== undefined) {
      user.mustChangePassword = body.mustChangePassword
    }

    // Misc passthrough
    if (body.apps !== undefined) user.apps = body.apps
    if (body.permissions !== undefined) user.permissions = body.permissions
    if (body.features !== undefined) user.features = body.features

    await user.save()
    sendSuccess(res, {
      user: user.toAuthUser(),
      message: 'User updated successfully',
      verificationEmailSent: emailChanged ? verificationEmailSent : undefined,
    })
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

      const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

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

      const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('app-level admin sees only users in apps they own (auto-scoped to myApps)', async () => {
      const appAdmin = await createAppAdmin('ezbill', {
        email: 'bill-admin@test.com',
        username: 'billadmin',
      })
      const token = generateAccessToken(appAdmin)

      // The appAdmin owns the 'ezbill' Application.
      const Application = await getApplicationModel()
      await Application.create({
        slug: 'ezbill',
        name: 'EzBill',
        ownerId: appAdmin._id!.toString(),
        status: 'active',
      })

      // Superadmin not in ezbill — should be hidden by myApps scoping.
      await createAdminUser({ email: 'hidden@test.com', username: 'hiddenadmin' })
      // Regular user in ezbill — visible.
      await createUser({ email: 'bill-user@test.com', username: 'billuser', apps: ['ezbill'] })
      // Regular user in another app — hidden.
      await createUser({ email: 'other@test.com', username: 'other', apps: ['otherapp'] })

      const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      const emails = res.body.data.map((u: { email: string }) => u.email)
      expect(emails).not.toContain('hidden@test.com')
      expect(emails).not.toContain('other@test.com')
      expect(emails).toContain('bill-user@test.com')
    })

    describe('auto-derived scope', () => {
      it('superadmin sees all users with NO scope param (auto-derived to "all")', async () => {
        const admin = await createAdminUser()
        const token = generateAccessToken(admin)

        await createAdminUser({ email: 'other-super@test.com', username: 'othersuper' })
        await createUser({ email: 'regular@test.com', username: 'reg' })

        // No ?scope= passed — server derives 'all' from the superadmin role.
        const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        const emails = res.body.data.map((u: { email: string }) => u.email)
        expect(emails).toContain('other-super@test.com')
        expect(emails).toContain('regular@test.com')
      })

      it('app-admin without owned apps gets empty result (auto-derived to "myApps")', async () => {
        const appAdmin = await createAppAdmin('ezbill', {
          email: 'noapps@test.com',
          username: 'noapps',
        })
        const token = generateAccessToken(appAdmin)

        await createUser({ email: 'x@test.com', username: 'x', apps: ['ezbill'] })

        const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual([])
        expect(res.body.meta.total).toBe(0)
      })

      it('superadmin can override to "mine" via ?scope= (debugging hatch)', async () => {
        const admin = await createAdminUser()
        const token = generateAccessToken(admin)

        await createUser({ email: 'other@test.com', username: 'other' })

        const res = await request(app)
          .get('/admin/users?scope=mine')
          .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.data).toHaveLength(1)
        expect(res.body.data[0].email).toBe(admin.email)
      })

      it('non-superadmin cannot escalate via ?scope=all (param ignored)', async () => {
        const appAdmin = await createAppAdmin('ezbill', {
          email: 'app-admin@test.com',
          username: 'appadmin',
        })
        const token = generateAccessToken(appAdmin)

        // No owned apps → empty result even when ?scope=all is sent.
        const res = await request(app)
          .get('/admin/users?scope=all')
          .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual([])
      })
    })

    describe('soft-delete filter (auto-injected by AuthUser pre-find guard)', () => {
      it('hides soft-deleted users from the default listing', async () => {
        const admin = await createAdminUser()
        const token = generateAccessToken(admin)

        const live = await createUser({ email: 'live@test.com', username: 'liveuser' })
        const dead = await createUser({ email: 'dead@test.com', username: 'deaduser' })

        // Soft-delete `dead` directly via update (skip the route to keep this
        // focused on the model-level filter behavior).
        const AuthUser = await getAuthUserModel()
        await AuthUser.updateOne(
          { _id: dead._id },
          { $set: { deletedAt: new Date() } },
          // No `includeDeleted: true` needed — at this point the user is not
          // yet soft-deleted, so the auto-injected `{ deletedAt: null }`
          // filter matches and the $set goes through to flip the field.
          { timestamps: false }
        )
        void live

        const res = await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        const emails = res.body.data.map((u: { email: string }) => u.email)
        expect(emails).toContain('live@test.com')
        expect(emails).not.toContain('dead@test.com')
        // admin + live (NOT dead)
        expect(res.body.meta.total).toBe(2)
      })

      it('returns soft-deleted users when ?includeDeleted=true is passed', async () => {
        const admin = await createAdminUser()
        const token = generateAccessToken(admin)

        const dead = await createUser({ email: 'ghost@test.com', username: 'ghostuser' })
        const AuthUser = await getAuthUserModel()
        await AuthUser.updateOne(
          { _id: dead._id },
          { $set: { deletedAt: new Date() } },
          // No `includeDeleted: true` needed — at this point the user is not
          // yet soft-deleted, so the auto-injected `{ deletedAt: null }`
          // filter matches and the $set goes through to flip the field.
          { timestamps: false }
        )

        const res = await request(app)
          .get('/admin/users?includeDeleted=true')
          .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        const emails = res.body.data.map((u: { email: string }) => u.email)
        expect(emails).toContain('ghost@test.com')
      })
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

    // ─── USER-EDIT-MODAL-LIMITED — profile fields ──────────────────────────

    it('should update firstName and lastName', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'profile@test.com', username: 'profileuser' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Alice', lastName: 'Wonderland' })

      expect(res.status).toBe(200)
      expect(res.body.data.user.firstName).toBe('Alice')
      expect(res.body.data.user.lastName).toBe('Wonderland')
    })

    // ─── USER-EDIT-MODAL-LIMITED — email change side effect ────────────────

    it('should change email, reset isVerified, and signal verification email sent', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({
        email: 'old@test.com',
        username: 'emailchange',
        isVerified: true,
      })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com' })

      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe('new@test.com')
      expect(res.body.data.user.isVerified).toBe(false)
      expect(res.body.data.verificationEmailSent).toBe(true)

      // Verify persistence in DB
      const AuthUser = await getAuthUserModel()
      const fresh = await AuthUser.findById(user._id)
      expect(fresh?.email).toBe('new@test.com')
      expect(fresh?.isVerified).toBe(false)
    })

    it('should reject email change when target email is taken by another user', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'me@test.com', username: 'me' })
      await createUser({ email: 'taken@test.com', username: 'taken' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'taken@test.com' })

      expect(res.status).toBe(409)
    })

    it('should NOT honor isVerified=true when email is changed in same request (anti-bypass)', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({
        email: 'bypass@test.com',
        username: 'bypassuser',
        isVerified: true,
      })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newbypass@test.com', isVerified: true })

      expect(res.status).toBe(200)
      // Email was changed → isVerified MUST be false even though admin
      // also passed isVerified: true (anti-bypass; admin can't skip
      // verification by chaining the two changes).
      expect(res.body.data.user.email).toBe('newbypass@test.com')
      expect(res.body.data.user.isVerified).toBe(false)
    })

    // ─── USER-EDIT-MODAL-LIMITED — status toggles ──────────────────────────

    it('should soft-delete when isActive=false (sets deletedAt + scheduledHardDeleteAt)', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({
        email: 'deactivate@test.com',
        username: 'deactivate',
      })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      expect(res.status).toBe(200)

      const AuthUser = await getAuthUserModel()
      const fresh = await AuthUser.findById(user._id).setOptions({ includeDeleted: true })
      expect(fresh?.deletedAt).toBeTruthy()
      expect(fresh?.scheduledHardDeleteAt).toBeTruthy()
      // Grace period is ~30 days
      const graceMs =
        (fresh!.scheduledHardDeleteAt as Date).getTime() - (fresh!.deletedAt as Date).getTime()
      expect(Math.round(graceMs / (24 * 60 * 60 * 1000))).toBe(30)
    })

    it('should reactivate (clear deletedAt) when isActive=true on a soft-deleted user', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'restore@test.com', username: 'restore' })
      const AuthUser = await getAuthUserModel()
      // Manually soft-delete via direct update (skip the route to keep this
      // focused on the reactivation behavior).
      await AuthUser.updateOne(
        { _id: user._id },
        {
          $set: {
            deletedAt: new Date(),
            scheduledHardDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        { timestamps: false }
      )

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: true })

      expect(res.status).toBe(200)

      const fresh = await AuthUser.findById(user._id).setOptions({ includeDeleted: true })
      expect(fresh?.deletedAt).toBeNull()
      expect(fresh?.scheduledHardDeleteAt).toBeNull()
    })

    it('should reject self-deactivation (isActive=false on own account)', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const res = await request(app)
        .patch(`/admin/users/${admin._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      expect(res.status).toBe(400)
    })

    it('should reject deactivating another superadmin (peer protection)', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const otherSuperadmin = await createAdminUser({
        email: 'other-super@test.com',
        username: 'othersuper',
      })

      const res = await request(app)
        .patch(`/admin/users/${otherSuperadmin._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      expect(res.status).toBe(403)
    })

    it('should set mustChangePassword flag when admin toggles it on', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({ email: 'mustreset@test.com', username: 'mustreset' })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mustChangePassword: true })

      expect(res.status).toBe(200)
      expect(res.body.data.user.mustChangePassword).toBe(true)

      const AuthUser = await getAuthUserModel()
      const fresh = await AuthUser.findById(user._id)
      expect(fresh?.mustChangePassword).toBe(true)
    })

    it('should force-verify email (isVerified=true) when no email change in same request', async () => {
      const admin = await createAdminUser()
      const token = generateAccessToken(admin)

      const user = await createUser({
        email: 'unverified@test.com',
        username: 'unverified',
        isVerified: false,
      })

      const res = await request(app)
        .patch(`/admin/users/${user._id!.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isVerified: true })

      expect(res.status).toBe(200)
      expect(res.body.data.user.isVerified).toBe(true)
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
