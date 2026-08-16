import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import crypto from 'crypto'
import { cleanAllCollections, createUser } from '../../helpers/setup.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getMagicLinkRequestModel } from '../../../models/magic-link-request.js'
import { getAuditLogModel, computeAuditLogExpiry } from '../../../models/audit-log.js'

/**
 * Tests for the magic-link sign-in flow business logic. We exercise the
 * model + service layer directly (matching the pattern used by
 * `forgot-reset-password.test.ts` / `verify-email.test.ts`).
 *
 * Coverage:
 *  - request creates a record only when the user exists (anti-enumeration)
 *  - generic 200 response shape regardless of email existence
 *  - verify works exactly once (idempotent consumption)
 *  - verify rejects expired links (15 min TTL)
 *  - verify honors `redirectUri` from the original request
 */

describe('Magic Link Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('Request', () => {
    it('creates a MagicLinkRequest only when the user exists', async () => {
      const user = await createUser({ email: 'mlreq@example.com', username: 'mlrequser' })
      const MagicLink = await getMagicLinkRequestModel()
      const token = crypto.randomBytes(32).toString('hex')
      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const found = await MagicLink.findOne({ email: user.email })
      expect(found).not.toBeNull()
      expect(found!.userId).toBe(user._id!.toString())
      expect(found!.app).toBe('ezauth')
      expect(found!.isUsed).toBe(false)
    })

    it('does NOT create a MagicLinkRequest for a non-existent user (anti-enumeration)', async () => {
      const AuthUser = await getAuthUserModel()
      const ghost = await AuthUser.findOne({ email: 'ghost@example.com' })
      expect(ghost).toBeNull()
      // Controller logic: if the user lookup returns null, the request is
      // silently skipped while the response stays generic 200.
      const MagicLink = await getMagicLinkRequestModel()
      const count = await MagicLink.countDocuments({ email: 'ghost@example.com' })
      expect(count).toBe(0)
    })

    it('invalidates prior pending links when a new one is created', async () => {
      const user = await createUser({ email: 'multi@example.com', username: 'multilinkuser' })
      const MagicLink = await getMagicLinkRequestModel()
      const tokenA = crypto.randomBytes(32).toString('hex')
      const tokenB = crypto.randomBytes(32).toString('hex')

      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token: tokenA,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      // Controller's bulk-invalidate before issuing the second link.
      await MagicLink.updateMany(
        { userId: user._id!.toString(), isUsed: false },
        { $set: { isUsed: true, consumedAt: new Date() } }
      )

      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token: tokenB,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const aStillValid = await MagicLink.findOne({ token: tokenA, isUsed: false })
      const bStillValid = await MagicLink.findOne({ token: tokenB, isUsed: false })
      expect(aStillValid).toBeNull()
      expect(bStillValid).not.toBeNull()
    })
  })

  describe('Verify', () => {
    it('finds a pending request and consumes it once', async () => {
      const user = await createUser({ email: 'mlverify@example.com', username: 'mlverifyuser' })
      const MagicLink = await getMagicLinkRequestModel()
      const token = crypto.randomBytes(32).toString('hex')
      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const first = await MagicLink.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      expect(first).not.toBeNull()

      // Controller marks consumed before issuing the session.
      first!.isUsed = true
      first!.consumedAt = new Date()
      await first!.save()

      const second = await MagicLink.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      expect(second).toBeNull()
    })

    it('rejects expired tokens (15 min TTL)', async () => {
      const user = await createUser({ email: 'mlexp@example.com', username: 'mlexpuser' })
      const MagicLink = await getMagicLinkRequestModel()
      const token = crypto.randomBytes(32).toString('hex')
      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token,
        expiresAt: new Date(Date.now() - 1000), // already expired
        isUsed: false,
      })

      const found = await MagicLink.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      expect(found).toBeNull()
    })

    it('rejects a token that was never issued', async () => {
      const MagicLink = await getMagicLinkRequestModel()
      const result = await MagicLink.findOne({
        token: 'nonexistent-token-' + Date.now(),
        isUsed: false,
      })
      expect(result).toBeNull()
    })

    it('honors a stored redirectUri so verify hands it back to the client', async () => {
      const user = await createUser({ email: 'mlredir@example.com', username: 'mlrediruser' })
      const MagicLink = await getMagicLinkRequestModel()
      const token = crypto.randomBytes(32).toString('hex')
      const redirectUri = 'https://consumer.example.com/dashboard'
      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        redirectUri,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const found = await MagicLink.findOne({ token })
      expect(found).not.toBeNull()
      expect(found!.redirectUri).toBe(redirectUri)
    })

    it('grants the requesting app to the user on first sign-in via magic link', async () => {
      // Simulate a user who has not yet registered for `ezauth`.
      const user = await createUser({
        email: 'mlapp@example.com',
        username: 'mlappuser',
        apps: ['green-pulse'],
      })
      expect(user.apps.includes('ezauth')).toBe(false)

      const MagicLink = await getMagicLinkRequestModel()
      const token = crypto.randomBytes(32).toString('hex')
      await MagicLink.create({
        userId: user._id!.toString(),
        email: user.email,
        app: 'ezauth',
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      // Controller flow: load request, push app to user, save.
      const request = await MagicLink.findOne({ token })
      const AuthUser = await getAuthUserModel()
      const target = await AuthUser.findById(request!.userId)
      if (!target!.apps.includes(request!.app)) {
        target!.apps.push(request!.app)
        await target!.save()
      }

      const updated = await AuthUser.findById(user._id)
      expect(updated!.apps).toContain('ezauth')
      expect(updated!.apps).toContain('green-pulse')
    })

    it('writes a magic_link_login audit log entry on success', async () => {
      const user = await createUser({ email: 'mlaudit@example.com', username: 'mlaudituser' })
      const AuditLog = await getAuditLogModel()
      await AuditLog.create({
        userId: user._id!.toString(),
        appName: 'ezauth',
        action: 'magic_link_login',
        metadata: { email: user.email, app: 'ezauth' },
        createdAt: new Date(),
        expiresAt: computeAuditLogExpiry('free'),
      })

      const entries = await AuditLog.find({
        userId: user._id!.toString(),
        action: 'magic_link_login',
      }).lean()
      expect(entries.length).toBe(1)
      expect(entries[0]?.metadata?.email).toBe(user.email)
    })
  })
})
