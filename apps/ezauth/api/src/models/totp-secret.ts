import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'

export interface TotpSecretDocument extends Document {
  userId: string
  secret: string // Encrypted TOTP secret
  isEnabled: boolean
  backupCodes: string[] // Hashed backup codes
  /**
   * Last successfully consumed TOTP timestep (Unix seconds / period).
   * Stored to enforce RFC 6238 §5.2 — a TOTP code MUST NOT be accepted
   * twice. We reject any new attempt whose computed step is `<=` this
   * value. `null` means no TOTP code has been validated yet (fresh
   * setup).
   */
  lastUsedTotpStep: number | null
  createdAt: Date
  updatedAt: Date
}

const totpSecretSchema = new Schema<TotpSecretDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true, // One TOTP secret per user
      index: true,
    },
    secret: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    backupCodes: [
      {
        type: String,
      },
    ],
    lastUsedTotpStep: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'totp_secrets',
    bufferCommands: false,
  }
)

/**
 * Factory function to get TotpSecret model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getTotpSecretModel(): Promise<Model<TotpSecretDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.TotpSecret || mongoose.model<TotpSecretDocument>('TotpSecret', totpSecretSchema)
  )
}
