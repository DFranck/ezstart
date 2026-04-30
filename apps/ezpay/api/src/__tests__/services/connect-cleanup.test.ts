/**
 * Tests for `services/connect-cleanup.ts`.
 *
 * Cover the two-step lifecycle:
 * - Hard-delete pending rows older than 7 days.
 * - Send J-6 expiry warning email exactly once per row (idempotency guard).
 * - Re-running mid-cycle is a no-op (no double sends, no double deletes).
 * - Email-send failures do NOT flip the flag (so the next tick retries).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

// Mock the email service singleton — the cleanup module imports it lazily
// at runtime via `import { emailService } from './email.service.js'`.
const sendMock = vi.fn().mockResolvedValue({ id: 'mock-email-id' })
vi.mock('../../services/email.service.js', () => ({
  emailService: {
    send: sendMock,
  },
}))

// Dynamic import AFTER the mock so the cleanup module binds to it.
const cleanupMod = await import('../../services/connect-cleanup.js')

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

describe('cleanupExpiredPendingConnects', () => {
  let ConnectedAccount: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccount = await getConnectedAccountModel()
    try {
      await ConnectedAccount.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ConnectedAccount.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    sendMock.mockClear()
    sendMock.mockResolvedValue({ id: 'mock-email-id' })
  })

  it('hard-deletes pending rows older than 7 days', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-old',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_old',
      email: 'old@example.com',
      businessName: 'Old',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    // Force createdAt past 7d. Mongoose sets timestamps on insert; we override
    // here. The `timestamps: false` option suppresses any auto-touch on this
    // single update.
    // Directly mutate via the native collection — Mongoose's `updateOne`
    // refuses to overwrite `createdAt` when `timestamps: true` is on the
    // schema, so we bypass the ODM layer for this single test fixture.
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: eightDaysAgo } }
    )
    const verify = await ConnectedAccount.findById(acc._id).lean()
    expect(verify?.createdAt.getTime()).toBe(eightDaysAgo.getTime())

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.deleted).toBe(1)
    expect(result.warned).toBe(0)
    const remaining = await ConnectedAccount.findById(acc._id).lean()
    expect(remaining).toBeNull()
  })

  it('does NOT delete pending rows younger than 7 days', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-young',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_young',
      email: 'young@example.com',
      businessName: 'Young',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: fiveDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.deleted).toBe(0)
    const remaining = await ConnectedAccount.findById(acc._id).lean()
    expect(remaining).not.toBeNull()
  })

  it('does NOT delete non-pending rows even when older than 7 days', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-active',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_active',
      email: 'active@example.com',
      businessName: 'Active',
      accountType: 'standard',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: tenDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.deleted).toBe(0)
    const remaining = await ConnectedAccount.findById(acc._id).lean()
    expect(remaining).not.toBeNull()
  })

  it('sends J-6 warning email for pending rows in the [6d, 7d) window', async () => {
    // Row is 6.5 days old — squarely in the warning window.
    const sixAndHalfDaysAgo = new Date(Date.now() - SIX_DAYS_MS - 12 * ONE_HOUR_MS)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-warn',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_warn',
      email: 'warn@example.com',
      businessName: 'WarnBiz',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: sixAndHalfDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.warned).toBe(1)
    expect(result.deleted).toBe(0)
    expect(sendMock).toHaveBeenCalledTimes(1)
    const sendArgs = sendMock.mock.calls[0]?.[0] as {
      to: string
      subject: string
      html: string
      text: string
    }
    expect(sendArgs.to).toBe('warn@example.com')
    expect(sendArgs.subject).toContain('EZPay')
    expect(sendArgs.html).toContain('WarnBiz')

    // Idempotency flag flipped.
    const reloaded = await ConnectedAccount.findById(acc._id).lean()
    expect(reloaded?.expiryWarningEmailSent).toBe(true)
  })

  it('idempotent: re-running does not double-send the warning email', async () => {
    const sixAndHalfDaysAgo = new Date(Date.now() - SIX_DAYS_MS - 12 * ONE_HOUR_MS)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-warn-2',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_warn_2',
      email: 'warn2@example.com',
      businessName: 'WarnBiz2',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: sixAndHalfDaysAgo } }
    )

    const first = await cleanupMod.cleanupExpiredPendingConnects()
    const second = await cleanupMod.cleanupExpiredPendingConnects()

    expect(first.warned).toBe(1)
    expect(second.warned).toBe(0)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT email rows already flagged expiryWarningEmailSent=true', async () => {
    const sixAndHalfDaysAgo = new Date(Date.now() - SIX_DAYS_MS - 12 * ONE_HOUR_MS)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-already-warned',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_already',
      email: 'already@example.com',
      businessName: 'AlreadyBiz',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
      expiryWarningEmailSent: true,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: sixAndHalfDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.warned).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('email-send failure does NOT flip the flag (next tick retries)', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))
    const sixAndHalfDaysAgo = new Date(Date.now() - SIX_DAYS_MS - 12 * ONE_HOUR_MS)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-retry',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_retry',
      email: 'retry@example.com',
      businessName: 'RetryBiz',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: sixAndHalfDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.warned).toBe(0)
    expect(result.warnFailed).toBe(1)
    const reloaded = await ConnectedAccount.findById(acc._id).lean()
    expect(reloaded?.expiryWarningEmailSent).toBe(false)
  })

  it('does NOT email pending rows younger than 6 days', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-too-young',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_young2',
      email: 'youngwarn@example.com',
      businessName: 'TooYoung',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: fiveDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.warned).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('handles a mixed batch (delete + warn + skip) atomically', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const sixAndHalfDaysAgo = new Date(Date.now() - SIX_DAYS_MS - 12 * ONE_HOUR_MS)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

    // Will be deleted.
    const expired = await ConnectedAccount.create({
      applicationId: 'app-expired',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_e1',
      email: 'e1@example.com',
      businessName: 'E1',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: expired._id },
      { $set: { createdAt: eightDaysAgo } }
    )

    // Will be warned.
    const warning = await ConnectedAccount.create({
      applicationId: 'app-warning',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_w1',
      email: 'w1@example.com',
      businessName: 'W1',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: warning._id },
      { $set: { createdAt: sixAndHalfDaysAgo } }
    )

    // Will be skipped (too young).
    const young = await ConnectedAccount.create({
      applicationId: 'app-young',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_y1',
      email: 'y1@example.com',
      businessName: 'Y1',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: young._id },
      { $set: { createdAt: fiveDaysAgo } }
    )

    const result = await cleanupMod.cleanupExpiredPendingConnects()

    expect(result.deleted).toBe(1)
    expect(result.warned).toBe(1)
    expect(result.warnFailed).toBe(0)

    expect(await ConnectedAccount.findById(expired._id).lean()).toBeNull()
    const warnedRow = await ConnectedAccount.findById(warning._id).lean()
    expect(warnedRow?.expiryWarningEmailSent).toBe(true)
    const youngRow = await ConnectedAccount.findById(young._id).lean()
    expect(youngRow?.expiryWarningEmailSent).toBe(false)
  })
})
