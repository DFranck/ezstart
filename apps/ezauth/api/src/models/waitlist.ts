import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document } from 'mongoose'
import crypto from 'crypto'

export type WaitlistStatus = 'pending' | 'invited' | 'activated' | 'rejected'

export interface WaitlistEntry {
  email: string
  status: WaitlistStatus
  accessCode: string | null
  invitedAt: Date | null
  invitedBy: string | null // User ID who sent the invite
  activatedAt: Date | null // When user signed up with the code
  notes: string
  addedAt: Date
}

export interface WaitlistDocument extends Document {
  appName: string
  emails: WaitlistEntry[]
  createdAt: Date
  updatedAt: Date

  // Helper methods
  findEntryByEmail(email: string): WaitlistEntry | undefined
  generateAccessCode(): string
}

const waitlistEntrySchema = new Schema<WaitlistEntry>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'invited', 'activated', 'rejected'],
    default: 'pending',
  },
  accessCode: {
    type: String,
    default: null,
  },
  invitedAt: {
    type: Date,
    default: null,
  },
  invitedBy: {
    type: String,
    default: null,
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false })

const waitlistSchema = new Schema<WaitlistDocument>({
  appName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['green-pulse', 'ezbill', 'tower-defense', 'ezstart', 'fengshui', 'asc-tcd'],
  },
  emails: [waitlistEntrySchema],
}, {
  timestamps: true,
  collection: 'app_waitlists',
  bufferCommands: false, // Disable buffering for fail-fast
})

// Helper method to find entry by email
waitlistSchema.methods.findEntryByEmail = function(email: string): WaitlistEntry | undefined {
  return this.emails.find((entry: WaitlistEntry) => entry.email === email.toLowerCase())
}

// Generate unique access code for an app
waitlistSchema.methods.generateAccessCode = function(): string {
  const appPrefix = this.appName.split('-').map((word: string) => word[0].toUpperCase()).join('')
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `BETA-${appPrefix}-${random}`
}

/**
 * Factory function to get Waitlist model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getWaitlistModel() {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.Waitlist || mongoose.model<WaitlistDocument>('Waitlist', waitlistSchema)
}