/**
 * EZPay audit log writer service — thin wrapper around the agnostic
 * `createAuditLogService` factory in `@ezstart/api-core`. Wires the ezpay
 * model factory + default app-name + shared logger so route handlers only
 * need to call `auditLogService.create({ … })` or `createFromRequest`.
 *
 * @module apps/ezpay/api/src/services/audit-log.service
 */

import { createAuditLogService, type AuditLogService } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import {
  AUDIT_LOG_RETENTION_DAYS,
  getAuditLogModel,
  type AuditLogAction,
} from '../models/audit-log.js'

/**
 * Singleton service used by all ezpay routes that need to record an audit
 * entry. Failures are logged via `@ezstart/logger` and never throw.
 *
 * @example
 * ```ts
 * import { auditLogService } from '../../services/audit-log.service.js'
 *
 * void auditLogService.createFromRequest(req, {
 *   action: 'connect.onboard.resumed',
 *   metadata: { connectedAccountId, applicationId },
 * })
 * ```
 */
export const auditLogService: AuditLogService<AuditLogAction> =
  createAuditLogService<AuditLogAction>({
    getModel: getAuditLogModel,
    defaultAppName: 'ezpay',
    logger,
    defaultRetentionDays: AUDIT_LOG_RETENTION_DAYS,
  })

export type { AuditLogAction }
