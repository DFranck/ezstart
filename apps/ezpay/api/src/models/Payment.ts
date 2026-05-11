import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model, Document } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

export interface DonationMetadata {
  message?: string
  isPublic?: boolean
}

export interface PurchaseMetadata {
  productId?: string
  productName?: string
  quantity?: number
}

export interface SubscriptionMetadata {
  subscriptionId?: string
  planId?: string
  planName?: string
  interval?: 'month'
  intervalCount?: number
  features?: string[]
  /**
   * Raw Stripe subscription status snapshot (e.g. `'active'`, `'past_due'`,
   * `'trialing'`, `'unpaid'`). Persisted on every `customer.subscription.*`
   * webhook so consumers (and the dunning service) can detect transitions
   * without re-querying Stripe.
   */
  subscriptionStatus?: string
  /** Stripe billing reason snapshot (`'subscription_create'`, `'subscription_cycle'`, …). */
  billingReason?: string
  /** Period end snapshot (ISO string from the latest invoice). */
  periodEnd?: string
  /** Renewal lineage — id of the original subscription Payment row. */
  renewalOf?: string
}

export interface InvoiceMetadata {
  invoiceId?: string
  invoiceNumber?: string
}

export interface PromoMetadata {
  promoCode?: string
  originalAmount?: number
  discountApplied?: number
}

/** Combined metadata type — all fields optional, used fields depend on payment type */
export type PaymentMetadata = DonationMetadata &
  PurchaseMetadata &
  SubscriptionMetadata &
  InvoiceMetadata &
  PromoMetadata

export interface PaymentDocument extends Document {
  // Project Info
  projectId: string
  projectName: string

  // Payment Type
  type: 'donation' | 'purchase' | 'subscription' | 'invoice'

  // Amount
  amount: number
  currency: string

  // Customer Info (link avec EZAuth si connecté)
  userId?: string
  customerName?: string
  customerEmail?: string
  isAnonymous: boolean

  // Payment Details
  provider: 'stripe' | 'paypal'
  paymentId: string
  stripePaymentIntentId?: string
  paymentMethod?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

  // Metadata (type-specific fields)
  metadata?: PaymentMetadata

  // Subscription cancellation
  cancelAtPeriodEnd: boolean
  currentPeriodEnd?: Date

  // Environment
  liveMode: boolean

  /**
   * Stripe-pattern test/live partition (`standard-saas-data.md` §4).
   * Mirror of `!liveMode` for the cross-app `testModeScopePlugin` —
   * `liveMode: true` ↔ `isTestMode: false`, `liveMode: false` ↔
   * `isTestMode: true`. Both are kept in sync at write time
   * (see routes/donations/create.ts, purchases/create.ts, ...).
   *
   * Migration `migrate-add-is-test-mode.ts` backfills existing docs.
   */
  isTestMode: boolean

  // Dates
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    // Project Info
    projectId: { type: String, required: true, index: true },
    projectName: { type: String, required: true },

    // Payment Type
    type: {
      type: String,
      enum: ['donation', 'purchase', 'subscription', 'invoice', 'testimonial'],
      required: true,
      index: true,
    },

    // Amount
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR' },

    // Customer Info (link avec EZAuth si connecté)
    userId: { type: String, index: true },
    customerName: { type: String },
    customerEmail: { type: String },
    isAnonymous: { type: Boolean, default: false },

    // Payment Details
    // Only Stripe is currently integrated. PayPal kept in enum for future support.
    provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
    paymentId: { type: String, unique: true },
    stripePaymentIntentId: { type: String, index: true },
    paymentMethod: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Metadata (flexible pour différents use cases)
    metadata: {
      // Pour donations
      message: { type: String, maxlength: 500 },
      isPublic: { type: Boolean, default: true },

      // Pour purchases
      productId: { type: String },
      productName: { type: String },
      quantity: { type: Number },

      // Pour subscriptions
      subscriptionId: { type: String },
      planId: { type: String },
      planName: { type: String },
      interval: { type: String, enum: ['month'], default: 'month' },
      intervalCount: { type: Number, default: 1 },

      // Pour invoices
      invoiceId: { type: String },
      invoiceNumber: { type: String },

      // Plan features snapshot (captured at checkout time)
      features: [{ type: String }],

      // Pour promo codes
      promoCode: { type: String },
      originalAmount: { type: Number },
      discountApplied: { type: Number },
    },

    // Subscription cancellation
    cancelAtPeriodEnd: { type: Boolean, default: false },
    currentPeriodEnd: { type: Date },

    // Environment — separates test data from production data
    liveMode: { type: Boolean, default: false, index: true },

    // Stripe-pattern test/live partition mirror of `!liveMode`.
    // Default true to match `liveMode: false` default (un-set → test mode).
    isTestMode: { type: Boolean, default: true, index: true },

    // Dates
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    bufferCommands: false, // Disable buffering for fail-fast
  }
)

// Indexes pour performance
paymentSchema.index({ projectId: 1, createdAt: -1 })
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ type: 1, status: 1 })

// TTL auto-purge for test data — documents with isTestMode:true are deleted
// after 24h. Keeps sandbox/playground flows from polluting the database
// across dev, staging, and prod. Live payments (isTestMode:false) are never
// touched by this index (partial filter expression).
paymentSchema.index(
  { createdAt: 1 },
  {
    name: 'test_mode_ttl_24h',
    expireAfterSeconds: 86400,
    partialFilterExpression: { isTestMode: true },
  }
)

// Stripe-pattern test/live partition (`standard-saas-data.md` §4) — auto-scope
// every read by `req.derivedMode` propagated via AsyncLocalStorage.
paymentSchema.plugin(testModeScopePlugin)

/**
 * Factory function to get Payment model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getPaymentModel(): Promise<Model<PaymentDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', paymentSchema)
}
