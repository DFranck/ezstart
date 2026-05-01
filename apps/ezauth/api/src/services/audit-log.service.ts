/**
 * EZAuth audit log writer service — thin wrapper around the agnostic
 * `createAuditLogService` factory in `@ezstart/api-core`.
 *
 * The public surface (`AuditLogService.create` and
 * `AuditLogService.createFromRequest`) is unchanged so existing callers do
 * not need to migrate. The retention-plan dispatch (`free` / `pro`) is layered
 * here because it's app-specific (ezauth has the concept of audit-log plan
 * tiers — generic api-core does not).
 *
 * @module apps/ezauth/api/src/services/audit-log.service
 */

import type { Request } from 'express'
import { createAuditLogService } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import {
  AUDIT_LOG_RETENTION_DAYS,
  computeAuditLogExpiry,
  getAuditLogModel,
  type AuditLogAction,
  type AuditLogMetadata,
  type AuditLogPlanRetention,
} from '../models/audit-log.js'

/**
 * Input shape accepted by `AuditLogService.create`. `userId` and `action` are
 * mandatory — every other field is best-effort metadata.
 */
export interface CreateAuditLogInput {
  userId: string
  action: AuditLogAction
  /**
   * App slug the action applies to. Defaults to `'ezauth'` (the service that
   * owns the audit log collection).
   */
  appName?: string
  /** Free-form metadata (ip, ua, location, action-specific details). */
  metadata?: AuditLogMetadata
  /** Retention plan for the new entry. Free tier (30 days) by default. */
  plan?: AuditLogPlanRetention
}

const baseService = createAuditLogService<AuditLogAction>({
  getModel: getAuditLogModel,
  defaultAppName: 'ezauth',
  logger,
  defaultRetentionDays: AUDIT_LOG_RETENTION_DAYS.free,
})

/**
 * Translate an ezauth retention `plan` into the equivalent days count expected
 * by the agnostic factory. Centralised here so callers only ever talk in
 * terms of plan tiers.
 */
function planToDays(plan?: AuditLogPlanRetention): number {
  return AUDIT_LOG_RETENTION_DAYS[plan ?? 'free']
}

/**
 * Fire-and-forget audit log creation service. Failures are logged via the
 * shared logger — they MUST never bubble up to the calling route (logging an
 * audit event is best-effort, not a critical path).
 */
export const AuditLogService = {
  /**
   * Persist a new audit log entry. Returns `void` — callers do NOT await the
   * resulting promise (fire-and-forget pattern). When called with `await`,
   * the helper still resolves to `void` once the write completes, which is
   * convenient in tests.
   */
  async create(input: CreateAuditLogInput): Promise<void> {
    return baseService.create({
      userId: input.userId,
      action: input.action,
      appName: input.appName,
      metadata: input.metadata,
      retentionDays: planToDays(input.plan),
    })
  },

  /**
   * Convenience wrapper that derives `ip` and `userAgent` from an Express
   * request and merges them into the metadata before calling `create()`. The
   * resulting promise is intentionally NOT awaited by route handlers — `void`
   * it in the call site.
   */
  async createFromRequest(
    req: Request,
    input: Omit<CreateAuditLogInput, 'metadata'> & { metadata?: AuditLogMetadata }
  ): Promise<void> {
    return baseService.createFromRequest(req, {
      userId: input.userId,
      action: input.action,
      appName: input.appName,
      metadata: input.metadata,
      retentionDays: planToDays(input.plan),
    })
  },
}

// Re-exported so callers that imported these symbols from the service file
// continue to work after the refactor.
export { computeAuditLogExpiry, AUDIT_LOG_RETENTION_DAYS }
export type { AuditLogAction, AuditLogMetadata, AuditLogPlanRetention }
