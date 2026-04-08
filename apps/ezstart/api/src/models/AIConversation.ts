import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

export interface IAIConversation {
  appName: string
  title: string
  preview?: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: {
      hasAudio?: boolean
      hasImage?: boolean
      hasDocument?: boolean
      extractedData?: Record<string, unknown>
    }
  }>
  userId?: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const aiConversationSchema = new Schema<IAIConversation>(
  {
    appName: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
      default: 'New Chat',
    },
    preview: {
      type: String,
      maxlength: 200,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          hasAudio: Boolean,
          hasImage: Boolean,
          hasDocument: Boolean,
          extractedData: Schema.Types.Mixed,
        },
      },
    ],
    userId: {
      type: String,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient queries scoped by appName
aiConversationSchema.index({ appName: 1, userId: 1, deletedAt: 1, updatedAt: -1 })

// Auto-update preview when messages change
aiConversationSchema.pre('save', function (next) {
  if (this.messages && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1]
    if (lastMessage) {
      this.preview = lastMessage.content.substring(0, 100)
    }
  }
  next()
})

export const AIConversation =
  models.AIConversation || model<IAIConversation>('AIConversation', aiConversationSchema)
