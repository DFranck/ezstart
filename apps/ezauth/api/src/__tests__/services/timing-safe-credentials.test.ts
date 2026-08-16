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
import { AuthService } from '../../services/auth.service.js'
import { createUser, cleanAllCollections } from '../helpers/setup.js'

// @node-rs/bcrypt is a CJS-style napi binding whose namespace exports aren't
// configurable on the ESM module namespace object, so `vi.spyOn(ns, 'compare')`
// throws `Cannot redefine property`. We use `vi.mock` to replace the module
// with a thin wrapper that delegates to the real implementation while exposing
// a vi.fn() spy on `compare`. Tests then assert via that exposed spy.
vi.mock('@node-rs/bcrypt', async () => {
  const actual = await vi.importActual<typeof import('@node-rs/bcrypt')>('@node-rs/bcrypt')
  return {
    ...actual,
    compare: vi.fn(actual.compare),
  }
})

// Imported AFTER vi.mock so the mocked module is bound to `bcrypt`.
import * as bcrypt from '@node-rs/bcrypt'

describe('MED-2 — timing-safe credential validation', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  // `compare` is replaced by a `vi.fn(actual.compare)` in the `vi.mock` factory
  // above. `vi.mocked` types it as a Mock so `mock.calls` / `mockClear()` are
  // typed without leaking `any` or unsafe casts.
  const compareMock = vi.mocked(bcrypt.compare)

  beforeEach(async () => {
    await cleanAllCollections()
    compareMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateCredentials', () => {
    it('runs bcrypt.compare even when the identifier does NOT exist', async () => {
      await expect(
        AuthService.validateCredentials({
          email: 'ghost-timing@example.com',
          password: 'whatever-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      // The dummy compare on the miss path must have fired (>= 1 call).
      expect(compareMock).toHaveBeenCalled()
      // It must have been called with the candidate password against a
      // bcrypt hash (the dummy hash), proving CPU was burned on the miss.
      const [submittedPassword, hash] = compareMock.mock.calls[0] as [string, string]
      expect(submittedPassword).toBe('whatever-password')
      expect(hash.startsWith('$2')).toBe(true)
    })

    it('runs bcrypt.compare when the user DOES exist (hit path — control)', async () => {
      await createUser({
        email: 'real-timing@example.com',
        username: 'realtiming',
        password: 'CorrectHorseBatteryStaple9',
      })

      await expect(
        AuthService.validateCredentials({
          email: 'real-timing@example.com',
          password: 'wrong-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(compareMock).toHaveBeenCalled()
    })
  })

  describe('loginWithToken', () => {
    it('runs bcrypt.compare even when the identifier does NOT exist', async () => {
      await expect(
        AuthService.loginWithToken({
          email: 'ghost-token-timing@example.com',
          password: 'whatever-password',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(compareMock).toHaveBeenCalled()
      const [submittedPassword, hash] = compareMock.mock.calls[0] as [string, string]
      expect(submittedPassword).toBe('whatever-password')
      expect(hash.startsWith('$2')).toBe(true)
    })
  })
})
