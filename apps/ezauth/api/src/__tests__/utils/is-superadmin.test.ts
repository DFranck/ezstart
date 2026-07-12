/**
 * Unit tests for the `isSuperadmin` helper.
 *
 * Covers the three branches:
 *   1. `'system'` sentinel fast-path (no DB call, returns true)
 *   2. defensive `isValidObjectId` guard (returns false without crashing)
 *   3. real ObjectId path (fetches user + inspects globalRoles)
 *
 * Uses the standard mongo-memory-server harness so the ObjectId path is
 * exercised against a real Mongoose model (not a mock) — that way a
 * regression in the schema shape would surface here too.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { isSuperadmin } from '../../utils/is-superadmin.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { createUser, createAdminUser, cleanAllCollections } from '../helpers/setup.js'

describe('isSuperadmin', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe(`'system' sentinel`, () => {
    it(`returns true for the 'system' sentinel without touching the DB`, async () => {
      const AuthUser = await getAuthUserModel()
      const findByIdSpy = vi.spyOn(AuthUser, 'findById')

      const result = await isSuperadmin('system')

      expect(result).toBe(true)
      expect(findByIdSpy).not.toHaveBeenCalled()

      findByIdSpy.mockRestore()
    })
  })

  describe('real ObjectId path', () => {
    it(`returns true for a user with globalRoles: ['superadmin']`, async () => {
      const admin = await createAdminUser({
        email: 'super@example.com',
        username: 'superuser',
      })
      const result = await isSuperadmin(admin._id!.toString())
      expect(result).toBe(true)
    })

    it(`returns false for a user with globalRoles: [] (regular user)`, async () => {
      const user = await createUser({
        email: 'regular@example.com',
        username: 'regularuser',
        globalRoles: [],
      })
      const result = await isSuperadmin(user._id!.toString())
      expect(result).toBe(false)
    })

    it(`returns false for a user with no globalRoles set (undefined)`, async () => {
      // Explicitly pass no globalRoles to exercise the `?.includes` optional-chain
      // — matches the default state for freshly-created accounts.
      const user = await createUser({
        email: 'nouseroles@example.com',
        username: 'nouseroles',
      })
      const result = await isSuperadmin(user._id!.toString())
      expect(result).toBe(false)
    })

    it('returns false when the user is not found (valid ObjectId, no row)', async () => {
      // Any valid 24-char hex ObjectId that has no matching document.
      const ghostId = '507f1f77bcf86cd799439011'
      const result = await isSuperadmin(ghostId)
      expect(result).toBe(false)
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
        const AuthUser = await getAuthUserModel()
        const findByIdSpy = vi.spyOn(AuthUser, 'findById')

        await expect(isSuperadmin(badId)).resolves.toBe(false)
        expect(findByIdSpy).not.toHaveBeenCalled()

        findByIdSpy.mockRestore()
      }
    )
  })
})
