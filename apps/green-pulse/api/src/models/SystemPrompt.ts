import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type PromptType = 'general' | 'extraction' | 'validation' | 'vision' | 'custom'
export type ProviderTarget = 'all' | 'gemini' | 'openai' | 'anthropic'

export interface ISystemPrompt {
  key: string
  name: string
  description?: string
  content: string
  type: PromptType
  provider: ProviderTarget
  isActive: boolean
  isDefault: boolean
  variables?: string[] // Placeholders like {{language}}, {{sector}}
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const systemPromptSchema = new Schema<ISystemPrompt>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-_]+$/,
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

// Index for quick lookups
systemPromptSchema.index({ key: 1, isActive: 1 })
systemPromptSchema.index({ type: 1, provider: 1, isActive: 1 })

export const SystemPrompt: Model<ISystemPrompt> =
  models.SystemPrompt || model<ISystemPrompt>('SystemPrompt', systemPromptSchema)
