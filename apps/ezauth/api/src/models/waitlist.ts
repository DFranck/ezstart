import { Schema, model, Document } from 'mongoose'

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
})

export const WaitlistModel = model<WaitlistDocument>('Waitlist', waitlistSchema)