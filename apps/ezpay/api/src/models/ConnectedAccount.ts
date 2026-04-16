import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Model, type Document } from 'mongoose'

export interface ConnectedAccountDocument extends Document {
  userId: string
  stripeAccountId: string
  email: string
  businessName: string
  status: 'pending' | 'active' | 'restricted' | 'disabled'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const connectedAccountSchema = new Schema<ConnectedAccountDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    stripeAccountId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    businessName: { type: String, required: true },
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
  },
  {
    timestamps: true,
    bufferCommands: false,
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
