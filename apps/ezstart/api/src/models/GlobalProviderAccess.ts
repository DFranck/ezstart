import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type ProviderType = 'gemini' | 'openai' | 'anthropic'

export interface IGlobalProviderAccess {
  providerId: string
  providerType: ProviderType
  displayName: string
  allowedApps: string[]
  defaultModel?: string
  maxTokensPerDay?: number
  maxCostPerMonth?: number
  isGloballyEnabled: boolean
  grantedBy?: string
  createdAt: Date
  updatedAt: Date
}

const globalProviderAccessSchema = new Schema<IGlobalProviderAccess>(
  {
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    providerType: {
      type: String,
      required: true,
      enum: ['gemini', 'openai', 'anthropic'],
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    allowedApps: {
      type: [String],
      default: [],
    },
    defaultModel: {
      type: String,
      trim: true,
    },
    maxTokensPerDay: {
      type: Number,
      min: 0,
    },
    maxCostPerMonth: {
      type: Number,
      min: 0,
    },
    isGloballyEnabled: {
      type: Boolean,
      default: true,
    },
    grantedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Unique provider ID
globalProviderAccessSchema.index({ providerId: 1 }, { unique: true })
// Fast lookup for enabled providers
globalProviderAccessSchema.index({ isGloballyEnabled: 1 })

export const GlobalProviderAccess: Model<IGlobalProviderAccess> =
  models.GlobalProviderAccess ||
  model<IGlobalProviderAccess>('GlobalProviderAccess', globalProviderAccessSchema)
