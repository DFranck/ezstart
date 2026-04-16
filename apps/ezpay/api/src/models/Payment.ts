import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model, Document } from 'mongoose'

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

/**
 * Factory function to get Payment model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getPaymentModel(): Promise<Model<PaymentDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', paymentSchema)
}
