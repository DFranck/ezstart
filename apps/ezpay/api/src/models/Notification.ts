/**
 * EZPay user notification model — backs the persistent banner shown by the
 * `<PastDueBanner>` SDK component (and any future per-user banner).
 *
 * Pattern: a webhook handler writes a Notification row when a billing
 * event needs the user's attention (`past_due`, `invoice_failed`,
 * `subscription_cancelled`). The consumer dashboard polls or subscribes
 * to its open notifications and renders them. When the underlying event
 * resolves (e.g. `invoice.payment_succeeded` after past_due), the
 * webhook handler deletes the matching notifications via `persistUntil`.
 *
 * `persistUntil` is a free-form event tag (`'payment_recovery'`,
 * `'subscription_renewed'`, etc.) — webhook handlers grep on it to
 * find rows to clean up. It avoids hard-coding cleanup logic per
 * notification type.
 */

import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

export type NotificationType =
  | 'past_due'
  | 'invoice_failed'
  | 'subscription_cancelled'
  | 'subscription_recovered'

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

export interface NotificationDocument extends Document {
  /** Owner of the notification (ezauth user id). */
  userId: string
  /** Optional Application scope — null for platform-wide notifications. */
  applicationId?: string
  /** Notification kind — drives the rendered icon / copy on the banner. */
  type: NotificationType
  /** Visual severity — maps to `<Card intent>` on the SDK side. */
  severity: NotificationSeverity
  /** Short human-readable message (consumers may override per-locale). */
  message: string
  /** Optional CTA URL (e.g. `/billing?action=update-payment`). */
  actionUrl?: string
  /**
   * Free-form event tag. Webhook handlers later delete notifications
   * matching `{ persistUntil: '<event>' }` once the underlying issue
   * is resolved. Examples: `'payment_recovery'`, `'subscription_renewed'`.
   */
  persistUntil?: string
  /** Optional metadata (subscriptionId, invoiceId, etc.) for debug / UI. */
  metadata?: Record<string, unknown>
  /** Set once the user dismisses or reads the notification. */
  readAt?: Date
  createdAt: Date
  updatedAt: Date
  /**
   * Stripe-pattern test/live partition. Inherited from `req.derivedMode`
   * when the notification originates from a webhook (live vs test event).
   */
  isTestMode: boolean
}

const NOTIFICATION_TYPES: NotificationType[] = [
  'past_due',
  'invoice_failed',
  'subscription_cancelled',
  'subscription_recovered',
]

const NOTIFICATION_SEVERITIES: NotificationSeverity[] = ['info', 'warning', 'error', 'success']

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: String, required: true, index: true },
    applicationId: { type: String, index: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES, index: true },
    severity: { type: String, required: true, enum: NOTIFICATION_SEVERITIES, default: 'info' },
    message: { type: String, required: true },
    actionUrl: { type: String },
    persistUntil: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date },
    isTestMode: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true, bufferCommands: false }
)

notificationSchema.plugin(testModeScopePlugin)

// Compound indexes for the common queries: "fetch open notifs for a user"
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1, persistUntil: 1 })

/**
 * Factory — returns the singleton `Notification` model attached to the
 * shared mongoose connection. Mirrors the project-wide pattern from
 * `mongodb.md` (factory + `bufferCommands: false`).
 */
export async function getNotificationModel(): Promise<Model<NotificationDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return (
    (mongoose.models.Notification as Model<NotificationDocument> | undefined) ??
    mongoose.model<NotificationDocument>('Notification', notificationSchema)
  )
}
