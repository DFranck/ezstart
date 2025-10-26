import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document, Model, Types } from 'mongoose'

export interface OAuthAccountDocument extends Document {
  userId: Types.ObjectId
  provider: 'google' | 'github' | 'facebook' | 'apple'
  providerId: string // OAuth provider's user ID
  email: string
  displayName?: string
  avatar?: string
  accessToken?: string // Encrypted in production
  refreshToken?: string // Encrypted in production
  profile: Record<string, any> // Raw OAuth profile data
  createdAt: Date
  updatedAt: Date
}

const oauthAccountSchema = new Schema<OAuthAccountDocument>({
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
    // TODO: Encrypt in production
  },
  refreshToken: {
    type: String,
    // TODO: Encrypt in production
  },
  profile: {
    type: Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'oauth_accounts',
  bufferCommands: false,
})

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
  return mongoose.models.OAuthAccount || mongoose.model<OAuthAccountDocument>('OAuthAccount', oauthAccountSchema)
}
