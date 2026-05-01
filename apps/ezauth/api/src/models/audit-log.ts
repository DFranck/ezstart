/**
 * EZAuth audit log model — thin wrapper around the agnostic factory exported
 * by `@ezstart/api-core`. Defines the per-service action enum + retention
 * policy, then delegates schema construction to `createAuditLogSchema`.
 *
 * The wire shape (collection name `audit_logs`, indexes, TTL on `expiresAt`,
 * `testModeScopePlugin`) is identical to the pre-extraction implementation —
 * existing prod data continues to work without migration.
 *
 * @module apps/ezauth/api/src/models/audit-log
 */

import {
  connectToMongo,
  createAuditLogSchema,
  type AuditLogMetadata as BaseAuditLogMetadata,
} from '@ezstart/api-core'
import type { Document, Model } from 'mongoose'

/**
 * Audit log action — finite enum covering every loggable user action across
 * ezauth. New action types MUST be added here AND to {@link AUDIT_LOG_ACTIONS}
 * (kept in lockstep for runtime validation).
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
  | 'webhook_secret_regenerated'

/**
 * Tuple form for runtime validation (Zod / Mongoose enum). Keep in lockstep
 * with {@link AuditLogAction}.
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
  'webhook_secret_regenerated',
] as const

/**
 * Default retention window per plan (days). Free tier keeps 30 days, Pro tier
 * keeps 365 days. The TTL is enforced via a MongoDB TTL index on `expiresAt`,
 * so the document is deleted automatically when it passes the per-plan window.
 */
export const AUDIT_LOG_RETENTION_DAYS = {
  free: 30,
  pro: 365,
} as const

export type AuditLogPlanRetention = keyof typeof AUDIT_LOG_RETENTION_DAYS

/** Re-export the metadata bag so callers don't need to dual-import. */
export type AuditLogMetadata = BaseAuditLogMetadata

/** Document interface narrowed to the ezauth action union. */
export interface AuditLogDocument extends Document {
  userId: string
  appName: string
  action: AuditLogAction
  metadata: AuditLogMetadata
  createdAt: Date
  expiresAt: Date
  /**
   * Stripe-pattern test/live partition. Inherited from `req.derivedMode`
   * at write time so test mode actions stay isolated from live audit logs
   * (avoids spamming the live log with every test-key probe).
   */
  isTestMode: boolean
}

const auditLogSchema = createAuditLogSchema<AuditLogDocument>({ actions: AUDIT_LOG_ACTIONS })

/**
 * Factory function to get the `AuditLog` model attached to the shared Mongo
 * connection. MUST be called after `connectToMongo()` has been initialized
 * (the helper itself calls it for safety).
 */
export async function getAuditLogModel(): Promise<Model<AuditLogDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    (mongoose.models.AuditLog as Model<AuditLogDocument> | undefined) ??
    mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema)
  )
}

/**
 * Compute the `expiresAt` deadline for a new audit log entry given a retention
 * plan (defaults to free / 30 days).
 */
export function computeAuditLogExpiry(
  plan: AuditLogPlanRetention = 'free',
  now: Date = new Date()
): Date {
  const days = AUDIT_LOG_RETENTION_DAYS[plan]
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}
