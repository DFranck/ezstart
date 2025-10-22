import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document } from 'mongoose'

export interface WaitlistDocument extends Document {
  appName: string
  emails: string[]
  createdAt: Date
  updatedAt: Date
}

const waitlistSchema = new Schema<WaitlistDocument>({
  appName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['green-pulse', 'ezbill', 'tower-defense', 'ezstart', 'fengshui', 'asc-tcd'],
  },
  emails: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
}, {
  timestamps: true,
  collection: 'app_waitlists',
  bufferCommands: false, // Disable buffering for fail-fast
})

/**
 * Factory function to get Waitlist model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getWaitlistModel() {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.Waitlist || mongoose.model<WaitlistDocument>('Waitlist', waitlistSchema)
}