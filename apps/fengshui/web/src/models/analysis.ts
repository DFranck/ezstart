import { Schema, model, models, type Document } from 'mongoose'

export interface AnalysisDocument extends Document {
  userId: string
  planId: string
  name: string
  bearing: number // 0-360 degrees
  results: Record<string, unknown> // Bagua analysis results
  createdAt: Date
  updatedAt: Date
}

const analysisSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    planId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    bearing: { type: Number, required: true, min: 0, max: 360 },
    results: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, bufferCommands: false }
)

// Compound index for efficient queries
analysisSchema.index({ userId: 1, planId: 1 })

export const AnalysisModel =
  models.Analysis || model<AnalysisDocument>('Analysis', analysisSchema)
