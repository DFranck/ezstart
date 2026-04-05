import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document, Model, Types } from 'mongoose'
import crypto from 'crypto'

export interface RefreshTokenDocument extends Document {
  userId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  isRevoked: boolean
  userAgent?: string
  ip?: string
  createdAt: Date
  updatedAt: Date
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    userAgent: {
      type: String,
    },
    ip: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'refresh_tokens',
    bufferCommands: false,
  }
)

// Auto-expire tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Compound index for efficient lookups
refreshTokenSchema.index({ userId: 1, isRevoked: 1 })

/**
 * Hash a raw refresh token for secure storage.
 * Uses SHA-256 — fast enough for token lookup, no need for bcrypt since tokens are high-entropy.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Generate a cryptographically random refresh token string.
 */
export function generateRawRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

/**
 * Factory function to get RefreshToken model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getRefreshTokenModel(): Promise<Model<RefreshTokenDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.RefreshToken ||
    mongoose.model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema)
  )
}
