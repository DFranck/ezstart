import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model, Document } from 'mongoose'

export interface PromoDocument extends Document {
  code: string
  appName: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  currency?: string
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  maxUses?: number
  usedCount: number
  active: boolean
  deletedAt?: Date | null
  expiresAt?: Date
  description?: string
  campaign?: string
  targetPlanId?: string
  targetUserId?: string
  createdAt: Date
  updatedAt: Date
}

const promoSchema = new Schema<PromoDocument>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    appName: { type: String, required: true, index: true },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    currency: { type: String },
    duration: {
      type: String,
      enum: ['once', 'repeating', 'forever'],
      required: true,
    },
    durationInMonths: { type: Number, min: 1 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    expiresAt: { type: Date },
    description: { type: String },
    campaign: { type: String, index: true },
    targetPlanId: { type: String },
    targetUserId: { type: String },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Unique compound index: one code per app
promoSchema.index({ code: 1, appName: 1 }, { unique: true })
// Fast lookup for active promos per app
promoSchema.index({ appName: 1, active: 1 })

/**
 * Factory function to get Promo model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getPromoModel(): Promise<Model<PromoDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.Promo || mongoose.model<PromoDocument>('Promo', promoSchema)
}
