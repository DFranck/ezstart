import type { Request } from 'express'
import { logger } from '@ezstart/logger/server'
import {
  computeAuditLogExpiry,
  getAuditLogModel,
  type AuditLogAction,
  type AuditLogMetadata,
  type AuditLogPlanRetention,
} from '../models/audit-log.js'

/**
 * Input shape accepted by `AuditLogService.create`. `userId` and
 * `action` are mandatory — every other field is best-effort metadata.
 */
export interface CreateAuditLogInput {
  userId: string
  action: AuditLogAction
  /**
   * App slug the action applies to. Defaults to `'ezauth'` (the
   * service that owns the audit log collection).
   */
  appName?: string
  /** Free-form metadata (ip, ua, location, action-specific details). */
  metadata?: AuditLogMetadata
  /**
   * Retention plan for the new entry. Free tier (30 days) by default.
   */
  plan?: AuditLogPlanRetention
}

/**
 * Extract the best-effort source IP from a request. Honours the most
 * common proxy header conventions (`x-forwarded-for`, `x-real-ip`)
 * before falling back to the raw socket address Express exposes via
 * `req.ip`.
 */
function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real.length > 0) {
    return real
  }
  return req.ip ?? null
}

/**
 * Fire-and-forget audit log creation service. Failures are logged via
 * the shared logger — they MUST never bubble up to the calling route
 * (logging an audit event is best-effort, not a critical path).
 */
export const AuditLogService = {
  /**
   * Persist a new audit log entry. Returns `void` — callers do NOT
   * await the resulting promise (fire-and-forget pattern). When called
   * with `await`, the helper still resolves to `void` once the write
   * completes, which is convenient in tests.
   */
  async create(input: CreateAuditLogInput): Promise<void> {
    try {
      const AuditLog = await getAuditLogModel()
      await AuditLog.create({
        userId: input.userId,
        appName: input.appName ?? 'ezauth',
        action: input.action,
        metadata: input.metadata ?? {},
        createdAt: new Date(),
        expiresAt: computeAuditLogExpiry(input.plan ?? 'free'),
      })
    } catch (err) {
      logger.warn('Failed to write audit log entry:', {
        action: input.action,
        userId: input.userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  },

  /**
   * Convenience wrapper that derives `ip` and `userAgent` from an
   * Express request and merges them into the metadata before calling
   * `create()`. The resulting promise is intentionally NOT awaited by
   * route handlers — `void` it in the call site.
   */
  async createFromRequest(
    req: Request,
    input: Omit<CreateAuditLogInput, 'metadata'> & { metadata?: AuditLogMetadata }
  ): Promise<void> {
    const ua = req.headers['user-agent']
    const requestMeta: AuditLogMetadata = {
      ip: extractIp(req),
      userAgent: typeof ua === 'string' ? ua : null,
    }
    return AuditLogService.create({
      ...input,
      metadata: { ...requestMeta, ...input.metadata },
    })
  },
}
