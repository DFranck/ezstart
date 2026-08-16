/**
 * RFC 6749 §4.1.3 cross-check tests for the token exchange endpoint.
 *
 * Covers HAC-HIGH-4 — once an auth code is issued with a `redirect_uri`,
 * the subsequent /token request MUST present the SAME value. Mismatch /
 * surprise-presence of a `redirect_uri` is treated as a hostile attempt
 * (authcode injection) and rejected with the generic
 * "Invalid or expired authorization code" message — no oracle for an
 * attacker that intercepted the code.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../../services/auth.service.js'
import { createUser, createAuthCode, cleanAllCollections } from '../../helpers/setup.js'

const REGISTERED_URI = 'https://app1.example.com/auth/callback'

describe('exchangeCodeForToken — redirect_uri cross-check (HAC-HIGH-4)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('accepts /token when redirect_uri matches the one the code was issued with', async () => {
    const user = await createUser({ email: 'match@example.com', username: 'matchuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
      redirectUri: REGISTERED_URI,
    })

    const result = await AuthService.exchangeCodeForToken({
      code: authCode.code,
      app: 'ezstart',
      redirect_uri: REGISTERED_URI,
    })

    expect(result.access_token).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.user.email).toBe('match@example.com')
  })

  it('rejects /token when redirect_uri DIFFERS from the one used at /authorize (injection)', async () => {
    const user = await createUser({ email: 'inject@example.com', username: 'injectuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
      redirectUri: REGISTERED_URI,
    })

    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        redirect_uri: 'https://attacker.example.com/steal',
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('rejects /token when redirect_uri is OMITTED but the code was issued with one', async () => {
    const user = await createUser({ email: 'omit@example.com', username: 'omituser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
      redirectUri: REGISTERED_URI,
    })

    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        // redirect_uri intentionally omitted
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('rejects /token when redirect_uri is PRESENT but the code was issued without one', async () => {
    const user = await createUser({ email: 'surprise@example.com', username: 'surpriseuser' })
    // createAuthCode default does NOT set redirectUri
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        redirect_uri: 'https://attacker.example.com/steal',
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('accepts /token with no redirect_uri when the code was issued without one (legacy flow)', async () => {
    const user = await createUser({ email: 'legacy@example.com', username: 'legacyuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

    const result = await AuthService.exchangeCodeForToken({
      code: authCode.code,
      app: 'ezstart',
    })

    expect(result.access_token).toBeTruthy()
  })

  it('rejects /token on trailing-slash drift (exact-match semantics)', async () => {
    const user = await createUser({ email: 'trail@example.com', username: 'trailuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
      redirectUri: REGISTERED_URI,
    })

    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        redirect_uri: REGISTERED_URI + '/',
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('does NOT consume the auth code when redirect_uri mismatches (replay surface stays closed)', async () => {
    const user = await createUser({ email: 'replay@example.com', username: 'replayuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
      redirectUri: REGISTERED_URI,
    })

    // First attempt — wrong redirect_uri, must fail
    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        redirect_uri: 'https://attacker.example.com/steal',
      })
    ).rejects.toThrow('Invalid or expired authorization code')

    // Second attempt — correct redirect_uri, must still succeed because the
    // first attempt rejected BEFORE the `isUsed = true` save.
    const result = await AuthService.exchangeCodeForToken({
      code: authCode.code,
      app: 'ezstart',
      redirect_uri: REGISTERED_URI,
    })
    expect(result.access_token).toBeTruthy()
  })
})
