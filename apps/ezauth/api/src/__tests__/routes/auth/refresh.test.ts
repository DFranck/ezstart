import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../../services/auth.service.js'
import { createUser, createRefreshToken, cleanAllCollections } from '../../helpers/setup.js'
import { getRefreshTokenModel, hashRefreshToken } from '../../../models/refresh-token.js'

describe('Refresh Token Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should refresh and rotate token', async () => {
    const user = await createUser({ email: 'refresh@example.com', username: 'refreshuser' })
    const { rawToken } = await createRefreshToken(user._id!.toString())

    const result = await AuthService.refreshAccessToken(rawToken)

    expect(result.access_token).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.refreshToken).not.toBe(rawToken) // Rotated
    expect(result.user.email).toBe('refresh@example.com')
  })

  it('should revoke old token after rotation', async () => {
    const user = await createUser({ email: 'rotate@example.com', username: 'rotateuser' })
    const { rawToken } = await createRefreshToken(user._id!.toString())

    await AuthService.refreshAccessToken(rawToken)

    // Old token should be revoked
    const RefreshToken = await getRefreshTokenModel()
    const oldDoc = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) })
    expect(oldDoc?.isRevoked).toBe(true)
  })

  it('should reject invalid refresh token', async () => {
    await expect(AuthService.refreshAccessToken('completely-invalid-token')).rejects.toThrow(
      'Invalid refresh token'
    )
  })

  it('should reject revoked token and revoke all user tokens (replay attack)', async () => {
    const user = await createUser({ email: 'replay@example.com', username: 'replayuser' })
    const { rawToken: token1 } = await createRefreshToken(user._id!.toString())
    const { rawToken: token2 } = await createRefreshToken(user._id!.toString())

    // Manually revoke token1
    const RefreshToken = await getRefreshTokenModel()
    await RefreshToken.updateOne(
      { tokenHash: hashRefreshToken(token1) },
      { $set: { isRevoked: true } }
    )

    // Attempt to reuse revoked token1 → should revoke ALL tokens
    await expect(AuthService.refreshAccessToken(token1)).rejects.toThrow('Refresh token has been revoked')

    // Token2 should also be revoked
    const token2Doc = await RefreshToken.findOne({ tokenHash: hashRefreshToken(token2) })
    expect(token2Doc?.isRevoked).toBe(true)
  })

  it('should reject expired refresh token', async () => {
    const user = await createUser({ email: 'expref@example.com', username: 'exprefuser' })
    const RefreshToken = await getRefreshTokenModel()
    const rawToken = 'expired-refresh-token-xyz'

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: new Date(Date.now() - 1000), // Expired
      isRevoked: false,
    })

    await expect(AuthService.refreshAccessToken(rawToken)).rejects.toThrow('Refresh token has expired')
  })

  it('should work with meta (userAgent, ip)', async () => {
    const user = await createUser({ email: 'meta@example.com', username: 'metauser' })
    const { rawToken } = await createRefreshToken(user._id!.toString())

    const result = await AuthService.refreshAccessToken(rawToken, {
      userAgent: 'TestBrowser/1.0',
      ip: '127.0.0.1',
    })

    expect(result.access_token).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })
})
