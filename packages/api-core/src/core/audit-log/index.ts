/**
 * Audit log primitives for SaaS services — schema factory + writer service.
 *
 * Re-exported from `@ezstart/api-core` so consumers can `import { … } from
 * '@ezstart/api-core'` without reaching into nested paths.
 *
 * @module @ezstart/api-core/audit-log
 */

export {
  computeAuditLogExpiry,
  createAuditLogSchema,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  type AuditLogDocument,
  type AuditLogMetadata,
  type CreateAuditLogSchemaOptions,
} from './schema.js'

export {
  createAuditLogService,
  type AuditLogLogger,
  type AuditLogModelLike,
  type AuditLogService,
  type CreateAuditLogInput,
  type CreateAuditLogServiceOptions,
} from './service.js'
