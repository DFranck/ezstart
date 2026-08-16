/**
 * Tests for the `attachUserToRequest` closure built by `createAttachUser`.
 *
 * Focus: the `'system'` sentinel fast-path (S2S service key with no
 * AuthUser doc) and the defensive `isValidObjectId` guard (non-ObjectId
 * userIds must return false rather than crashing Mongoose with a
 * CastError).
 */

import { describe, expect, it, vi } from 'vitest'
import type { Request } from 'express'
import { createAttachUser } from '../../server/_internal/attach-user.js'
import type {
  AuthMiddlewareModel,
  AuthUserDoc,
} from '../../server/_internal/auth-middleware-types.js'

function makeUser(overrides: Partial<AuthUserDoc> = {}): AuthUserDoc {
  return {
    _id: '507f1f77bcf86cd799439011',
    email: 'alice@example.com',
    username: 'alice',
    isVerified: true,
    apps: ['ezauth'],
    globalRoles: [],
    appRoles: {},
    permissions: [],
    features: [],
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Build a mock Mongoose-shaped AuthUser model. Records whether `findById`
 * was called so tests can assert the `'system'` fast-path skips DB
 * entirely.
 */
function buildAuthUserModel(user: AuthUserDoc | null): {
  model: AuthMiddlewareModel<AuthUserDoc>
  findById: ReturnType<typeof vi.fn>
} {
  const findById = vi.fn(() => ({
    select: vi.fn(() => ({
      lean: vi.fn(async () => user),
    })),
  }))
  const model: AuthMiddlewareModel<AuthUserDoc> = {
    findById: findById as unknown as AuthMiddlewareModel<AuthUserDoc>['findById'],
    findOne: vi.fn(() => ({ lean: vi.fn(async () => null) })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
    aggregate: vi.fn(async () => []),
  }
  return { model, findById }
}

function makeReq(): Request {
  return {} as Request
}

describe('createAttachUser', () => {
  describe(`'system' sentinel fast-path`, () => {
    it(`stamps a synthetic superadmin user for userId === 'system' without hitting the DB`, async () => {
      const { model, findById } = buildAuthUserModel(makeUser())
      const attach = createAttachUser({ getAuthUserModel: vi.fn(async () => model) })
      const req = makeReq()

      const result = await attach(req, 'system')

      expect(result).toBe(true)
      expect(findById).not.toHaveBeenCalled()
      const stamped = req as Request & { userId?: string }
      expect(stamped.userId).toBe('system')
      expect(req.user?._id).toBe('system')
      expect(req.user?.globalRoles).toContain('superadmin')
      expect(req.user?.email).toBe('system@internal')
      expect(req.user?.username).toBe('system')
    })

    it(`does not fire onUserAttached for the 'system' sentinel`, async () => {
      const { model } = buildAuthUserModel(makeUser())
      const onUserAttached = vi.fn()
      const attach = createAttachUser({
        getAuthUserModel: vi.fn(async () => model),
        onUserAttached,
      })

      await attach(makeReq(), 'system')

      // The synthetic user is not a real DB record — presence tracking would be
      // meaningless. Fast-path skips the hook.
      expect(onUserAttached).not.toHaveBeenCalled()
    })
  })

  describe('valid ObjectId path (regression coverage)', () => {
    it('attaches a real user found in the DB', async () => {
      const user = makeUser({ _id: '507f1f77bcf86cd799439011' })
      const { model, findById } = buildAuthUserModel(user)
      const attach = createAttachUser({ getAuthUserModel: vi.fn(async () => model) })
      const req = makeReq()

      const result = await attach(req, '507f1f77bcf86cd799439011')

      expect(result).toBe(true)
      expect(findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      const stamped = req as Request & { userId?: string }
      expect(stamped.userId).toBe('507f1f77bcf86cd799439011')
      expect(req.user?.email).toBe('alice@example.com')
    })

    it('returns false when the user is not found (valid ObjectId, no row)', async () => {
      const { model } = buildAuthUserModel(null)
      const attach = createAttachUser({ getAuthUserModel: vi.fn(async () => model) })

      const result = await attach(makeReq(), '507f1f77bcf86cd799439011')

      expect(result).toBe(false)
    })

    it('returns false when the user is soft-deleted (deletedAt set)', async () => {
      const deleted = makeUser({ deletedAt: new Date() })
      const { model } = buildAuthUserModel(deleted)
      const attach = createAttachUser({ getAuthUserModel: vi.fn(async () => model) })

      const result = await attach(makeReq(), '507f1f77bcf86cd799439011')

      expect(result).toBe(false)
    })

    it('fires onUserAttached with the resolved userId for real users', async () => {
      const user = makeUser({ _id: '507f1f77bcf86cd799439011' })
      const { model } = buildAuthUserModel(user)
      const onUserAttached = vi.fn()
      const attach = createAttachUser({
        getAuthUserModel: vi.fn(async () => model),
        onUserAttached,
      })

      await attach(makeReq(), '507f1f77bcf86cd799439011')

      expect(onUserAttached).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    })
  })

  describe('defensive isValidObjectId guard', () => {
    it.each([
      ['non-hex string', 'foo'],
      ['numeric string', '123'],
      ['empty string', ''],
      ['short hex', 'abcd'],
    ])(
      `returns false without hitting the DB or throwing when userId is %s`,
      async (_label, badId) => {
        const { model, findById } = buildAuthUserModel(makeUser())
        const attach = createAttachUser({ getAuthUserModel: vi.fn(async () => model) })

        // Must not throw a Mongoose CastError — must return false cleanly.
        await expect(attach(makeReq(), badId)).resolves.toBe(false)
        expect(findById).not.toHaveBeenCalled()
      }
    )
  })
})
