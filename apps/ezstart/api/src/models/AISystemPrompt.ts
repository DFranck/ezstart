import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type PromptType = 'general' | 'extraction' | 'validation' | 'vision' | 'custom'
export type ProviderTarget = 'all' | 'gemini' | 'openai' | 'anthropic'

export interface PromptConfig {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  rules?: string[]
  constraints?: {
    maxResponseLength?: number
    allowedTopics?: string[]
    forbiddenTopics?: string[]
    requiredFormat?: string
  }
  safety?: {
    blockThreshold?: 'none' | 'low' | 'medium' | 'high'
    filterLevel?: number
  }
}

export interface IPromptProvider {
  providerId: string
  priority: number
}

export interface IAISystemPrompt {
  key: string
  appName: string
  name: string
  description?: string
  content: string
  config?: PromptConfig
  type: PromptType
  provider: ProviderTarget
  providers?: IPromptProvider[]
  isActive: boolean
  isDefault: boolean
  variables?: string[]
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const aiSystemPromptSchema = new Schema<IAISystemPrompt>(
  {
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-_]+$/,
    },
    appName: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      enum: ['general', 'extraction', 'validation', 'vision', 'custom'],
      default: 'general',
    },
    provider: {
      type: String,
      enum: ['all', 'gemini', 'openai', 'anthropic'],
      default: 'all',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    providers: {
      type: [
        {
          providerId: { type: String, required: true },
          priority: { type: Number, default: 1 },
        },
      ],
      default: [],
    },
    variables: {
      type: [String],
      default: [],
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Compound unique index: same key allowed across different apps
aiSystemPromptSchema.index({ key: 1, appName: 1 }, { unique: true })
// Index for quick lookups by type, provider, and active status scoped by appName
aiSystemPromptSchema.index({ appName: 1, type: 1, provider: 1, isActive: 1 })

export const AISystemPrompt: Model<IAISystemPrompt> =
  models.AISystemPrompt || model<IAISystemPrompt>('AISystemPrompt', aiSystemPromptSchema)
