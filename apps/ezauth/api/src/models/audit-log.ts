import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Audit log action — finite enum covering every loggable user action
 * across ezauth. New action types MUST be added here AND to the
 * `AUDIT_LOG_ACTIONS` const tuple kept in sync with `auditLogActionEnum`
 * exposed by the route schema.
 */
export type AuditLogAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'email_change'
  | 'email_change_requested'
  | 'email_change_completed'
  | 'magic_link_requested'
  | 'magic_link_login'
  | 'oauth_link'
  | 'oauth_unlink'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_login_success'
  | '2fa_login_failed'
  | 'backup_code_used'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'profile_updated'
  | 'account_locked_brute_force'
  | 'two_factor_locked_brute_force'

/**
 * Tuple form for runtime validation (Zod / Mongoose enum). Keep in
 * lockstep with `AuditLogAction`.
 */
export const AUDIT_LOG_ACTIONS = [
  'login',
  'logout',
  'password_change',
  'email_change',
  'email_change_requested',
  'email_change_completed',
  'magic_link_requested',
  'magic_link_login',
  'oauth_link',
  'oauth_unlink',
  '2fa_enabled',
  '2fa_disabled',
  '2fa_login_success',
  '2fa_login_failed',
  'backup_code_used',
  'session_revoked',
  'api_key_created',
  'api_key_revoked',
  'profile_updated',
  'account_locked_brute_force',
  'two_factor_locked_brute_force',
] as const

/**
 * Default retention window per plan (days). Free tier keeps 30 days,
 * Pro tier keeps 365 days. The TTL is enforced via a MongoDB TTL index
 * on `expiresAt`, so the document is deleted automatically when it
 * passes the per-plan window.
 */
export const AUDIT_LOG_RETENTION_DAYS = {
  free: 30,
  pro: 365,
} as const

export type AuditLogPlanRetention = keyof typeof AUDIT_LOG_RETENTION_DAYS

export interface AuditLogMetadata {
  /** Source IP address of the request (best-effort). */
  ip?: string | null
  /** Raw User-Agent header. */
  userAgent?: string | null
  /** Optional resolved geo location (e.g. `'Paris, FR'`). */
  location?: string | null
  /** Free-form action-specific details (key id revoked, session id, ...). */
  [key: string]: unknown
}

export interface AuditLogDocument extends Document {
  userId: string
  appName: string
  action: AuditLogAction
  metadata: AuditLogMetadata
  createdAt: Date
  expiresAt: Date
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
      default: 'ezauth',
    },
    action: {
      type: String,
      enum: AUDIT_LOG_ACTIONS,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    // We manage `createdAt` manually so the TTL window can be aligned with
    // it; opting out of mongoose's auto timestamps avoids a duplicate
    // `updatedAt` field we never read.
    timestamps: false,
    collection: 'audit_logs',
    bufferCommands: false,
  }
)

// Compound index for the most frequent listing query: a user's recent
// activity, optionally filtered by action.
auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 })

// MongoDB TTL index — auto-cleanup once the document passes its
// `expiresAt`. `expireAfterSeconds: 0` tells Mongo to use the date in the
// field as the absolute deletion time.
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

/**
 * Factory function to get the `AuditLog` model attached to the shared
 * Mongo connection. MUST be called after `connectToMongo()` has been
 * initialized (the helper itself calls it for safety).
 */
export async function getAuditLogModel(): Promise<Model<AuditLogDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.AuditLog || mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema)
}

/**
 * Compute the `expiresAt` deadline for a new audit log entry given a
 * retention plan (defaults to free / 30 days).
 */
export function computeAuditLogExpiry(
  plan: AuditLogPlanRetention = 'free',
  now: Date = new Date()
): Date {
  const days = AUDIT_LOG_RETENTION_DAYS[plan]
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}
