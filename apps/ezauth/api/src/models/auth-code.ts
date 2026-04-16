import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'

export interface AuthCodeDocument extends Document {
  code: string
  userId: string
  app: string
  type: 'auth' | 'password-reset' | 'email-verification' | 'sso-handoff'
  redirectUri?: string
  expiresAt: Date
  isUsed: boolean
  consumedAt?: Date
  issuedFromIp?: string
  issuedUa?: string
  createdAt: Date
  updatedAt: Date
}

const authCodeSchema = new Schema<AuthCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['auth', 'password-reset', 'email-verification', 'sso-handoff'],
      default: 'auth',
    },
    app: {
      type: String,
      required: true,
      enum: [
        'ezbill',
        'ezauth',
        'admin',
        'ezstart',
        'green-pulse',
        'fengshui',
        'asc-tcd',
        'gacha-analyzer',
        'ezpay',
      ],
    },
    redirectUri: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    consumedAt: {
      type: Date,
    },
    issuedFromIp: {
      type: String,
    },
    issuedUa: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'auth_codes',
    bufferCommands: false, // Disable buffering for fail-fast
  }
)

// Auto-expire codes
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

/**
 * Factory function to get AuthCode model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getAuthCodeModel(): Promise<Model<AuthCodeDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.AuthCode || mongoose.model<AuthCodeDocument>('AuthCode', authCodeSchema)
}
