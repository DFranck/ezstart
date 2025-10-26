import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'
import type { FormInstance } from '@green-pulse/types'

const formInstanceSchema = new Schema<FormInstance>(
  {
    // Reference
    formConfigId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },

    // Data
    fields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    extractedData: {
      type: Schema.Types.Mixed,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'review', 'submitted', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    mode: {
      type: String,
      enum: ['manual', 'chat', 'vocal'],
      default: 'manual',
    },

    // Conversation (if using AI)
    conversationId: {
      type: String,
      index: true,
    },
    extractionConfidence: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Submission
    submittedAt: {
      type: Date,
    },
    submittedData: {
      type: Schema.Types.Mixed,
    },

    // Audit
    history: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          required: true,
        },
        userId: String,
        changes: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    bufferCommands: false, // Fail-fast for connection issues
  }
)

// Indexes for efficient queries
formInstanceSchema.index({ formConfigId: 1, userId: 1, status: 1 })
formInstanceSchema.index({ projectId: 1, status: 1 })
formInstanceSchema.index({ conversationId: 1 })
formInstanceSchema.index({ createdAt: -1 })

// Middleware to add history entry on update
formInstanceSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    const changes: any = {}
    const modifiedPaths = this.modifiedPaths()

    modifiedPaths.forEach(path => {
      if (path !== 'history' && path !== 'updatedAt') {
        changes[path] = this.get(path)
      }
    })

    if (Object.keys(changes).length > 0) {
      if (!this.history) {
        this.history = []
      }
      this.history.push({
        timestamp: new Date(),
        action: 'updated',
        changes,
      })
    }
  }
  next()
})

/**
 * Factory function to get FormInstance model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getFormInstanceModel() {
  const mongoose = await connectToMongo('green-pulse')
  return mongoose.models.FormInstance || mongoose.model<FormInstance>('FormInstance', formInstanceSchema)
}
