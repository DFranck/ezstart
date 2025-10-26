import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'
import type { FormConfig } from '@green-pulse/types'

const formConfigSchema = new Schema<FormConfig>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['grant', 'report', 'declaration', 'custom'],
      required: true,
    },
    icon: {
      type: String,
    },

    // AI Extraction config
    extraction: {
      systemPrompt: {
        type: String,
        required: true,
      },
      fields: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          type: {
            type: String,
            enum: ['text', 'number', 'date', 'select', 'textarea', 'file', 'boolean'],
            required: true,
          },
          required: { type: Boolean, default: false },

          // Extraction hints
          extraction: {
            keywords: [String],
            aliases: [String],
            format: String,
            examples: [String],
          },

          // Validation
          validation: {
            min: Number,
            max: Number,
            pattern: String,
            custom: String,
          },

          // UI
          placeholder: String,
          helpText: String,
          options: [
            {
              label: String,
              value: String,
            },
          ],
        },
      ],
    },

    // Modes
    modes: {
      manual: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      vocal: { type: Boolean, default: false },
      autoSubmit: { type: Boolean, default: false },
    },

    // UI config
    ui: {
      theme: {
        type: String,
        enum: ['green', 'blue', 'purple'],
        default: 'green',
      },
      layout: {
        type: String,
        enum: ['single-column', 'two-columns', 'wizard'],
        default: 'single-column',
      },
      showProgress: { type: Boolean, default: true },
      showPreview: { type: Boolean, default: true },
    },

    // Validation rules
    validation: [
      {
        rule: String,
        message: String,
        condition: String,
      },
    ],

    // Submission
    submitEndpoint: String,

    // Metadata
    createdBy: String,
    version: String,
    tags: [String],
  },
  {
    timestamps: true,
    bufferCommands: false, // Fail-fast for connection issues
  }
)

// Index for efficient queries
formConfigSchema.index({ category: 1, createdAt: -1 })
formConfigSchema.index({ tags: 1 })

/**
 * Factory function to get FormConfig model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getFormConfigModel() {
  const mongoose = await connectToMongo('green-pulse')
  return mongoose.models.FormConfig || mongoose.model<FormConfig>('FormConfig', formConfigSchema)
}
