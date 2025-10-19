import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document } from 'mongoose'

interface AuthCodeDocument extends Document {
  code: string
  userId: string
  app: string
  redirectUri?: string
  expiresAt: Date
  isUsed: boolean
  createdAt: Date
  updatedAt: Date
}

const authCodeSchema = new Schema<AuthCodeDocument>({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  app: {
    type: String,
    required: true,
    enum: ['ezbill', 'tower-defense', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd'],
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
}, {
  timestamps: true,
  collection: 'auth_codes',
  bufferCommands: false, // Disable buffering for fail-fast
})

// Auto-expire codes
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Direct model export (requires mongoose to be initialized first)
let AuthCodeModel: ReturnType<typeof import('mongoose').model<AuthCodeDocument>>

/**
 * Factory function to get AuthCode model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getAuthCodeModel() {
  const mongoose = await connectToMongo('ezauth')
  AuthCodeModel = mongoose.models.AuthCode || mongoose.model<AuthCodeDocument>('AuthCode', authCodeSchema)
  return AuthCodeModel
}

// Export model for direct use (will be undefined until getAuthCodeModel is called)
export { AuthCodeModel }