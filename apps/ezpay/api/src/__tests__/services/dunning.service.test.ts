/**
 * Dunning service tests — covers the past_due / recovered / final
 * cancellation flows. Uses MongoMemoryServer (via `setupTestDatabase`)
 * so the Notification + AuditLog rows are real DB inserts.
 *
 * Email sends are stubbed via the existing `email.service` ConsoleProvider
 * fallback (no `RESEND_API_KEY` in test env → emails are logged, not
 * sent). We assert the side-effect rows in DB and the audit entries.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  handlePastDue,
  handleRecovered,
  handleFinalCancellation,
} from '../../services/dunning.service.js'
import { getNotificationModel, type NotificationDocument } from '../../models/Notification.js'
import { getAuditLogModel, type AuditLogDocument } from '../../models/audit-log.js'
import type { Model } from 'mongoose'

// Stub email.service so the test never hits Resend.
vi.mock('../../services/email.service.js', () => ({
  emailService: {
    send: vi.fn().mockResolvedValue({ id: 'mock', success: true }),
  },
}))

import { emailService } from '../../services/email.service.js'

describe('Dunning service', () => {
  let Notification: Model<NotificationDocument>
  let AuditLog: Model<AuditLogDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Notification = await getNotificationModel()
    AuditLog = await getAuditLogModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Notification.deleteMany({})
    await AuditLog.deleteMany({})
    vi.mocked(emailService.send).mockClear()
  })

  describe('handlePastDue', () => {
    it('inserts a past_due notification with persistUntil=payment_recovery', async () => {
      await handlePastDue({
        userId: 'user_1',
        projectId: 'ezbill',
        customerEmail: 'alice@example.com',
        customerName: 'Alice',
        planName: 'Pro',
        subscriptionId: 'sub_1',
        isTestMode: true,
        amount: 19.99,
        currency: 'EUR',
      })

      const notif = await Notification.findOne({ userId: 'user_1', type: 'past_due' })
      expect(notif).not.toBeNull()
      expect(notif?.severity).toBe('warning')
      expect(notif?.persistUntil).toBe('payment_recovery')
      expect(notif?.applicationId).toBe('ezbill')
      expect(notif?.actionUrl).toMatch(/billing/)
      expect(notif?.isTestMode).toBe(true)
    })

    it('writes a subscription.past_due audit log entry', async () => {
      await handlePastDue({
        userId: 'user_2',
        projectId: 'ezpay',
        customerEmail: 'bob@example.com',
        subscriptionId: 'sub_2',
        isTestMode: false,
        amount: 9,
        currency: 'USD',
      })

      // audit-log writes are fire-and-forget — give the queue a microtask
      await new Promise(r => setTimeout(r, 10))
      const audit = await AuditLog.findOne({
        userId: 'user_2',
        action: 'subscription.past_due',
      })
      expect(audit).not.toBeNull()
      expect(audit?.metadata?.subscriptionId).toBe('sub_2')
    })

    it('sends a past_due email to the customer when an email is present', async () => {
      await handlePastDue({
        userId: 'user_3',
        projectId: 'ezbill',
        customerEmail: 'charlie@example.com',
        customerName: 'Charlie',
        planName: 'Team',
        subscriptionId: 'sub_3',
        isTestMode: false,
        amount: 49,
        currency: 'EUR',
      })

      expect(emailService.send).toHaveBeenCalledTimes(1)
      const call = vi.mocked(emailService.send).mock.calls[0]?.[0]
      expect(call?.to).toBe('charlie@example.com')
      expect(call?.subject).toMatch(/payment|paiement/i)
      expect(call?.html).toContain('Team')
    })

    it('skips the email send (still inserts the notification) when customer email is missing', async () => {
      await handlePastDue({
        userId: 'user_4',
        projectId: 'ezpay',
        subscriptionId: 'sub_4',
        isTestMode: false,
        amount: 5,
        currency: 'USD',
      })

      expect(emailService.send).not.toHaveBeenCalled()
      const notif = await Notification.findOne({ userId: 'user_4', type: 'past_due' })
      expect(notif).not.toBeNull()
    })
  })

  describe('handleRecovered', () => {
    it('clears all past_due notifications for the user on recovery', async () => {
      // Seed a past_due banner first.
      await Notification.create({
        userId: 'user_5',
        applicationId: 'ezbill',
        type: 'past_due',
        severity: 'warning',
        message: 'Payment failed',
        persistUntil: 'payment_recovery',
        isTestMode: false,
      })

      await handleRecovered({
        userId: 'user_5',
        projectId: 'ezbill',
        customerEmail: 'dora@example.com',
        planName: 'Pro',
        subscriptionId: 'sub_5',
        isTestMode: false,
        amount: 19,
        currency: 'EUR',
      })

      const remaining = await Notification.findOne({ userId: 'user_5', type: 'past_due' })
      expect(remaining).toBeNull()
    })

    it('writes a subscription.recovered audit entry and sends the recovery email', async () => {
      await handleRecovered({
        userId: 'user_6',
        projectId: 'ezbill',
        customerEmail: 'eve@example.com',
        customerName: 'Eve',
        planName: 'Pro',
        subscriptionId: 'sub_6',
        isTestMode: false,
        amount: 19,
        currency: 'EUR',
      })

      await new Promise(r => setTimeout(r, 10))
      const audit = await AuditLog.findOne({
        userId: 'user_6',
        action: 'subscription.recovered',
      })
      expect(audit).not.toBeNull()

      expect(emailService.send).toHaveBeenCalledTimes(1)
      const call = vi.mocked(emailService.send).mock.calls[0]?.[0]
      expect(call?.to).toBe('eve@example.com')
      expect(call?.subject).toMatch(/success|merci|cảm ơn/i)
    })
  })

  describe('handleFinalCancellation', () => {
    it('drops past_due banners and writes a subscription_cancelled notification', async () => {
      // User had a past_due banner pending.
      await Notification.create({
        userId: 'user_7',
        applicationId: 'ezbill',
        type: 'past_due',
        severity: 'warning',
        message: 'Payment failed',
        persistUntil: 'payment_recovery',
        isTestMode: false,
      })

      await handleFinalCancellation({
        userId: 'user_7',
        projectId: 'ezbill',
        customerEmail: 'frank@example.com',
        customerName: 'Frank',
        planName: 'Pro',
        subscriptionId: 'sub_7',
        isTestMode: false,
      })

      const pastDue = await Notification.findOne({ userId: 'user_7', type: 'past_due' })
      expect(pastDue).toBeNull()

      const cancelled = await Notification.findOne({
        userId: 'user_7',
        type: 'subscription_cancelled',
      })
      expect(cancelled).not.toBeNull()
      expect(cancelled?.severity).toBe('error')
      expect(cancelled?.persistUntil).toBe('subscription_renewed')
    })

    it('sends the final cancellation email to the customer', async () => {
      await handleFinalCancellation({
        userId: 'user_8',
        projectId: 'ezbill',
        customerEmail: 'grace@example.com',
        customerName: 'Grace',
        planName: 'Pro',
        subscriptionId: 'sub_8',
        isTestMode: false,
      })

      expect(emailService.send).toHaveBeenCalledTimes(1)
      const call = vi.mocked(emailService.send).mock.calls[0]?.[0]
      expect(call?.to).toBe('grace@example.com')
      expect(call?.subject).toMatch(/cancel|annulé|huỷ/i)
    })
  })
})
