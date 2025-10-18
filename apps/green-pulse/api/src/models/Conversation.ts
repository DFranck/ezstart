import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

export interface IConversation {
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
      extractedData?: any
    }
  }>
  userId?: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new Schema<IConversation>(
  {
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
      index: true, // For future multi-user support
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true, // For soft delete queries
    },
  },
  {
    timestamps: true, // Auto createdAt/updatedAt
  }
)

// Index for efficient queries
conversationSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 })

// Auto-update preview when messages change
conversationSchema.pre('save', function (next) {
  if (this.messages && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1]
    this.preview = lastMessage.content.substring(0, 100)
  }
  next()
})

export const Conversation = models.Conversation || model<IConversation>('Conversation', conversationSchema)
