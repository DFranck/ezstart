import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Model, type Document } from 'mongoose'

/**
 * Metadata stored when a ConnectedAccount is converted from one Stripe
 * account to another (e.g. migrated from the shared platform account to
 * a dedicated external Connect account, or vice versa). This is an audit
 * trail for superadmin-initiated switches via `PATCH /api/connect/accounts/:applicationId`.
 */
export interface ConnectedAccountTransitionMetadata {
  /** The `stripeAccountId` this account had BEFORE the transition. */
  previousStripeAccountId?: string
  /** When the transition occurred. */
  transitionedAt?: Date
  /** UserId of the superadmin who performed the transition. */
  transitionedBy?: string
}

export interface ConnectedAccountDocument extends Document {
  /**
   * EZStart Application id this account belongs to (source-of-truth in ezauth).
   * One ConnectedAccount per Application — unique at the DB level.
   */
  applicationId: string
  /**
   * Owner userId (the user who linked the account OR `'system'` for platform
   * dogfood accounts seeded by the migration). NOT unique — a single user may
   * own multiple Applications and therefore multiple ConnectedAccounts.
   */
  userId: string
  /**
   * `true` when this account points at the shared EZStart LLC Stripe account
   * used for platform (dogfood) apps. `false` when the app has onboarded its
   * own external Stripe account via Connect.
   */
  isPlatformAccount: boolean
  stripeAccountId: string
  email: string
  businessName: string
  accountType: 'standard' | 'express'
  status: 'pending' | 'active' | 'restricted' | 'disabled'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: Date | null
  /** Audit metadata for conversions (platform ↔ external). */
  metadata?: ConnectedAccountTransitionMetadata
  createdAt: Date
  updatedAt: Date
}

const transitionMetadataSchema = new Schema<ConnectedAccountTransitionMetadata>(
  {
    previousStripeAccountId: { type: String },
    transitionedAt: { type: Date },
    transitionedBy: { type: String },
  },
  { _id: false }
)

const connectedAccountSchema = new Schema<ConnectedAccountDocument>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    isPlatformAccount: { type: Boolean, default: false, index: true },
    stripeAccountId: { type: String, required: true },
    email: { type: String, required: true },
    businessName: { type: String, required: true },
    accountType: {
      type: String,
      enum: ['standard', 'express'],
      default: 'standard',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'restricted', 'disabled'],
      default: 'pending',
      index: true,
    },
    chargesEnabled: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
    defaultFeePercent: { type: Number, default: 3, min: 0, max: 100 },
    onboardedAt: { type: Date, default: null },
    metadata: { type: transitionMetadataSchema, default: undefined },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// ------------------------------------------------------------------
// Indexes
// ------------------------------------------------------------------
//
// `stripeAccountId` must be unique across external Connect accounts (two
// different Applications cannot share the same external `acct_*`), BUT all
// platform (`isPlatformAccount: true`) rows legitimately share the single
// EZStart LLC Stripe account. The partial index below enforces uniqueness
// only on external accounts and leaves the platform rows unconstrained.
connectedAccountSchema.index(
  { stripeAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: { isPlatformAccount: false },
    name: 'stripeAccountId_external_unique',
  }
)

/**
 * Factory function to get ConnectedAccount model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getConnectedAccountModel(): Promise<Model<ConnectedAccountDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return (
    mongoose.models.ConnectedAccount ||
    mongoose.model<ConnectedAccountDocument>('ConnectedAccount', connectedAccountSchema)
  )
}
