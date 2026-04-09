import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

export interface IAIUsage {
  appName: string
  providerId: string
  providerType?: 'gemini' | 'openai' | 'anthropic'
  model?: string
  userId?: string
  conversationId?: string
  promptType: string
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  estimatedCost: number
  responseTime?: number
  success: boolean
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

const aiUsageSchema = new Schema<IAIUsage>(
  {
    appName: {
      type: String,
      required: true,
      index: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    providerType: {
      type: String,
      enum: ['gemini', 'openai', 'anthropic'],
    },
    model: {
      type: String,
    },
    userId: {
      type: String,
      index: true,
    },
    conversationId: {
      type: String,
    },
    promptType: {
      type: String,
      default: 'general',
    },
    tokensUsed: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    responseTime: {
      type: Number,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for analytics queries
aiUsageSchema.index({ appName: 1, createdAt: -1 })
aiUsageSchema.index({ userId: 1, createdAt: -1 })

export const AIUsage = (models.AIUsage ||
  model<IAIUsage>('AIUsage', aiUsageSchema)) as mongoose.Model<IAIUsage>
