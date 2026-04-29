/**
 * Account-level brute force lockout tests.
 *
 * Covers the policy enforced by `AuthService.validateCredentials` and exposed
 * by the login routes (cf. `config/lockout.ts`):
 *
 *   - {@link MAX_FAILED_LOGIN_ATTEMPTS} consecutive failures lock the account
 *     for {@link LOCKOUT_DURATION_MS}.
 *   - The next attempt while locked throws {@link AccountLockedError}, which
 *     the route layer maps to HTTP 423 with `code: 'ACCOUNT_LOCKED'`.
 *   - A successful login resets the counter and clears the lock.
 *   - The lockout window expires (next attempt after `lockedUntil` succeeds
 *     with the right password).
 *   - The sliding window {@link SLIDING_WINDOW_MS} resets the counter when
 *     the previous failure is older than the window.
 *   - Non-existent identifiers do NOT count toward any account counter (they
 *     can't — there's no account to count against).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService, AccountLockedError } from '../../../services/auth.service.js'
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  SLIDING_WINDOW_MS,
} from '../../../config/lockout.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getAuditLogModel } from '../../../models/audit-log.js'
import { cleanAllCollections, createUser } from '../../helpers/setup.js'

const EMAIL = 'lockout@example.com'
const USERNAME = 'lockoutuser'
const PASSWORD = 'CorrectPassword123'
const WRONG_PASSWORD = 'WrongPassword999'

async function attemptLogin(
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: Error }> {
  try {
    const userId = await AuthService.validateCredentials({
      email: EMAIL,
      password,
      app: 'ezstart',
    })
    return { ok: true, userId }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}

describe('Login — account-level brute force lockout', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    await createUser({ email: EMAIL, username: USERNAME, password: PASSWORD })
  })

  it('locks the account after MAX_FAILED_LOGIN_ATTEMPTS wrong-password attempts', async () => {
    // Burn N-1 attempts — they all return generic 'Invalid credentials'.
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS - 1; i++) {
      const res = await attemptLogin(WRONG_PASSWORD)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).not.toBeInstanceOf(AccountLockedError)
        expect(res.error.message).toBe('Invalid credentials')
      }
    }

    // The Nth attempt triggers the lock — the throw is the AccountLockedError
    // itself (the route returns 423 from this).
    const locking = await attemptLogin(WRONG_PASSWORD)
    expect(locking.ok).toBe(false)
    if (!locking.ok) {
      expect(locking.error).toBeInstanceOf(AccountLockedError)
      expect((locking.error as AccountLockedError).code).toBe('ACCOUNT_LOCKED')
      expect((locking.error as AccountLockedError).lockedUntil).toBeInstanceOf(Date)
      expect((locking.error as AccountLockedError).retryAfterSeconds).toBeGreaterThan(0)
    }

    // Subsequent attempts (even with the RIGHT password) keep returning 423
    // until the lockout expires.
    const next = await attemptLogin(PASSWORD)
    expect(next.ok).toBe(false)
    if (!next.ok) {
      expect(next.error).toBeInstanceOf(AccountLockedError)
    }

    // DB state: lockedUntil is in the future, counter has been reset to 0
    // so the next window starts fresh after unlock.
    const AuthUser = await getAuthUserModel()
    const persisted = await AuthUser.findOne({ email: EMAIL })
    expect(persisted?.lockedUntil).toBeInstanceOf(Date)
    expect(persisted!.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
    expect(persisted?.failedLoginAttempts).toBe(0)
  })

  it('writes an audit log entry when the account locks', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      await attemptLogin(WRONG_PASSWORD)
    }

    const AuditLog = await getAuditLogModel()
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne({ email: EMAIL })
    expect(user).not.toBeNull()

    // The audit log write is fire-and-forget. Poll until it lands (the DB
    // write resolves on a later tick) — bounded so we don't hang the suite.
    const userId = user!._id!.toString()
    let entries = await AuditLog.find({
      userId,
      action: 'account_locked_brute_force',
    }).lean()
    const deadline = Date.now() + 2000
    while (entries.length === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25))
      entries = await AuditLog.find({
        userId,
        action: 'account_locked_brute_force',
      }).lean()
    }

    expect(entries.length).toBe(1)
    const entry = entries[0]!
    expect(entry.metadata).toMatchObject({
      email: EMAIL,
      failedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    })
    expect(typeof entry.metadata.lockedUntil).toBe('string')
  })

  it('resets the counter after a successful login', async () => {
    // 2 wrong attempts (under the threshold).
    await attemptLogin(WRONG_PASSWORD)
    await attemptLogin(WRONG_PASSWORD)

    const AuthUser = await getAuthUserModel()
    const intermediate = await AuthUser.findOne({ email: EMAIL })
    expect(intermediate?.failedLoginAttempts).toBe(2)

    // Right password — counter resets, lock state cleared.
    const success = await attemptLogin(PASSWORD)
    expect(success.ok).toBe(true)

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedLoginAttempts).toBe(0)
    expect(after?.lockedUntil).toBeNull()
    expect(after?.lastFailedLoginAt).toBeNull()
  })

  it('unlocks once the lockout window expires', async () => {
    // Trigger the lock with real failures.
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      await attemptLogin(WRONG_PASSWORD)
    }

    const AuthUser = await getAuthUserModel()
    const locked = await AuthUser.findOne({ email: EMAIL })
    expect(locked?.lockedUntil).toBeInstanceOf(Date)

    // Still locked while `lockedUntil > now`.
    const stillLocked = await attemptLogin(PASSWORD)
    expect(stillLocked.ok).toBe(false)
    if (!stillLocked.ok) {
      expect(stillLocked.error).toBeInstanceOf(AccountLockedError)
    }

    // Backdate `lockedUntil` to 1s in the past (manually rewinds the clock
    // — same effect as letting LOCKOUT_DURATION_MS elapse, without faking
    // timers which corrupts the underlying mongoose connection state).
    await AuthUser.updateOne(
      { email: EMAIL },
      { $set: { lockedUntil: new Date(Date.now() - 1000) } }
    )

    // The right password now succeeds and clears the lock.
    const unlocked = await attemptLogin(PASSWORD)
    expect(unlocked.ok).toBe(true)

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedLoginAttempts).toBe(0)
    expect(after?.lockedUntil).toBeNull()
  })

  it('sliding window: a stale failure (>SLIDING_WINDOW_MS old) resets the counter to 1', async () => {
    // Manipulate the DB directly to simulate a stale failure (no fake timers
    // here — shifting `Date` by >1h breaks the underlying mongo session
    // token TTL and cascades into ECONNREFUSED for subsequent tests).
    const AuthUser = await getAuthUserModel()
    const stalePast = new Date(Date.now() - SLIDING_WINDOW_MS - 60_000)
    await AuthUser.updateOne(
      { email: EMAIL },
      {
        $set: {
          failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1,
          lastFailedLoginAt: stalePast,
        },
      }
    )

    // A new failure outside the window resets the counter to 1, NOT to N
    // (the previous N-1 stale failures are forgiven).
    const stale = await attemptLogin(WRONG_PASSWORD)
    expect(stale.ok).toBe(false)
    if (!stale.ok) {
      expect(stale.error).not.toBeInstanceOf(AccountLockedError)
      expect(stale.error.message).toBe('Invalid credentials')
    }

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedLoginAttempts).toBe(1)
    expect(after?.lockedUntil).toBeNull()
  })

  it('does not count attempts on non-existent accounts (no enumeration leak)', async () => {
    // 10 attempts on unknown identifiers — must NEVER throw
    // AccountLockedError (there's no account to lock; lockout would only be
    // observable as a side-channel revealing whether the account exists).
    for (let i = 0; i < 10; i++) {
      let caught: Error | null = null
      try {
        await AuthService.validateCredentials({
          email: `ghost-${i}@example.com`,
          password: WRONG_PASSWORD,
          app: 'ezstart',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught).not.toBeNull()
      expect(caught).not.toBeInstanceOf(AccountLockedError)
      expect(caught!.message).toBe('Invalid credentials')
    }

    // The seeded user should remain unaffected.
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne({ email: EMAIL })
    expect(user?.failedLoginAttempts ?? 0).toBe(0)
    expect(user?.lockedUntil).toBeFalsy()
  })

  it('AccountLockedError carries an actionable message + retryAfterSeconds', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      await attemptLogin(WRONG_PASSWORD)
    }
    const blocked = await attemptLogin(PASSWORD)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      const err = blocked.error as AccountLockedError
      expect(err.message).toMatch(/Account temporarily locked/)
      expect(err.message).toMatch(/Try again in \d+ minute/)
      expect(err.retryAfterSeconds).toBeLessThanOrEqual(LOCKOUT_DURATION_MS / 1000)
      expect(err.retryAfterSeconds).toBeGreaterThan(0)
    }
  })
})
