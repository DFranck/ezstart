import * as OTPAuth from 'otpauth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getTotpSecretModel } from '../models/totp-secret.js'

const TOTP_ISSUER = 'EZAuth'
const BACKUP_CODE_COUNT = 8

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
      period: 30,
    })

    const secret = totp.secret.base32
    const uri = totp.toString()

    // Save or update the secret (not yet enabled)
    await TotpSecretModel.findOneAndUpdate(
      { userId },
      { userId, secret, isEnabled: false, backupCodes: [] },
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

    // Verify the code
    const isValid = this.validateCode(totpDoc.secret, code)
    if (!isValid) {
      throw new Error('Invalid verification code. Please try again.')
    }

    // Generate backup codes
    const plainBackupCodes: string[] = []
    const hashedBackupCodes: string[] = []

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const backupCode = crypto.randomBytes(4).toString('hex') // 8-char hex codes
      plainBackupCodes.push(backupCode)
      const hashed = await bcrypt.hash(backupCode, 10)
      hashedBackupCodes.push(hashed)
    }

    // Enable 2FA and store hashed backup codes
    totpDoc.isEnabled = true
    totpDoc.backupCodes = hashedBackupCodes
    await totpDoc.save()

    return { backupCodes: plainBackupCodes }
  }

  /**
   * Disable 2FA (requires a valid TOTP code)
   */
  static async disable(userId: string, code: string): Promise<void> {
    const TotpSecretModel = await getTotpSecretModel()

    const totpDoc = await TotpSecretModel.findOne({ userId })
    if (!totpDoc || !totpDoc.isEnabled) {
      throw new Error('2FA is not enabled.')
    }

    // Verify the code
    const isValid = this.validateCode(totpDoc.secret, code)
    if (!isValid) {
      throw new Error('Invalid verification code.')
    }

    // Remove the TOTP secret entirely
    await TotpSecretModel.deleteOne({ userId })
  }

  /**
   * Validate a TOTP code during login
   * Also checks backup codes
   */
  static async validateLogin(userId: string, code: string): Promise<boolean> {
    const TotpSecretModel = await getTotpSecretModel()

    const totpDoc = await TotpSecretModel.findOne({ userId })
    if (!totpDoc || !totpDoc.isEnabled) {
      return true // 2FA not enabled, skip
    }

    // Try TOTP code first
    if (this.validateCode(totpDoc.secret, code)) {
      return true
    }

    // Try backup codes
    for (let i = 0; i < totpDoc.backupCodes.length; i++) {
      const hashedCode = totpDoc.backupCodes[i]
      if (!hashedCode) continue
      const isMatch = await bcrypt.compare(code, hashedCode)
      if (isMatch) {
        // Remove used backup code
        totpDoc.backupCodes.splice(i, 1)
        await totpDoc.save()
        return true
      }
    }

    return false
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
   * Validate a TOTP code against a secret
   */
  private static validateCode(secret: string, code: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    // Allow 1 step window (30 seconds before/after)
    const delta = totp.validate({ token: code, window: 1 })
    return delta !== null
  }
}
