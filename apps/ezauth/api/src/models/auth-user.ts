import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'
import { AuthUser } from '@ezstart/auth-sdk/server'

export interface AuthUserDocument extends Document {
  email: string
  username: string
  passwordHash?: string // Optional for OAuth-only users
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified: boolean
  apps: string[]

  // RBAC - Role-Based Access Control
  roles: string[] // ['superadmin', 'admin', 'manager', 'beta-tester', 'client']
  permissions: string[] // ['theme:edit', 'users:manage', 'analytics:view']
  features: string[] // ['beta-features', 'early-access', 'advanced-analytics']

  // Metadata
  organizationId?: string // For client managers
  managedBy?: string // User ID of manager (for clients)

  createdAt: Date
  updatedAt: Date

  // Methods
  comparePassword(password: string): Promise<boolean>
  toAuthUser(): AuthUser
  hasRole(role: string): boolean
  hasPermission(permission: string): boolean
  hasFeature(feature: string): boolean
  hasAnyRole(roles: string[]): boolean
}

const authUserSchema = new Schema<AuthUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  passwordHash: {
    type: String,
    required: false, // Optional for OAuth-only users
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  apps: [{
    type: String,
    enum: ['ezbill', 'tower-defense', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd'], // Add more apps as needed
  }],
  // RBAC fields
  roles: [{
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'beta-tester', 'client'],
    default: []
  }],
  permissions: [{
    type: String,
    default: []
  }],
  features: [{
    type: String,
    default: []
  }],
  // Metadata
  organizationId: {
    type: String,
    required: false
  },
  managedBy: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'auth_users', // Separate collection from other apps
  bufferCommands: false, // Disable buffering for fail-fast
})

// Hash password before saving
authUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next()

  const salt = await bcrypt.genSalt(12)
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  next()
})

// Compare password method
authUserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false // OAuth-only users have no password
  }
  return bcrypt.compare(password, this.passwordHash)
}

// RBAC methods
authUserSchema.methods.hasRole = function(role: string): boolean {
  return this.roles?.includes(role) || false
}

authUserSchema.methods.hasPermission = function(permission: string): boolean {
  // Superadmin has all permissions
  if (this.hasRole('superadmin')) return true
  return this.permissions?.includes(permission) || false
}

authUserSchema.methods.hasFeature = function(feature: string): boolean {
  // Superadmin has all features
  if (this.hasRole('superadmin')) return true
  return this.features?.includes(feature) || false
}

authUserSchema.methods.hasAnyRole = function(roles: string[]): boolean {
  return roles.some(role => this.hasRole(role))
}

// Transform to API object
authUserSchema.methods.toAuthUser = function(): AuthUser {
  return {
    _id: this._id.toString(),
    email: this.email,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    isVerified: this.isVerified,
    apps: this.apps,
    roles: this.roles || [],
    permissions: this.permissions || [],
    features: this.features || [],
    organizationId: this.organizationId,
    managedBy: this.managedBy,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  }
}

/**
 * Factory function to get AuthUser model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getAuthUserModel(): Promise<Model<AuthUserDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.AuthUser || mongoose.model<AuthUserDocument>('AuthUser', authUserSchema)
}