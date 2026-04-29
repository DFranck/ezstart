import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model, type Query } from 'mongoose'
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
  utmSource?: string

  hasSetOwnPassword: boolean

  lastActiveAt?: Date | null

  // Soft-deletion lifecycle (account deletion grace period).
  // When `deletedAt` is set, the account is locked (no login, no token issue),
  // and `scheduledHardDeleteAt` indicates when a future cron will purge the
  // record permanently. Users can restore by signing back in during the
  // grace period (out of scope for the initial route; restore is opt-in
  // and lives in a separate endpoint).
  deletedAt?: Date | null
  scheduledHardDeleteAt?: Date | null

  // Account-level brute force lockout (cf. config/lockout.ts).
  // `failedLoginAttempts` increments on each wrong-password attempt, resets to
  // 0 on successful login. `lockedUntil` is set once the threshold is reached;
  // the account is locked while `lockedUntil > now`. `lastFailedLoginAt`
  // anchors the sliding window — failures older than the window reset the
  // counter to 1 instead of stacking forever.
  failedLoginAttempts?: number
  lockedUntil?: Date | null
  lastFailedLoginAt?: Date | null

  // 2FA brute force lockout (cf. config/lockout.ts). Mirrors the login-level
  // counter but scoped to TOTP / backup-code validation. Without it an
  // attacker who already knows the password can brute force the 6-digit TOTP
  // (10⁶ combinations is fast enough to crack in minutes given the strict
  // rate-limit's per-IP cap). `failedTwoFactorAttempts` increments on each
  // wrong code, resets to 0 on success. `twoFactorLockedUntil > now` blocks
  // ALL further attempts (including correct codes) until expiry.
  // `lastFailedTwoFactorAt` anchors the sliding window so stale failures
  // don't stack across hours of inactivity.
  failedTwoFactorAttempts?: number
  twoFactorLockedUntil?: Date | null
  lastFailedTwoFactorAt?: Date | null

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
          trim: true,
          maxlength: 64, // Free-form role (e.g. 'admin', 'pro', 'enterprise', 'beta-tester'). Plan owners define their own.
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
    utmSource: {
      type: String,
      maxlength: 128,
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
    deletedAt: {
      type: Date,
      default: null,
    },
    scheduledHardDeleteAt: {
      type: Date,
      default: null,
    },
    // Account-level brute force lockout state (cf. config/lockout.ts).
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastFailedLoginAt: {
      type: Date,
      default: null,
    },
    // 2FA brute force lockout state (cf. config/lockout.ts).
    failedTwoFactorAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    twoFactorLockedUntil: {
      type: Date,
      default: null,
    },
    lastFailedTwoFactorAt: {
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

/**
 * Soft-delete query guard — auto-injects `{ deletedAt: null }` into every
 * read/update query so soft-deleted users never leak into normal flows.
 *
 * Opt-out: pass `{ includeDeleted: true }` as the query option to bypass the
 * filter. This is the explicit (and audit-loggable) way for an admin endpoint
 * or a self-service deletion handler to see soft-deleted records.
 *
 * Mongoose 8 — the hook reads `this.getOptions()` to inspect the per-query
 * options bag. Caller-provided `deletedAt` filters are honored verbatim
 * (caller knows best); we only inject when the field is absent from the
 * filter AND `includeDeleted` is not set.
 *
 * Hooks are registered for every read/update operation that goes through a
 * Query. `aggregate` pipelines bypass Query hooks entirely — analytics
 * endpoints already filter explicitly, see `routes/admin/analytics-overview.ts`.
 *
 * Standard ref: `.claude/rules/standard-saas-data.md` §5 (soft delete).
 *
 * @internal
 */
function filterMentionsDeletedAt(filter: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(filter, 'deletedAt')) return true
  for (const op of ['$or', '$and', '$nor'] as const) {
    const arr = filter[op]
    if (Array.isArray(arr)) {
      for (const clause of arr) {
        if (
          clause &&
          typeof clause === 'object' &&
          filterMentionsDeletedAt(clause as Record<string, unknown>)
        ) {
          return true
        }
      }
    }
  }
  return false
}

function injectSoftDeleteFilter(
  this: Query<unknown, AuthUserDocument>,
  next: (err?: Error) => void
): void {
  const opts = this.getOptions() as { includeDeleted?: boolean }
  if (opts.includeDeleted === true) return next()

  const filter = this.getFilter() as Record<string, unknown>
  // Caller is being explicit about deletedAt anywhere in the filter (top
  // level OR nested inside $or/$and/$nor) — respect that intent and skip
  // the auto-injection to avoid double constraints / redundant clauses.
  if (filterMentionsDeletedAt(filter)) return next()

  this.where({ deletedAt: null })
  next()
}

// Apply to every Query operation that returns documents. Update operations
// (updateOne/updateMany/findOneAndUpdate) are also gated so a soft-deleted
// user cannot be silently mutated by a route that forgot the filter.
authUserSchema.pre('find', injectSoftDeleteFilter)
authUserSchema.pre('findOne', injectSoftDeleteFilter)
authUserSchema.pre('findOneAndUpdate', injectSoftDeleteFilter)
authUserSchema.pre('findOneAndDelete', injectSoftDeleteFilter)
authUserSchema.pre('findOneAndReplace', injectSoftDeleteFilter)
authUserSchema.pre('countDocuments', injectSoftDeleteFilter)
authUserSchema.pre('updateOne', injectSoftDeleteFilter)
authUserSchema.pre('updateMany', injectSoftDeleteFilter)
authUserSchema.pre('distinct', injectSoftDeleteFilter)

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
