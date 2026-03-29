import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document, Model, Types } from 'mongoose'
import { encrypt, decrypt } from '../utils/crypto.js'

export interface OAuthAccountDocument extends Document {
  userId: Types.ObjectId
  provider: 'google' | 'github' | 'facebook' | 'apple'
  providerId: string // OAuth provider's user ID
  email: string
  displayName?: string
  avatar?: string
  accessToken?: string // Encrypted at rest via AES-256-GCM
  refreshToken?: string // Encrypted at rest via AES-256-GCM
  profile: Record<string, any> // Raw OAuth profile data
  createdAt: Date
  updatedAt: Date
  getDecryptedAccessToken(): string | undefined
  getDecryptedRefreshToken(): string | undefined
}

const oauthAccountSchema = new Schema<OAuthAccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['google', 'github', 'facebook', 'apple'],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
    },
    avatar: {
      type: String,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    profile: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'oauth_accounts',
    bufferCommands: false,
  }
)

// Encrypt tokens before saving
oauthAccountSchema.pre('save', function (next) {
  if (this.isModified('accessToken') && this.accessToken) {
    this.accessToken = encrypt(this.accessToken)
  }
  if (this.isModified('refreshToken') && this.refreshToken) {
    this.refreshToken = encrypt(this.refreshToken)
  }
  next()
})

// Instance methods to decrypt tokens
oauthAccountSchema.methods.getDecryptedAccessToken = function (): string | undefined {
  if (!this.accessToken) return undefined
  return decrypt(this.accessToken)
}

oauthAccountSchema.methods.getDecryptedRefreshToken = function (): string | undefined {
  if (!this.refreshToken) return undefined
  return decrypt(this.refreshToken)
}

// Unique constraint: one provider account per user
oauthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true })

// Unique constraint: one provider ID per provider
oauthAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true })

/**
 * Factory function to get OAuthAccount model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getOAuthAccountModel(): Promise<Model<OAuthAccountDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.OAuthAccount ||
    mongoose.model<OAuthAccountDocument>('OAuthAccount', oauthAccountSchema)
  )
}
