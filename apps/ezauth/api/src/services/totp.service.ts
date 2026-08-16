import * as OTPAuth from 'otpauth'
import crypto from 'crypto'
import { compare, hash } from '@node-rs/bcrypt'
import { getTotpSecretModel, type TotpSecretDocument } from '../models/totp-secret.js'
import { getAuthUserModel } from '../models/auth-user.js'
import {
  MAX_FAILED_TWO_FACTOR_ATTEMPTS,
  SLIDING_WINDOW_MS,
  TWO_FACTOR_LOCKOUT_DURATION_MS,
} from '../config/lockout.js'
import { AuditLogService } from './audit-log.service.js'

const TOTP_ISSUER = 'EZAuth'
const TOTP_PERIOD_SECONDS = 30
const TOTP_WINDOW_STEPS = 1 // ±1 step (30s before/after) for clock drift
const BACKUP_CODE_COUNT = 8

/**
 * Thrown when a user is currently locked out of `/auth/2fa/validate` due to
 * too many wrong code attempts. Mirrors `AccountLockedError` (login lockout)
 * — routes catch this specifically to return HTTP 423 Locked with a
 * machine-readable `code: 'TWO_FACTOR_LOCKED'`, the `lockedUntil` deadline,
 * and a `retryAfterSeconds` value so the client can render an accurate
 * countdown.
 *
 * cf. `config/lockout.ts` for the policy + `standard-saas-security.md` §2.
 */
export class TwoFactorLockedError extends Error {
  readonly code = 'TWO_FACTOR_LOCKED' as const
  readonly lockedUntil: Date
  readonly retryAfterSeconds: number

  constructor(lockedUntil: Date) {
    const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000))
    const minutes = Math.ceil(retryAfterSeconds / 60)
    super(
      `Two-factor authentication temporarily locked due to too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
    )
    this.name = 'TwoFactorLockedError'
    this.lockedUntil = lockedUntil
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Result of validating a TOTP code or backup code during login.
 * Discriminated so callers can audit-log accurately (TOTP success vs.
 * backup code consumption — different security posture).
 */
export interface ValidateLoginResult {
  valid: boolean
  /** `'totp'` when a TOTP code matched, `'backup'` for backup code. `null` on failure. */
  method: 'totp' | 'backup' | null
}

export class TotpService {
  /**
   * Generate a new TOTP secret for a user (setup phase 1)
   * Returns the secret and otpauth URI for QR code generation
   */
  static async generateSecret(
    userId: string,
    userEmail: string
  ): Promise<{ secret: string; uri: string }> {
    const TotpSecretModel = await getTotpSecretModel()

    // Check if user already has 2FA enabled
    const existing = await TotpSecretModel.findOne({ userId })
    if (existing?.isEnabled) {
      throw new Error('2FA is already enabled. Disable it first to reconfigure.')
    }

    // Generate new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: TOTP_PERIOD_SECONDS,
    })

    const secret = totp.secret.base32
    const uri = totp.toString()

    // Save or update the secret (not yet enabled). Reset the replay
    // tracker — a fresh secret gets a fresh window.
    await TotpSecretModel.findOneAndUpdate(
      { userId },
      { userId, secret, isEnabled: false, backupCodes: [], lastUsedTotpStep: null },
      { upsert: true, new: true }
    )

    return { secret, uri }
  }

  /**
   * Verify a TOTP code and enable 2FA (setup phase 2)
   * Returns backup codes on success
   */
  static async verifyAndEnable(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const TotpSecretModel = await getTotpSecretModel()

    const totpDoc = await TotpSecretModel.findOne({ userId })
    if (!totpDoc) {
      throw new Error('No 2FA setup in progress. Call /auth/2fa/setup first.')
    }

    if (totpDoc.isEnabled) {
      throw new Error('2FA is already enabled.')
    }

    // Verify the code (and consume the step to prevent replay)
    const matchedStep = this.consumeTotpCode(totpDoc, code)
    if (matchedStep === null) {
      throw new Error('Invalid verification code. Please try again.')
    }

    // Generate backup codes
    const plainBackupCodes: string[] = []
    const hashedBackupCodes: string[] = []

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const backupCode = crypto.randomBytes(4).toString('hex') // 8-char hex codes
      plainBackupCodes.push(backupCode)
      const hashed = await hash(backupCode, 10)
      hashedBackupCodes.push(hashed)
    }

    // Enable 2FA, store hashed backup codes, and persist the consumed step
    totpDoc.isEnabled = true
    totpDoc.backupCodes = hashedBackupCodes
    totpDoc.lastUsedTotpStep = matchedStep
    await totpDoc.save()

    return { backupCodes: plainBackupCodes }
  }

  /**
   * Disable 2FA. Requires a valid TOTP code (or backup code) AND, when
   * supplied, the account password — defense-in-depth so a stolen
   * session alone cannot disable 2FA.
   *
   * `password` is optional during the deprecation window — callers
   * SHOULD pass it. A future major release will make it mandatory.
   */
  static async disable(userId: string, code: string, password?: string): Promise<void> {
    const TotpSecretModel = await getTotpSecretModel()

    const totpDoc = await TotpSecretModel.findOne({ userId })
    if (!totpDoc || !totpDoc.isEnabled) {
      throw new Error('2FA is not enabled.')
    }

    // When password supplied, verify it first (defense in depth)
    if (typeof password === 'string' && password.length > 0) {
      const AuthUserModel = await getAuthUserModel()
      const user = await AuthUserModel.findById(userId)
      if (!user) {
        throw new Error('User not found.')
      }
      const isValidPassword = await user.comparePassword(password)
      if (!isValidPassword) {
        throw new Error('Invalid password.')
      }
    }

    // Verify the code — accept TOTP (with replay protection) or backup code
    const result = await this.consumeAnyCode(totpDoc, code)
    if (!result.valid) {
      throw new Error('Invalid verification code.')
    }

    // Remove the TOTP secret entirely
    await TotpSecretModel.deleteOne({ userId })
  }

  /**
   * Validate a TOTP code (or backup code) during login.
   *
   * Returns `{ valid: false, method: null }` when:
   *   - 2FA is not enabled for the user (defense in depth — `validate`
   *     callers MUST NOT bypass 2FA based on a stale "no 2FA" state),
   *   - the code is malformed / invalid,
   *   - the TOTP code was already used in this window (RFC 6238 §5.2
   *     replay protection).
   *
   * Returns `{ valid: true, method: 'totp' | 'backup' }` on success so
   * callers can audit-log accurately.
   *
   * Enforces account-level brute force lockout on the 2FA challenge: after
   * {@link MAX_FAILED_TWO_FACTOR_ATTEMPTS} consecutive wrong codes (within a
   * {@link SLIDING_WINDOW_MS} sliding window), the user is locked out of
   * `/2fa/validate` for {@link TWO_FACTOR_LOCKOUT_DURATION_MS}. Locked users
   * throw {@link TwoFactorLockedError} which the route layer maps to HTTP
   * 423 Locked. Without this an attacker who knows the password can brute
   * force the 6-digit TOTP (10⁶ combinations is fast enough to crack in
   * minutes given only a per-IP rate-limit).
   *
   * Optional `meta` (ip, userAgent) is forwarded to the audit log entry
   * written when the 2FA lockout fires.
   */
  static async validateLogin(
    userId: string,
    code: string,
    meta?: { ip?: string | null; userAgent?: string | null }
  ): Promise<ValidateLoginResult> {
    const TotpSecretModel = await getTotpSecretModel()
    const AuthUserModel = await getAuthUserModel()

    const totpDoc = await TotpSecretModel.findOne({ userId })
    if (!totpDoc || !totpDoc.isEnabled) {
      // 2FA was disabled between login challenge issuance and validate
      // call. We refuse — callers must restart the login flow.
      return { valid: false, method: null }
    }

    // Load the user to enforce / update the 2FA lockout counter.
    const user = await AuthUserModel.findById(userId)
    if (!user) {
      // User was deleted between login challenge issuance and validate.
      return { valid: false, method: null }
    }

    const now = new Date()

    // Already locked? Reject before attempting the (relatively cheap) code
    // check so a known-locked attacker can't drain bcrypt cycles on backup
    // code attempts.
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil.getTime() > now.getTime()) {
      throw new TwoFactorLockedError(user.twoFactorLockedUntil)
    }

    const result = await this.consumeAnyCode(totpDoc, code)

    if (!result.valid) {
      // Sliding window: a stale failure (older than the window) resets the
      // counter to 1 instead of stacking forever.
      const last = user.lastFailedTwoFactorAt
      const withinWindow =
        last instanceof Date && now.getTime() - last.getTime() < SLIDING_WINDOW_MS
      const previousAttempts = withinWindow ? (user.failedTwoFactorAttempts ?? 0) : 0
      const newAttempts = previousAttempts + 1

      user.lastFailedTwoFactorAt = now

      if (newAttempts >= MAX_FAILED_TWO_FACTOR_ATTEMPTS) {
        // Lock the 2FA challenge. Reset the counter so the next window
        // starts fresh once the lockout expires (otherwise a single
        // failure right after unlock would re-trigger the lock).
        const lockedUntil = new Date(now.getTime() + TWO_FACTOR_LOCKOUT_DURATION_MS)
        user.twoFactorLockedUntil = lockedUntil
        user.failedTwoFactorAttempts = 0
        await user.save()

        // Fire-and-forget audit log entry. Failure must NEVER block the
        // response (the route already returns 423).
        void AuditLogService.create({
          userId,
          action: 'two_factor_locked_brute_force',
          metadata: {
            email: user.email,
            ip: meta?.ip ?? null,
            userAgent: meta?.userAgent ?? null,
            lockedUntil: lockedUntil.toISOString(),
            failedAttempts: MAX_FAILED_TWO_FACTOR_ATTEMPTS,
          },
        })

        throw new TwoFactorLockedError(lockedUntil)
      }

      user.failedTwoFactorAttempts = newAttempts
      await user.save()
      return result
    }

    // Successful 2FA — reset the lockout counter and clear any expired
    // lock so the next failure starts fresh.
    if (
      (user.failedTwoFactorAttempts ?? 0) > 0 ||
      user.twoFactorLockedUntil != null ||
      user.lastFailedTwoFactorAt != null
    ) {
      user.failedTwoFactorAttempts = 0
      user.twoFactorLockedUntil = null
      user.lastFailedTwoFactorAt = null
      await user.save()
    }

    return result
  }

  /**
   * Try a TOTP code first (with replay protection), then fall back to
   * backup codes. Persists state changes (`lastUsedTotpStep` for TOTP,
   * splice of consumed backup code) on success.
   */
  private static async consumeAnyCode(
    totpDoc: TotpSecretDocument,
    code: string
  ): Promise<ValidateLoginResult> {
    // Try TOTP code first (only if it looks like 6 digits — backup codes
    // are 8 hex chars, so we don't waste a TOTP attempt on them)
    const looksLikeTotp = /^\d{6}$/.test(code)
    if (looksLikeTotp) {
      const matchedStep = this.consumeTotpCode(totpDoc, code)
      if (matchedStep !== null) {
        totpDoc.lastUsedTotpStep = matchedStep
        await totpDoc.save()
        return { valid: true, method: 'totp' }
      }
    }

    // Try backup codes
    for (let i = 0; i < totpDoc.backupCodes.length; i++) {
      const hashedCode = totpDoc.backupCodes[i]
      if (!hashedCode) continue
      const isMatch = await compare(code, hashedCode)
      if (isMatch) {
        // Remove used backup code (one-shot)
        totpDoc.backupCodes.splice(i, 1)
        await totpDoc.save()
        return { valid: true, method: 'backup' }
      }
    }

    return { valid: false, method: null }
  }

  /**
   * Check if a user has 2FA enabled
   */
  static async isEnabled(userId: string): Promise<boolean> {
    const TotpSecretModel = await getTotpSecretModel()
    const totpDoc = await TotpSecretModel.findOne({ userId })
    return totpDoc?.isEnabled ?? false
  }

  /**
   * Validate a TOTP code against a stored secret WITH replay protection.
   * Returns the consumed step on success (caller persists it via
   * `lastUsedTotpStep`), or `null` on failure (invalid OR replayed).
   *
   * Per RFC 6238 §5.2, a TOTP code MUST NOT be accepted twice in the
   * same step window. We reject any attempt whose computed step is
   * `<= totpDoc.lastUsedTotpStep`.
   */
  private static consumeTotpCode(totpDoc: TotpSecretDocument, code: string): number | null {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: TOTP_PERIOD_SECONDS,
      secret: OTPAuth.Secret.fromBase32(totpDoc.secret),
    })

    // Allow ±1 step window (30 seconds before/after) for clock drift.
    const delta = totp.validate({ token: code, window: TOTP_WINDOW_STEPS })
    if (delta === null) return null

    const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS)
    const matchedStep = currentStep + delta

    // Replay protection: reject if this step was already consumed.
    if (typeof totpDoc.lastUsedTotpStep === 'number' && matchedStep <= totpDoc.lastUsedTotpStep) {
      return null
    }

    return matchedStep
  }
}
