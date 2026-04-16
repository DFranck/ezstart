import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { createUser, createEmailVerificationCode, cleanAllCollections } from '../../helpers/setup.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getAuthCodeModel } from '../../../models/auth-code.js'

describe('Verify Email Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should verify email with valid token', async () => {
    const user = await createUser({
      email: 'verify@example.com',
      username: 'verifyuser',
      isVerified: false,
    })

    const verifyCode = await createEmailVerificationCode(user._id!.toString())

    // Simulate verify-email route logic
    const AuthCode = await getAuthCodeModel()
    const AuthUser = await getAuthUserModel()

    const authCode = await AuthCode.findOne({
      code: verifyCode.code,
      type: 'email-verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    expect(authCode).toBeTruthy()

    const targetUser = await AuthUser.findById(authCode!.userId)
    expect(targetUser).toBeTruthy()

    targetUser!.isVerified = true
    await targetUser!.save()

    authCode!.isUsed = true
    await authCode!.save()

    // Verify the user is now verified
    const updated = await AuthUser.findById(user._id)
    expect(updated?.isVerified).toBe(true)
  })

  it('should handle already-verified user gracefully', async () => {
    const user = await createUser({
      email: 'already@example.com',
      username: 'alreadyuser',
      isVerified: true, // Already verified
    })

    const verifyCode = await createEmailVerificationCode(user._id!.toString())

    const AuthCode = await getAuthCodeModel()
    const AuthUser = await getAuthUserModel()

    const authCode = await AuthCode.findOne({
      code: verifyCode.code,
      type: 'email-verification',
      isUsed: false,
    })

    const targetUser = await AuthUser.findById(authCode!.userId)
    expect(targetUser?.isVerified).toBe(true)

    // Route returns "Email already verified" and marks token as used
    authCode!.isUsed = true
    await authCode!.save()

    const usedCode = await AuthCode.findById(authCode!._id)
    expect(usedCode?.isUsed).toBe(true)
  })

  it('should reject expired verification token', async () => {
    const user = await createUser({
      email: 'expired-verify@example.com',
      username: 'expiredverify',
      isVerified: false,
    })

    const AuthCode = await getAuthCodeModel()
    await AuthCode.create({
      code: 'expired-verify-token',
      userId: user._id!.toString(),
      type: 'email-verification',
      app: 'ezstart',
      expiresAt: new Date(Date.now() - 1000), // Already expired
      isUsed: false,
    })

    const found = await AuthCode.findOne({
      code: 'expired-verify-token',
      type: 'email-verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    expect(found).toBeNull()
  })

  it('should reject already-used verification token', async () => {
    const user = await createUser({
      email: 'used-verify@example.com',
      username: 'usedverify',
      isVerified: false,
    })

    const AuthCode = await getAuthCodeModel()
    await AuthCode.create({
      code: 'used-verify-token',
      userId: user._id!.toString(),
      type: 'email-verification',
      app: 'ezstart',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUsed: true,
    })

    const found = await AuthCode.findOne({
      code: 'used-verify-token',
      type: 'email-verification',
      isUsed: false,
    })

    expect(found).toBeNull()
  })
})
