import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type ProviderType = 'gemini' | 'openai' | 'anthropic'

export interface IAppProviderConfig {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface IAppProvider {
  appName: string
  providerId: string
  providerType: ProviderType
  enabled: boolean
  priority: number
  config?: IAppProviderConfig
  createdAt: Date
  updatedAt: Date
}

const appProviderSchema = new Schema<IAppProvider>(
  {
    appName: {
      type: String,
      required: true,
      trim: true,
    },
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
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    config: {
      type: new Schema(
        {
          model: { type: String },
          temperature: { type: Number, min: 0, max: 2 },
          maxTokens: { type: Number, min: 1 },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
)

// Unique compound: one provider per app
appProviderSchema.index({ appName: 1, providerId: 1 }, { unique: true })
// Fast lookup: enabled providers sorted by priority for an app
appProviderSchema.index({ appName: 1, enabled: 1, priority: 1 })

export const AppProvider: Model<IAppProvider> =
  models.AppProvider || model<IAppProvider>('AppProvider', appProviderSchema)
