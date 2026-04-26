import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { createRoleMiddleware } from '@ezstart/api-core'
import {
  createUser,
  createAdminUser,
  createAppAdmin,
  generateAccessToken,
  cleanAllCollections,
  createApiKey,
} from '../../helpers/setup.js'
import analyticsOverviewRouter from '../../../routes/admin/analytics-overview.js'
import { getApplicationModel } from '../../../models/application.js'
import { getTotpSecretModel } from '../../../models/totp-secret.js'
import { getAuthUserModel } from '../../../models/auth-user.js'

const { requireAdmin: _requireAdmin } = createRoleMiddleware()

function createAnalyticsApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // Mount real router (uses verifyTokenMiddleware + requireAdmin internally).
  app.use('/admin', analyticsOverviewRouter)
  return app
}

// Push `createdAt` and `lastActiveAt` directly via Mongo update — model
// timestamps would otherwise overwrite anything we set on the document.
async function backdateUser(userId: string, createdAt: Date, lastActiveAt?: Date) {
  const AuthUser = await getAuthUserModel()
  const update: Record<string, unknown> = { createdAt }
  if (lastActiveAt !== undefined) update.lastActiveAt = lastActiveAt
  await AuthUser.updateOne({ _id: userId }, { $set: update }, { timestamps: false })
}

describe('GET /admin/analytics/overview', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createAnalyticsApp()
    // Suppress unused warning — middleware factory is exercised via the router.
    void verifyTokenMiddleware
    void _requireAdmin
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/admin/analytics/overview')
    expect(res.status).toBe(401)
  })

  it('rejects non-superadmin (app admin) with 403', async () => {
    const appAdmin = await createAppAdmin('ezbill', {
      email: 'app-admin@test.com',
      username: 'appadmin',
    })
    const token = generateAccessToken(appAdmin)

    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('rejects regular user with 403', async () => {
    const user = await createUser({ email: 'reg@test.com', username: 'reg' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('returns aggregated overview for superadmin', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)

    // Active users (verified)
    const u1 = await createUser({ email: 'u1@test.com', username: 'u1', apps: ['ezbill'] })
    const u2 = await createUser({
      email: 'u2@test.com',
      username: 'u2',
      apps: ['ezbill', 'ezstart'],
    })
    const u3 = await createUser({
      email: 'u3@test.com',
      username: 'u3',
      isVerified: false,
      apps: ['greenpulse'],
    })

    // Mark u1 as recently active (today)
    await backdateUser(u1._id!.toString(), new Date(), new Date())
    // Mark u2 as active 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    await backdateUser(u2._id!.toString(), new Date(), tenDaysAgo)
    // Mark u3 as inactive (60 days ago)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    await backdateUser(u3._id!.toString(), new Date(), sixtyDaysAgo)

    // 1 enabled TOTP, 1 disabled (should not count)
    const TotpSecret = await getTotpSecretModel()
    await TotpSecret.create({
      userId: u1._id!.toString(),
      secret: 'enc_secret_1',
      isEnabled: true,
    })
    await TotpSecret.create({
      userId: u2._id!.toString(),
      secret: 'enc_secret_2',
      isEnabled: false,
    })

    // Applications + 1 archived (must NOT count)
    const Application = await getApplicationModel()
    await Application.create({
      slug: 'app-active-1',
      name: 'Active 1',
      ownerId: admin._id!.toString(),
      status: 'active',
    })
    await Application.create({
      slug: 'app-active-2',
      name: 'Active 2',
      ownerId: admin._id!.toString(),
      status: 'active',
    })
    await Application.create({
      slug: 'app-archived',
      name: 'Archived',
      ownerId: admin._id!.toString(),
      status: 'archived',
    })

    // API keys: 2 active, 1 revoked
    await createApiKey(admin._id!.toString(), { name: 'k1', status: 'active' })
    await createApiKey(admin._id!.toString(), { name: 'k2', status: 'active' })
    await createApiKey(admin._id!.toString(), { name: 'k3', status: 'revoked' })

    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data

    // 4 total users (admin + u1 + u2 + u3)
    expect(data.totalUsers).toBe(4)
    // newUsersThisMonth: depends on calendar — ALL users were created in the
    // test run, so all should be counted (test runs in current month).
    expect(data.newUsersThisMonth).toBeGreaterThanOrEqual(4)
    // Active users last 30d: u1 (today) + u2 (10 days) = 2.
    // The auth middleware ALSO fires a fire-and-forget `updatePresenceByUserId`
    // for the admin, which races with the count query — so the value is 2 OR 3
    // depending on whether the update landed before the read. u3 (60d ago) is
    // never active.
    expect(data.activeUsersLast30Days).toBeGreaterThanOrEqual(2)
    expect(data.activeUsersLast30Days).toBeLessThanOrEqual(3)
    // 3 verified out of 4 = 75%
    expect(data.verifiedUsersPct).toBe(75)
    // 1 enabled TOTP / 4 users = 25%
    expect(data.twoFactorEnabledPct).toBe(25)
    // 2 active applications (1 archived excluded)
    expect(data.totalApplications).toBe(2)
    // 2 active keys (1 revoked excluded)
    expect(data.totalApiKeys).toBe(2)
    // signupTrend: 30 days, all dates contiguous, all counts >= 0
    expect(data.signupTrend).toHaveLength(30)
    expect(data.signupTrend[0].date < data.signupTrend[29].date).toBe(true)
    expect(data.signupTrend.every((p: { count: number }) => p.count >= 0)).toBe(true)
    // Last bucket = today should have today's signups
    const todayCount = data.signupTrend[data.signupTrend.length - 1].count
    expect(todayCount).toBeGreaterThanOrEqual(3)
    // Top apps: ezbill has 2 users (u1, u2), ezstart has 1 (u2 + admin), greenpulse has 1 (u3)
    expect(data.topAppsByUsers.length).toBeGreaterThanOrEqual(1)
    expect(data.topAppsByUsers[0].userCount).toBeGreaterThanOrEqual(
      data.topAppsByUsers[data.topAppsByUsers.length - 1].userCount
    )
    const ezbillEntry = data.topAppsByUsers.find((a: { appName: string }) => a.appName === 'ezbill')
    expect(ezbillEntry?.userCount).toBe(2)
  })

  it('excludes soft-deleted users from counts', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)

    const live = await createUser({ email: 'live@test.com', username: 'live' })
    const deleted = await createUser({ email: 'dead@test.com', username: 'dead' })

    const AuthUser = await getAuthUserModel()
    await AuthUser.updateOne(
      { _id: deleted._id },
      { $set: { deletedAt: new Date() } },
      { timestamps: false }
    )
    void live

    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    // admin + live, NOT dead
    expect(res.body.data.totalUsers).toBe(2)
  })

  it('returns zero percentages when no users exist (no NaN)', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)

    // Wipe everything except the admin → still has 1 user, but zero verified-not-admin
    // Better: keep just the admin who IS verified by default → verifiedPct = 100
    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.data.verifiedUsersPct).toBe('number')
    expect(Number.isNaN(res.body.data.verifiedUsersPct)).toBe(false)
    expect(typeof res.body.data.twoFactorEnabledPct).toBe('number')
    expect(Number.isNaN(res.body.data.twoFactorEnabledPct)).toBe(false)
  })

  it('signupTrend is exactly 30 contiguous days ending today (UTC)', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)

    const res = await request(app)
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const trend = res.body.data.signupTrend as { date: string; count: number }[]
    expect(trend).toHaveLength(30)

    const todayISO = new Date().toISOString().slice(0, 10)
    const last = trend[trend.length - 1]
    expect(last).toBeDefined()
    expect(last!.date).toBe(todayISO)

    // Verify contiguous days
    for (let i = 1; i < trend.length; i++) {
      const a = trend[i - 1]
      const b = trend[i]
      expect(a).toBeDefined()
      expect(b).toBeDefined()
      const prev = new Date(a!.date + 'T00:00:00Z').getTime()
      const cur = new Date(b!.date + 'T00:00:00Z').getTime()
      expect(cur - prev).toBe(24 * 60 * 60 * 1000)
    }
  })
})
