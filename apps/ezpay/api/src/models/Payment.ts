import { Schema, model } from 'mongoose'

const paymentSchema = new Schema(
  {
    // Project Info
    projectId: { type: String, required: true, index: true },
    projectName: { type: String, required: true },

    // Payment Type
    type: {
      type: String,
      enum: ['donation', 'purchase', 'subscription', 'invoice'],
      required: true,
      index: true,
    },

    // Amount
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },

    // Customer Info (link avec EZAuth si connecté)
    userId: { type: String, index: true },
    customerName: { type: String },
    customerEmail: { type: String },
    isAnonymous: { type: Boolean, default: false },

    // Payment Details
    provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
    paymentId: { type: String, unique: true },
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
      interval: { type: String, enum: ['month', 'year'] },

      // Pour invoices
      invoiceId: { type: String },
      invoiceNumber: { type: String },
    },

    // Dates
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

// Indexes pour performance
paymentSchema.index({ projectId: 1, createdAt: -1 })
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ type: 1, status: 1 })

export const Payment = model('payments', paymentSchema)
