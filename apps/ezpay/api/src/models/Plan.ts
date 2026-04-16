import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model, Document } from 'mongoose'

export interface PlanDocument extends Document {
  name: string
  appName: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  deletedAt?: Date | null
  sortOrder: number
  stripePriceId?: string
  createdAt: Date
  updatedAt: Date
}

const planSchema = new Schema<PlanDocument>(
  {
    name: { type: String, required: true, trim: true },
    appName: { type: String, required: true, index: true },
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
    stripePriceId: { type: String },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Fast lookup for active plans per app
planSchema.index({ appName: 1, active: 1 })
// Display ordering
planSchema.index({ appName: 1, sortOrder: 1 })

/**
 * Factory function to get Plan model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getPlanModel(): Promise<Model<PlanDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.Plan || mongoose.model<PlanDocument>('Plan', planSchema)
}
