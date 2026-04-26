import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import meOAuthProvidersRouter from '../../../routes/auth/me-oauth-providers.js'
import { createUser, generateAccessToken, cleanAllCollections } from '../../helpers/setup.js'
import { getOAuthAccountModel } from '../../../models/oauth-account.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', meOAuthProvidersRouter)
  return app
}

async function linkOAuthAccount(opts: {
  userId: string
  provider?: 'google' | 'github' | 'facebook' | 'apple'
  providerId?: string
  email?: string
  displayName?: string
}) {
  const OAuthAccount = await getOAuthAccountModel()
  const provider = opts.provider ?? 'google'
  return OAuthAccount.create({
    userId: opts.userId,
    provider,
    providerId: opts.providerId ?? `${provider}-${Date.now()}-${Math.random()}`,
    email: opts.email ?? 'oauth@example.com',
    displayName: opts.displayName ?? 'OAuth User',
    profile: { sub: 'fake' },
  })
}

describe('GET /api/auth/me/oauth-providers', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const app = createTestApp()
    const res = await request(app).get('/api/auth/me/oauth-providers')
    expect(res.status).toBe(401)
  })

  it('returns an empty list when the user has no providers connected', async () => {
    const user = await createUser({ email: 'noproviders@example.com', username: 'noproviders' })
    const token = generateAccessToken(user)
    const app = createTestApp()

    const res = await request(app)
      .get('/api/auth/me/oauth-providers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.providers).toEqual([])
  })

  it('returns each connected provider with email + connectedAt', async () => {
    const user = await createUser({ email: 'multi@example.com', username: 'multi' })
    await linkOAuthAccount({
      userId: user._id!.toString(),
      provider: 'google',
      email: 'multi@gmail.com',
      displayName: 'Multi User',
    })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .get('/api/auth/me/oauth-providers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.providers).toHaveLength(1)
    expect(res.body.data.providers[0]).toMatchObject({
      provider: 'google',
      email: 'multi@gmail.com',
      displayName: 'Multi User',
    })
    expect(typeof res.body.data.providers[0].connectedAt).toBe('string')
  })

  it('only returns providers belonging to the current user', async () => {
    const user = await createUser({ email: 'mine@example.com', username: 'mine' })
    const otherUser = await createUser({ email: 'other@example.com', username: 'other' })

    await linkOAuthAccount({ userId: user._id!.toString(), provider: 'google' })
    await linkOAuthAccount({ userId: otherUser._id!.toString(), provider: 'google' })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .get('/api/auth/me/oauth-providers')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.providers).toHaveLength(1)
  })
})

describe('DELETE /api/auth/me/oauth-providers/:provider', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const app = createTestApp()
    const res = await request(app).delete('/api/auth/me/oauth-providers/google')
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unsupported provider', async () => {
    const user = await createUser({ email: 'bad@example.com', username: 'baduser' })
    const token = generateAccessToken(user)
    const app = createTestApp()

    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/myspace')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('returns 404 when the provider is not connected', async () => {
    const user = await createUser({ email: 'no@example.com', username: 'noprovider' })
    const token = generateAccessToken(user)
    const app = createTestApp()

    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/google')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('disconnects a provider when the user has a password', async () => {
    const user = await createUser({
      email: 'haspass@example.com',
      username: 'haspass',
      password: 'Password123!',
      hasSetOwnPassword: true,
    })
    await linkOAuthAccount({ userId: user._id!.toString(), provider: 'google' })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/google')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const OAuthAccount = await getOAuthAccountModel()
    const remaining = await OAuthAccount.findOne({
      userId: user._id,
      provider: 'google',
    })
    expect(remaining).toBeNull()
  })

  it('refuses to disconnect when it is the last login method (no password)', async () => {
    const user = await createUser({
      email: 'oauth-only@example.com',
      username: 'oauthonly',
      hasSetOwnPassword: false,
    })
    // Strip the password to fully simulate an OAuth-only account.
    const { getAuthUserModel } = await import('../../../models/auth-user.js')
    const AuthUser = await getAuthUserModel()
    await AuthUser.updateOne(
      { _id: user._id },
      { $unset: { passwordHash: 1 }, $set: { hasSetOwnPassword: false } }
    )

    await linkOAuthAccount({ userId: user._id!.toString(), provider: 'google' })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/google')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(409)
    expect(res.body.error?.message).toMatch(/Cannot remove last login method/i)

    // The provider should still be there.
    const OAuthAccount = await getOAuthAccountModel()
    const remaining = await OAuthAccount.findOne({
      userId: user._id,
      provider: 'google',
    })
    expect(remaining).not.toBeNull()
  })

  it('allows disconnecting one of several providers when no password is set', async () => {
    const user = await createUser({
      email: 'multi-oauth@example.com',
      username: 'multioauth',
      hasSetOwnPassword: false,
    })
    const { getAuthUserModel } = await import('../../../models/auth-user.js')
    const AuthUser = await getAuthUserModel()
    await AuthUser.updateOne(
      { _id: user._id },
      { $unset: { passwordHash: 1 }, $set: { hasSetOwnPassword: false } }
    )

    await linkOAuthAccount({ userId: user._id!.toString(), provider: 'google' })
    await linkOAuthAccount({ userId: user._id!.toString(), provider: 'github' })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/google')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const OAuthAccount = await getOAuthAccountModel()
    const left = await OAuthAccount.find({ userId: user._id })
    expect(left).toHaveLength(1)
    expect(left[0]?.provider).toBe('github')
  })

  it('only disconnects providers belonging to the current user', async () => {
    const user = await createUser({ email: 'a@example.com', username: 'usera' })
    const otherUser = await createUser({ email: 'b@example.com', username: 'userb' })

    await linkOAuthAccount({ userId: otherUser._id!.toString(), provider: 'google' })

    const token = generateAccessToken(user)
    const app = createTestApp()
    const res = await request(app)
      .delete('/api/auth/me/oauth-providers/google')
      .set('Authorization', `Bearer ${token}`)

    // The current user has no google provider — must 404 rather than touching
    // the other user's record.
    expect(res.status).toBe(404)

    const OAuthAccount = await getOAuthAccountModel()
    const stillThere = await OAuthAccount.findOne({
      userId: otherUser._id,
      provider: 'google',
    })
    expect(stillThere).not.toBeNull()
  })
})
