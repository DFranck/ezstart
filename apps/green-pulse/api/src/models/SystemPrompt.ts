import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type PromptType = 'general' | 'extraction' | 'validation' | 'vision' | 'custom'
export type ProviderTarget = 'all' | 'gemini' | 'openai' | 'anthropic'

/**
 * Configuration for AI generation (provider-agnostic)
 * These settings are applied once, not repeated in conversation history
 */
export interface PromptConfig {
  // Generation parameters
  temperature?: number // 0-1, controls randomness
  maxTokens?: number // Max output length
  topP?: number // Nucleus sampling (0-1)
  topK?: number // Top-K sampling (for Gemini)

  // Behavioral rules (applied without being in context)
  rules?: string[] // e.g., "Always respond in user's language", "Use professional tone"

  // Constraints
  constraints?: {
    maxResponseLength?: number // Characters limit
    allowedTopics?: string[] // Allowed discussion topics
    forbiddenTopics?: string[] // Topics to avoid
    requiredFormat?: string // e.g., "JSON", "Markdown", "Plain text"
  }

  // Safety & moderation
  safety?: {
    blockThreshold?: 'none' | 'low' | 'medium' | 'high' // Gemini safety
    filterLevel?: number // Generic filter level 0-10
  }
}

export interface ISystemPrompt {
  key: string
  name: string
  description?: string
  content: string // The actual system prompt (personality, role)
  config?: PromptConfig // Configuration (rules, constraints, generation params)
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
    config: {
      type: Schema.Types.Mixed, // Flexible JSON object
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
