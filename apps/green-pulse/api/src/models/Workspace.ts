import { Schema } from 'mongoose'
import { connectToMongo } from '@ezstart/express-core'
import type { Workspace, WorkspaceMember } from '@green-pulse/types'

/**
 * Workspace Member Schema
 */
const workspaceMemberSchema = new Schema<WorkspaceMember>(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false } // No separate ID for subdocuments
)

/**
 * Workspace Schema
 */
const workspaceSchema = new Schema<Workspace>(
  {
    name: { type: String, required: true, maxlength: 100, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    description: { type: String, maxlength: 500 },

    // Ownership
    ownerId: { type: String, required: true, index: true },
    members: { type: [workspaceMemberSchema], default: [] },

    // Status
    status: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active', index: true },

    // Settings
    settings: {
      allowPublicProjects: { type: Boolean, default: false },
      requireApprovalForNewMembers: { type: Boolean, default: true },
      maxProjects: { type: Number },
      maxMembers: { type: Number },
    },

    // Branding
    logoUrl: { type: String },
    color: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },

    // Metadata
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    bufferCommands: false, // Fail-fast for MongoDB connection issues
  }
)

/**
 * Indexes for efficient queries
 */
// Owner's workspaces
workspaceSchema.index({ ownerId: 1, status: 1, createdAt: -1 })

// Member's workspaces
workspaceSchema.index({ 'members.userId': 1, status: 1 })

// Slug lookup (unique)
workspaceSchema.index({ slug: 1 }, { unique: true })

// Active workspaces
workspaceSchema.index({ status: 1, createdAt: -1 })

/**
 * Pre-save hook to update timestamps
 */
workspaceSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

/**
 * Factory function to get Workspace model
 * MUST be called after connectToMongo() has been initialized
 */
export async function getWorkspaceModel() {
  const mongoose = await connectToMongo('green-pulse')
  return mongoose.models.Workspace || mongoose.model<Workspace>('Workspace', workspaceSchema)
}
