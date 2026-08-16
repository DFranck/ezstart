/**
 * 2FA brute force lockout tests.
 *
 * Mirrors the login-lockout suite (cf. `__tests__/routes/auth/login-lockout.test.ts`)
 * but scoped to `TotpService.validateLogin` and the `/auth/2fa/validate` route.
 *
 * Policy enforced (cf. `config/lockout.ts`):
 *   - {@link MAX_FAILED_TWO_FACTOR_ATTEMPTS} consecutive wrong code attempts
 *     within {@link SLIDING_WINDOW_MS} lock the user out of `/2fa/validate` for
 *     {@link TWO_FACTOR_LOCKOUT_DURATION_MS}.
 *   - The next attempt while locked throws {@link TwoFactorLockedError}, which
 *     the route maps to HTTP 423 with `code: 'TWO_FACTOR_LOCKED'`.
 *   - A successful TOTP validation resets the counter and clears the lock.
 *   - The lockout window expires (next attempt after `twoFactorLockedUntil`
 *     succeeds with a valid code).
 *   - The sliding window resets the counter when the previous failure is
 *     older than the window.
 *   - An audit log entry (`two_factor_locked_brute_force`) is written
 *     fire-and-forget when the lock fires.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import * as OTPAuth from 'otpauth'
import { TotpService, TwoFactorLockedError } from '../../../../services/totp.service.js'
import {
  MAX_FAILED_TWO_FACTOR_ATTEMPTS,
  SLIDING_WINDOW_MS,
  TWO_FACTOR_LOCKOUT_DURATION_MS,
} from '../../../../config/lockout.js'
import { getAuthUserModel } from '../../../../models/auth-user.js'
import { getTotpSecretModel } from '../../../../models/totp-secret.js'
import { getAuditLogModel } from '../../../../models/audit-log.js'
import { cleanAllCollections, createUser } from '../../../helpers/setup.js'

const EMAIL = '2fa-lockout@example.com'
const USERNAME = 'twofactorlockoutuser'
const PASSWORD = 'CorrectPassword123'
const WRONG_CODE = '000000'

/**
 * Seed an enabled-2FA user. Returns the user id + the TOTP instance so the
 * test can compute valid live codes when needed.
 */
async function seedTwoFactorUser(): Promise<{ userId: string; totp: OTPAuth.TOTP }> {
  const user = await createUser({ email: EMAIL, username: USERNAME, password: PASSWORD })
  const userId = user._id!.toString()

  // Generate a fresh TOTP secret + persist it as `isEnabled: true`. We
  // bypass `TotpService.generateSecret` + `verifyAndEnable` because those
  // require a live valid code (and we want to seed in one shot).
  const totp = new OTPAuth.TOTP({
    issuer: 'EZAuth',
    label: EMAIL,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })
  const secret = totp.secret.base32

  const TotpSecret = await getTotpSecretModel()
  await TotpSecret.create({
    userId,
    secret,
    isEnabled: true,
    backupCodes: [],
    lastUsedTotpStep: null,
  })

  return { userId, totp }
}

async function attemptValidate(
  userId: string,
  code: string
): Promise<{ ok: true; method: 'totp' | 'backup' | null } | { ok: false; error: Error }> {
  try {
    const result = await TotpService.validateLogin(userId, code)
    return { ok: result.valid, method: result.method } as
      | { ok: true; method: 'totp' | 'backup' | null }
      | { ok: false; error: Error }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}

describe('2FA — brute force lockout', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    // cleanAllCollections() doesn't include TotpSecret / AuditLog — purge
    // them so cases don't bleed state across tests.
    const TotpSecret = await getTotpSecretModel()
    const AuditLog = await getAuditLogModel()
    await Promise.all([TotpSecret.deleteMany({}), AuditLog.deleteMany({})])
  })

  it('locks the user after MAX_FAILED_TWO_FACTOR_ATTEMPTS wrong codes', async () => {
    const { userId } = await seedTwoFactorUser()

    // Burn N-1 wrong attempts — they all return invalid (not throw).
    for (let i = 0; i < MAX_FAILED_TWO_FACTOR_ATTEMPTS - 1; i++) {
      const res = await TotpService.validateLogin(userId, WRONG_CODE)
      expect(res.valid).toBe(false)
      expect(res.method).toBeNull()
    }

    // The Nth attempt triggers the lock — the throw is the
    // TwoFactorLockedError itself (the route maps it to 423).
    let caught: unknown = null
    try {
      await TotpService.validateLogin(userId, WRONG_CODE)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(TwoFactorLockedError)
    if (caught instanceof TwoFactorLockedError) {
      expect(caught.code).toBe('TWO_FACTOR_LOCKED')
      expect(caught.lockedUntil).toBeInstanceOf(Date)
      expect(caught.retryAfterSeconds).toBeGreaterThan(0)
    }

    // Subsequent attempts (even with a hypothetically RIGHT code) keep
    // throwing 423 until the lockout expires.
    let blocked: unknown = null
    try {
      await TotpService.validateLogin(userId, '123456')
    } catch (err) {
      blocked = err
    }
    expect(blocked).toBeInstanceOf(TwoFactorLockedError)

    // DB state: twoFactorLockedUntil in the future, counter reset to 0
    // so the next window starts fresh after unlock.
    const AuthUser = await getAuthUserModel()
    const persisted = await AuthUser.findOne({ email: EMAIL })
    expect(persisted?.twoFactorLockedUntil).toBeInstanceOf(Date)
    expect(persisted!.twoFactorLockedUntil!.getTime()).toBeGreaterThan(Date.now())
    expect(persisted?.failedTwoFactorAttempts).toBe(0)
  })

  it('writes an audit log entry when the 2FA challenge locks', async () => {
    const { userId } = await seedTwoFactorUser()

    for (let i = 0; i < MAX_FAILED_TWO_FACTOR_ATTEMPTS; i++) {
      try {
        await TotpService.validateLogin(userId, WRONG_CODE)
      } catch {
        // expected on the Nth attempt
      }
    }

    // Audit log writes are fire-and-forget — poll until they land.
    const AuditLog = await getAuditLogModel()
    let entries = await AuditLog.find({
      userId,
      action: 'two_factor_locked_brute_force',
    }).lean()
    const deadline = Date.now() + 2000
    while (entries.length === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25))
      entries = await AuditLog.find({
        userId,
        action: 'two_factor_locked_brute_force',
      }).lean()
    }

    expect(entries.length).toBe(1)
    const entry = entries[0]!
    expect(entry.metadata).toMatchObject({
      email: EMAIL,
      failedAttempts: MAX_FAILED_TWO_FACTOR_ATTEMPTS,
    })
    expect(typeof entry.metadata.lockedUntil).toBe('string')
  })

  it('resets the counter after a successful TOTP validation', async () => {
    const { userId, totp } = await seedTwoFactorUser()

    // 2 wrong attempts (under the threshold).
    await attemptValidate(userId, WRONG_CODE)
    await attemptValidate(userId, WRONG_CODE)

    const AuthUser = await getAuthUserModel()
    const intermediate = await AuthUser.findOne({ email: EMAIL })
    expect(intermediate?.failedTwoFactorAttempts).toBe(2)

    // Live TOTP code resets the counter and clears any lock state.
    const validCode = totp.generate()
    const success = await TotpService.validateLogin(userId, validCode)
    expect(success.valid).toBe(true)
    expect(success.method).toBe('totp')

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedTwoFactorAttempts).toBe(0)
    expect(after?.twoFactorLockedUntil).toBeNull()
    expect(after?.lastFailedTwoFactorAt).toBeNull()
  })

  it('unlocks once the lockout window expires', async () => {
    const { userId, totp } = await seedTwoFactorUser()

    // Trigger the lock with real failures.
    for (let i = 0; i < MAX_FAILED_TWO_FACTOR_ATTEMPTS; i++) {
      try {
        await TotpService.validateLogin(userId, WRONG_CODE)
      } catch {
        // expected on the Nth attempt
      }
    }

    const AuthUser = await getAuthUserModel()
    const locked = await AuthUser.findOne({ email: EMAIL })
    expect(locked?.twoFactorLockedUntil).toBeInstanceOf(Date)

    // Still locked while `twoFactorLockedUntil > now`.
    let stillLocked: unknown = null
    try {
      await TotpService.validateLogin(userId, totp.generate())
    } catch (err) {
      stillLocked = err
    }
    expect(stillLocked).toBeInstanceOf(TwoFactorLockedError)

    // Backdate `twoFactorLockedUntil` to 1s in the past (manually rewinds
    // the clock — same effect as letting TWO_FACTOR_LOCKOUT_DURATION_MS
    // elapse, without faking timers which corrupts the underlying mongoose
    // connection state — same workaround as login-lockout.test.ts).
    await AuthUser.updateOne(
      { email: EMAIL },
      { $set: { twoFactorLockedUntil: new Date(Date.now() - 1000) } }
    )

    // The right code now succeeds and clears the lock state.
    const unlocked = await TotpService.validateLogin(userId, totp.generate())
    expect(unlocked.valid).toBe(true)

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedTwoFactorAttempts).toBe(0)
    expect(after?.twoFactorLockedUntil).toBeNull()
  })

  it('sliding window: a stale failure (>SLIDING_WINDOW_MS old) resets the counter to 1', async () => {
    const { userId } = await seedTwoFactorUser()

    // Manipulate the DB directly to simulate a stale failure (no fake
    // timers — shifting `Date` by >1h breaks the underlying mongo session
    // token TTL and cascades into ECONNREFUSED).
    const AuthUser = await getAuthUserModel()
    const stalePast = new Date(Date.now() - SLIDING_WINDOW_MS - 60_000)
    await AuthUser.updateOne(
      { email: EMAIL },
      {
        $set: {
          failedTwoFactorAttempts: MAX_FAILED_TWO_FACTOR_ATTEMPTS - 1,
          lastFailedTwoFactorAt: stalePast,
        },
      }
    )

    // A new failure outside the window resets the counter to 1, NOT to N
    // (the previous N-1 stale failures are forgiven).
    const stale = await TotpService.validateLogin(userId, WRONG_CODE)
    expect(stale.valid).toBe(false)

    const after = await AuthUser.findOne({ email: EMAIL })
    expect(after?.failedTwoFactorAttempts).toBe(1)
    expect(after?.twoFactorLockedUntil).toBeNull()
  })

  it('TwoFactorLockedError carries an actionable message + retryAfterSeconds', async () => {
    const { userId } = await seedTwoFactorUser()

    for (let i = 0; i < MAX_FAILED_TWO_FACTOR_ATTEMPTS; i++) {
      try {
        await TotpService.validateLogin(userId, WRONG_CODE)
      } catch {
        // expected on the Nth attempt
      }
    }

    let blocked: unknown = null
    try {
      await TotpService.validateLogin(userId, WRONG_CODE)
    } catch (err) {
      blocked = err
    }
    expect(blocked).toBeInstanceOf(TwoFactorLockedError)
    if (blocked instanceof TwoFactorLockedError) {
      expect(blocked.message).toMatch(/Two-factor authentication temporarily locked/)
      expect(blocked.message).toMatch(/Try again in \d+ minute/)
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(TWO_FACTOR_LOCKOUT_DURATION_MS / 1000)
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it('returns { valid: false, method: null } (no lock) when 2FA is not enabled', async () => {
    // No seed — just create a plain user without any TotpSecret.
    const user = await createUser({ email: EMAIL, username: USERNAME, password: PASSWORD })
    const userId = user._id!.toString()

    // 10 attempts on a user without 2FA — must NEVER throw
    // TwoFactorLockedError. Without an enabled secret there's nothing to
    // brute force; locking would only side-channel reveal whether 2FA was
    // ever provisioned for this account.
    for (let i = 0; i < 10; i++) {
      const res = await TotpService.validateLogin(userId, WRONG_CODE)
      expect(res.valid).toBe(false)
      expect(res.method).toBeNull()
    }

    const AuthUser = await getAuthUserModel()
    const persisted = await AuthUser.findOne({ email: EMAIL })
    expect(persisted?.failedTwoFactorAttempts ?? 0).toBe(0)
    expect(persisted?.twoFactorLockedUntil).toBeFalsy()
  })
})
