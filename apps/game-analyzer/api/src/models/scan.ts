import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'
import type { Scan, ScanResult } from '@game-analyzer/types'

const scanResultSchema = new Schema<ScanResult>(
  {
    success: { type: Boolean, required: true },
    data: { type: Schema.Types.Mixed },
    rawText: { type: String, required: true },
    confidence: { type: Number, required: true },
    processingTimeMs: { type: Number, required: true },
    analysis: { type: Schema.Types.Mixed },
    partial: { type: Boolean },
    unreliable: { type: Boolean },
    ocrSources: [{
      name: { type: String },
      confidence: { type: Number },
      rawText: { type: String },
      subsFound: { type: Number },
      success: { type: Boolean },
    }],
    benchResults: [{
      source: { type: String },
      preset: { type: String },
      confidence: { type: Number },
      subsCount: { type: Number },
      rawText: { type: String },
      success: { type: Boolean },
    }],
  },
  { _id: false }
)

const scanSchema = new Schema<Scan>(
  {
    gameType: {
      type: String,
      enum: ['summoners-war', 'nikke'],
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    result: {
      type: scanResultSchema,
    },
    feedback: {
      opinion: { type: String, enum: ['agree', 'disagree'] },
      comment: { type: String },
      createdAt: { type: Date },
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Indexes for efficient queries
scanSchema.index({ createdAt: -1 })
scanSchema.index({ gameType: 1, status: 1 })

/**
 * Factory function to get Scan model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getScanModel() {
  const mongoose = await connectToMongo('game-analyzer')
  return mongoose.models.Scan || mongoose.model<Scan>('Scan', scanSchema)
}
