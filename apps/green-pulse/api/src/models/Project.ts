import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'
import type { Project, ProjectMember } from '@green-pulse/types'

const projectMemberSchema = new Schema<ProjectMember>(
  {
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: String,
  },
  { _id: false }
)

const projectSchema = new Schema<Project>(
  {
    // Workspace association (multi-tenant)
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },

    // Basic info
    name: {
      type: String,
      required: true,
    },
    description: String,

    // Company/entity metadata
    companyName: String,
    companyAddress: String,
    companySector: String,

    // Ownership & permissions
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    members: [projectMemberSchema],

    // Status
    status: {
      type: String,
      enum: ['active', 'completed', 'archived', 'cancelled'],
      default: 'active',
      index: true,
    },
    tags: [String],

    // Form configs
    formConfigIds: {
      type: [String],
      default: [],
    },

    // Audit
    completedAt: Date,
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Indexes for efficient queries
projectSchema.index({ workspaceId: 1, status: 1, createdAt: -1 })
projectSchema.index({ ownerId: 1, status: 1, createdAt: -1 })
projectSchema.index({ 'members.userId': 1, status: 1 })
projectSchema.index({ tags: 1 })

/**
 * Factory function to get Project model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getProjectModel() {
  const mongoose = await connectToMongo('green-pulse')
  return mongoose.models.Project || mongoose.model<Project>('Project', projectSchema)
}
