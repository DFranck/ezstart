import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model, Document } from 'mongoose'

/**
 * Subscription plan metadata — structured extras attached to a Plan.
 *
 * - `grantsRoles` / `grantsFeatures` are used by the billing/subscription
 *   activation flow to materialise JWT claims for users on this plan.
 * - `feePercent` is the application fee % applied when a customer pays for
 *   THIS plan (used by EZPay's own self-hosted plans, where we charge a
 *   platform fee on Stripe Connect subscriptions).
 */
export interface PlanMetadata {
  grantsRoles?: string[]
  grantsFeatures?: string[]
  feePercent?: number
}

/**
 * Plan document — a subscription tier published by an Application owner and
 * mirrored to Stripe as a Product + Price pair.
 *
 * Ownership is determined by `applicationId` (ezauth source of truth). The
 * legacy `appName` field is kept for backwards compatibility with
 * pre-Phase-A Plan rows and the list endpoint's `?appName=` filter.
 */
export interface PlanDocument extends Document {
  name: string
  /** ezauth Application id — the plan's owner. Required for all new rows. */
  applicationId: string
  /** Deprecated — slug snapshot. Kept for backcompat / `?appName=` filters. */
  appName?: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  deletedAt?: Date | null
  sortOrder: number
  /** Stripe Product id (set by `stripe-plan-sync.syncPlanToStripe`). */
  stripeProductId?: string
  /** Stripe Price id (set by `stripe-plan-sync.syncPlanToStripe`). */
  stripePriceId?: string
  metadata?: PlanMetadata
  createdAt: Date
  updatedAt: Date
}

const planMetadataSchema = new Schema<PlanMetadata>(
  {
    grantsRoles: { type: [String], default: undefined },
    grantsFeatures: { type: [String], default: undefined },
    feePercent: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
)

const planSchema = new Schema<PlanDocument>(
  {
    name: { type: String, required: true, trim: true },
    applicationId: { type: String, required: true, index: true },
    appName: { type: String, index: true },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'EUR' },
    interval: {
      type: String,
      enum: ['month', 'year'],
      required: true,
    },
    intervalCount: { type: Number, required: true, min: 1, default: 1 },
    features: [{ type: String }],
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
    metadata: { type: planMetadataSchema, default: undefined },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Fast lookup for active plans per application
planSchema.index({ applicationId: 1, active: 1 })
// Display ordering per application
planSchema.index({ applicationId: 1, sortOrder: 1 })

/**
 * Factory function to get Plan model attached to shared connection.
 * MUST be called after connectToMongo() has been initialised.
 */
export async function getPlanModel(): Promise<Model<PlanDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.Plan || mongoose.model<PlanDocument>('Plan', planSchema)
}
