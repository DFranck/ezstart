import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'
import { AuthUser } from '@ezstart/auth-sdk/server'
import { mapToRecord } from '../utils/map-to-record.js'

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
  roles: string[] // DEPRECATED: Legacy field, kept for data preservation. Not used in code anymore. Use globalRoles and appRoles instead.
  globalRoles: string[] // Cross-app roles (only 'superadmin' allowed)
  appRoles: Map<string, string[]> // App-specific roles: { 'green-pulse': ['admin'], 'ezbill': ['beta-tester'] }
  permissions: string[] // ['theme:edit', 'users:manage', 'analytics:view']
  features: string[] // ['beta-features', 'early-access', 'advanced-analytics']

  // Metadata
  organizationId?: string // For client managers
  managedBy?: string // User ID of manager (for clients)

  promoCode?: string

  hasSetOwnPassword: boolean

  lastActiveAt?: Date | null

  createdAt: Date
  updatedAt: Date

  // Methods
  comparePassword(password: string): Promise<boolean>
  toAuthUser(): AuthUser
  hasRole(role: string, appName?: string): boolean
  hasGlobalRole(role: string): boolean
  hasAppRole(appName: string, role: string): boolean
  hasAnyRole(roles: string[], appName?: string): boolean
  hasPermission(permission: string): boolean
  hasFeature(feature: string): boolean
}

const authUserSchema = new Schema<AuthUserDocument>(
  {
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
    apps: [{ type: String }],
    // RBAC fields
    roles: [
      {
        type: String,
        enum: ['superadmin', 'admin', 'manager', 'beta-tester', 'client'],
        default: [],
      },
    ], // DEPRECATED: Legacy field, kept for data preservation. Not used in code anymore. Use globalRoles and appRoles instead.
    globalRoles: [
      {
        type: String,
        enum: ['superadmin'], // Only superadmin can be global
        default: [],
      },
    ],
    appRoles: {
      type: Map,
      of: [
        {
          type: String,
          enum: ['admin', 'manager', 'beta-tester', 'client'],
        },
      ],
      default: {},
    },
    permissions: [
      {
        type: String,
        default: [],
      },
    ],
    features: [
      {
        type: String,
        default: [],
      },
    ],
    // Metadata
    organizationId: {
      type: String,
      required: false,
    },
    managedBy: {
      type: String,
      required: false,
    },
    promoCode: {
      type: String,
      default: undefined,
    },
    hasSetOwnPassword: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'auth_users', // Separate collection from other apps
    bufferCommands: false, // Disable buffering for fail-fast
  }
)

// Hash password before saving
authUserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next()

  const salt = await bcrypt.genSalt(12)
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  next()
})

// Compare password method
authUserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false // OAuth-only users have no password
  }
  return bcrypt.compare(password, this.passwordHash)
}

// RBAC methods
authUserSchema.methods.hasGlobalRole = function (role: string): boolean {
  return this.globalRoles?.includes(role) || false
}

authUserSchema.methods.hasAppRole = function (appName: string, role: string): boolean {
  const appRoles = this.appRoles?.get(appName) || []
  return appRoles.includes(role)
}

authUserSchema.methods.hasRole = function (role: string, appName?: string): boolean {
  // Check global roles first (superadmin is always global)
  if (role === 'superadmin') {
    return this.hasGlobalRole('superadmin')
  }

  // If appName specified, check app-specific role
  if (appName) {
    return this.hasAppRole(appName, role)
  }

  // Check global roles
  if (this.globalRoles?.includes(role)) return true

  // Check if has role in ANY app
  const hasInAnyApp = Array.from(this.appRoles?.keys() || []).some(app =>
    this.hasAppRole(app, role)
  )

  return hasInAnyApp
}

authUserSchema.methods.hasAnyRole = function (roles: string[], appName?: string): boolean {
  // Superadmin always has access
  if (this.hasGlobalRole('superadmin')) return true

  return roles.some(role => this.hasRole(role, appName))
}

authUserSchema.methods.hasPermission = function (permission: string): boolean {
  // Superadmin has all permissions
  if (this.hasGlobalRole('superadmin')) return true
  return this.permissions?.includes(permission) || false
}

authUserSchema.methods.hasFeature = function (feature: string): boolean {
  // Superadmin has all features
  if (this.hasGlobalRole('superadmin')) return true
  return this.features?.includes(feature) || false
}

// Transform to API object
authUserSchema.methods.toAuthUser = function (): AuthUser {
  return {
    _id: this._id.toString(),
    email: this.email,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    isVerified: this.isVerified,
    apps: this.apps,
    globalRoles: this.globalRoles || [],
    appRoles: mapToRecord(this.appRoles as Map<string, string[]>),
    permissions: this.permissions || [],
    features: this.features || [],
    organizationId: this.organizationId,
    managedBy: this.managedBy,
    promoCode: this.promoCode,
    hasSetOwnPassword: this.hasSetOwnPassword ?? true,
    lastActiveAt: this.lastActiveAt ? this.lastActiveAt.toISOString() : null,
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
