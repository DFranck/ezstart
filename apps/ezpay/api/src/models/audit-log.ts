/**
 * EZPay audit log model — thin wrapper around the agnostic factory exported
 * by `@ezstart/api-core`. Defines the per-service action enum then delegates
 * schema construction to `createAuditLogSchema`.
 *
 * Mirrors the ezauth pattern (`apps/ezauth/api/src/models/audit-log.ts`) so
 * the ezpay collection shares the canonical `audit_logs` shape (indexes, TTL
 * on `expiresAt`, `testModeScopePlugin`). Cross-service consistency is
 * enforced by the api-core factory — drift is structurally impossible.
 *
 * @module apps/ezpay/api/src/models/audit-log
 */

import {
  connectToMongo,
  createAuditLogSchema,
  type AuditLogMetadata as BaseAuditLogMetadata,
} from '@ezstart/api-core'
import type { Document, Model } from 'mongoose'

/**
 * Audit log action — finite enum covering every loggable user action across
 * ezpay. Add new action types here AND to {@link AUDIT_LOG_ACTIONS} (kept in
 * lockstep for runtime validation). Naming follows the dotted convention
 * `<resource>.<action>` to mirror Stripe / GitHub event names.
 */
export type AuditLogAction =
  // Stripe Connect lifecycle
  | 'connect.onboard.started'
  | 'connect.onboard.completed'
  | 'connect.onboard.resumed'
  | 'connect.onboard.expired_warned'
  | 'connect.onboard.expired_deleted'
  | 'connect.disconnected'
  | 'connect.converted_to_external'
  | 'connect.converted_to_platform'
  // API key lifecycle (mirrors ezauth)
  | 'api_key.created'
  | 'api_key.revoked'
  // Plans / subscriptions
  | 'plan.created'
  | 'plan.updated'
  | 'plan.deleted'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  // Webhooks
  | 'webhook.received'
  | 'webhook.replay_rejected'

/**
 * Tuple form for runtime validation (Zod / Mongoose enum). Keep in lockstep
 * with {@link AuditLogAction}.
 */
export const AUDIT_LOG_ACTIONS = [
  'connect.onboard.started',
  'connect.onboard.completed',
  'connect.onboard.resumed',
  'connect.onboard.expired_warned',
  'connect.onboard.expired_deleted',
  'connect.disconnected',
  'connect.converted_to_external',
  'connect.converted_to_platform',
  'api_key.created',
  'api_key.revoked',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'webhook.received',
  'webhook.replay_rejected',
] as const

/**
 * Default retention window in days. EZPay does not (yet) tier audit logs by
 * plan — 90 days is the platform default and aligns with the api-core
 * factory's `DEFAULT_AUDIT_LOG_RETENTION_DAYS`.
 */
export const AUDIT_LOG_RETENTION_DAYS = 90

/** Re-export the metadata bag so callers don't need to dual-import. */
export type AuditLogMetadata = BaseAuditLogMetadata

/** Document interface narrowed to the ezpay action union. */
export interface AuditLogDocument extends Document {
  userId: string
  appName: string
  action: AuditLogAction
  metadata: AuditLogMetadata
  createdAt: Date
  expiresAt: Date
  /**
   * Stripe-pattern test/live partition. Inherited from `req.derivedMode` at
   * write time so test mode actions stay isolated from live audit logs.
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
  const mongoose = await connectToMongo('ezpay')
  return (
    (mongoose.models.AuditLog as Model<AuditLogDocument> | undefined) ??
    mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema)
  )
}
