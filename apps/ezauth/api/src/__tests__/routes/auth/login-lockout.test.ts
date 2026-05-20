/**
 * Account-level brute force lockout tests.
 *
 * Covers the policy enforced by `AuthService.validateCredentials` and exposed
 * by the login routes (cf. `config/lockout.ts`):
 *
 *   - {@link MAX_FAILED_LOGIN_ATTEMPTS} consecutive failures lock the account
 *     for {@link LOCKOUT_DURATION_MS}.
 *   - HIGH-2 (Wave D Lot 3.5A — COMPARE-FIRST): a WRONG-password attempt
 *     ALWAYS returns the generic `'Invalid credentials'` (401) — even the Nth
 *     attempt that trips the lock. {@link AccountLockedError} (mapped to HTTP
 *     423) is thrown ONLY when the CORRECT password is presented on an account
 *     that is currently locked. This closes the account-enumeration oracle:
 *     reaching 423 requires valid credentials, so it can no longer be used to
 *     distinguish a real account from a non-existent one.
 *   - A successful login (within an unlocked window) resets the counter and
 *     clears the lock.
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

  it('locks the account after MAX_FAILED_LOGIN_ATTEMPTS wrong-password attempts (wrong pwd always 401, never 423)', async () => {
    // HIGH-2 — EVERY wrong-password attempt (including the Nth that trips the
    // lock) returns the generic 'Invalid credentials'. The lock is set in the
    // DB but is NOT surfaced on a wrong-password attempt.
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      const res = await attemptLogin(WRONG_PASSWORD)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).not.toBeInstanceOf(AccountLockedError)
        expect(res.error.message).toBe('Invalid credentials')
      }
    }

    // DB state: the Nth wrong attempt set `lockedUntil` in the future and reset
    // the counter to 0 so the next window starts fresh after unlock.
    const AuthUser = await getAuthUserModel()
    const persisted = await AuthUser.findOne({ email: EMAIL })
    expect(persisted?.lockedUntil).toBeInstanceOf(Date)
    expect(persisted!.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
    expect(persisted?.failedLoginAttempts).toBe(0)

    // The lock is revealed ONLY when the CORRECT password is presented — this
    // is the single place 423 can occur, and it requires valid credentials.
    const withRightPassword = await attemptLogin(PASSWORD)
    expect(withRightPassword.ok).toBe(false)
    if (!withRightPassword.ok) {
      expect(withRightPassword.error).toBeInstanceOf(AccountLockedError)
      expect((withRightPassword.error as AccountLockedError).code).toBe('ACCOUNT_LOCKED')
      expect((withRightPassword.error as AccountLockedError).lockedUntil).toBeInstanceOf(Date)
      expect((withRightPassword.error as AccountLockedError).retryAfterSeconds).toBeGreaterThan(0)
    }
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

  it('HIGH-2: N wrong attempts on an EXISTING vs NON-EXISTENT account are indistinguishable (no enumeration oracle)', async () => {
    // Existing account: every wrong attempt — including the Nth that locks —
    // returns the generic 401 'Invalid credentials' (never 423).
    const existingResults: string[] = []
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS + 1; i++) {
      const res = await attemptLogin(WRONG_PASSWORD)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).not.toBeInstanceOf(AccountLockedError)
        existingResults.push(res.error.message)
      }
    }

    // Non-existent identifier: same number of attempts, same generic message.
    const ghostResults: string[] = []
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS + 1; i++) {
      let caught: Error | null = null
      try {
        await AuthService.validateCredentials({
          email: 'does-not-exist@example.com',
          password: WRONG_PASSWORD,
          app: 'ezstart',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught).not.toBeNull()
      expect(caught).not.toBeInstanceOf(AccountLockedError)
      ghostResults.push(caught!.message)
    }

    // The observable error surface is byte-for-byte identical between the two
    // — no 423 leaks for the existing account, so an attacker cannot tell
    // "real but locked" from "does not exist".
    expect(existingResults.every(m => m === 'Invalid credentials')).toBe(true)
    expect(ghostResults.every(m => m === 'Invalid credentials')).toBe(true)
    expect(existingResults).toEqual(ghostResults)

    // The 423 lock signal is reachable ONLY with the correct password.
    const locked = await attemptLogin(PASSWORD)
    expect(locked.ok).toBe(false)
    if (!locked.ok) {
      expect(locked.error).toBeInstanceOf(AccountLockedError)
    }
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
