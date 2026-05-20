/**
 * MED-2 (Wave D Lot 3A) — anti account-enumeration via login timing.
 *
 * `validateCredentials` and `loginWithToken` MUST run a (throwaway) bcrypt
 * compare even when the identifier does not exist, so the miss path costs the
 * same wall-clock time as the hit path. Otherwise an attacker can enumerate
 * which emails/usernames are registered by measuring the response latency
 * (existing account = slow bcrypt; non-existent = instant).
 *
 * We assert the BEHAVIOUR (bcrypt.compare is invoked on the miss path) rather
 * than wall-clock timing, which would be flaky in CI.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import bcrypt from 'bcryptjs'
import { AuthService } from '../../services/auth.service.js'
import { createUser, cleanAllCollections } from '../helpers/setup.js'

describe('MED-2 — timing-safe credential validation', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateCredentials', () => {
    it('runs bcrypt.compare even when the identifier does NOT exist', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compare')

      await expect(
        AuthService.validateCredentials({
          email: 'ghost-timing@example.com',
          password: 'whatever-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      // The dummy compare on the miss path must have fired (>= 1 call).
      expect(compareSpy).toHaveBeenCalled()
      // It must have been called with the candidate password against a
      // bcrypt hash (the dummy hash), proving CPU was burned on the miss.
      const [submittedPassword, hash] = compareSpy.mock.calls[0] as [string, string]
      expect(submittedPassword).toBe('whatever-password')
      expect(hash.startsWith('$2')).toBe(true)
    })

    it('runs bcrypt.compare when the user DOES exist (hit path — control)', async () => {
      await createUser({
        email: 'real-timing@example.com',
        username: 'realtiming',
        password: 'CorrectHorseBatteryStaple9',
      })
      const compareSpy = vi.spyOn(bcrypt, 'compare')

      await expect(
        AuthService.validateCredentials({
          email: 'real-timing@example.com',
          password: 'wrong-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(compareSpy).toHaveBeenCalled()
    })
  })

  describe('loginWithToken', () => {
    it('runs bcrypt.compare even when the identifier does NOT exist', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compare')

      await expect(
        AuthService.loginWithToken({
          email: 'ghost-token-timing@example.com',
          password: 'whatever-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(compareSpy).toHaveBeenCalled()
      const [submittedPassword, hash] = compareSpy.mock.calls[0] as [string, string]
      expect(submittedPassword).toBe('whatever-password')
      expect(hash.startsWith('$2')).toBe(true)
    })
  })
})
