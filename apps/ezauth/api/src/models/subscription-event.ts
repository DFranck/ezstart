/**
 * SubscriptionEvent — idempotency + audit log for cross-service subscription
 * webhooks received from EZPay.
 *
 * Each row records the Stripe event id that triggered a grant/revoke. The
 * unique index on `stripeEventId` guarantees that replays (Stripe natively
 * retries failed webhooks up to 3 days) never double-apply the same grants.
 *
 * The document also doubles as an audit log — `appliedAt` + `grantsRoles` +
 * `grantsFeatures` preserve exactly what was applied to the user when the
 * event landed.
 *
 * @module apps/ezauth/api/src/models/subscription-event
 */
import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Subscription lifecycle status forwarded by EZPay. Mirrors Stripe's own
 * `subscription.status` enum minus the `incomplete_expired` / `paused`
 * variants that EZPay maps into `past_due` / `canceled` before forwarding.
 */
export type SubscriptionEventStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

export interface SubscriptionEventDocument extends Document {
  /** Stripe event id (`evt_*`) — idempotency key, unique. */
  stripeEventId: string
  /** Stripe subscription id (`sub_*`). */
  subscriptionId: string
  /** ezauth user id. */
  userId: string
  /** ezauth Application id. */
  applicationId: string
  /** Lifecycle status applied on this event. */
  status: SubscriptionEventStatus
  /** Roles granted (or revoked if `status === 'canceled'`). */
  grantsRoles?: string[]
  /** Features granted (or revoked if `status === 'canceled'`). */
  grantsFeatures?: string[]
  /** When the grant/revoke was materialised on the user doc. */
  appliedAt: Date
  createdAt: Date
  updatedAt: Date
}

const subscriptionEventSchema = new Schema<SubscriptionEventDocument>(
  {
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
      required: true,
    },
    grantsRoles: {
      type: [String],
      default: undefined,
    },
    grantsFeatures: {
      type: [String],
      default: undefined,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'subscription_events',
    bufferCommands: false,
  }
)

/**
 * Factory function to get the SubscriptionEvent model attached to the shared
 * ezauth Mongo connection.
 *
 * MUST be called after `connectToMongo('ezauth')` has been initialised.
 */
export async function getSubscriptionEventModel(): Promise<Model<SubscriptionEventDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.SubscriptionEvent ||
    mongoose.model<SubscriptionEventDocument>('SubscriptionEvent', subscriptionEventSchema)
  )
}
