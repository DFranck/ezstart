import { Schema, model, Document } from 'mongoose'

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
})

// Auto-expire codes
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AuthCodeModel = model<AuthCodeDocument>('AuthCode', authCodeSchema)