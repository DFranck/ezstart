import { Schema, model, models, type Document } from 'mongoose'

export interface PlanDocument extends Document {
  userId: string
  name: string
  imageData: string // base64 data URL
  width: number
  height: number
  aiValidation: {
    isValid: boolean
    score: number // 0-100
    feedback: string
    roomsDetected: number
    validatedAt: Date
  } | null
  createdAt: Date
  updatedAt: Date
}

const planSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    imageData: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    aiValidation: {
      type: {
        isValid: Boolean,
        score: Number,
        feedback: String,
        roomsDetected: Number,
        validatedAt: Date,
      },
      default: null,
    },
  },
  { timestamps: true, bufferCommands: false }
)

export const PlanModel = models.Plan || model<PlanDocument>('Plan', planSchema)
