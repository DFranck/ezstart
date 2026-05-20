import type { Request, Response } from 'express'
import {
  createRateLimiter,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'
import { AUDIT_LOG_ACTIONS, getAuditLogModel } from '../../models/audit-log.js'

export const auditLogRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(auditLogRegistry, router)

const auditLogRateLimiter = createRateLimiter()

// ─── Schemas ────────────────────────────────────────────────────────────────

const auditLogQuerySchema = z.object({
  limit: z
    .preprocess(v => (typeof v === 'string' ? Number(v) : v), z.number().int().min(1).max(100))
    .optional()
    .default(20)
    .describe('Number of entries to return (default 20, max 100)'),
  offset: z
    .preprocess(v => (typeof v === 'string' ? Number(v) : v), z.number().int().min(0))
    .optional()
    .default(0)
    .describe('Pagination offset'),
  action: z.enum(AUDIT_LOG_ACTIONS).optional().describe('Filter on a single action type'),
})

const auditLogEntrySchema = z.object({
  id: z.string().describe('Audit log entry id'),
  userId: z.string(),
  appName: z.string(),
  action: z.enum(AUDIT_LOG_ACTIONS),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  expiresAt: z.string().describe('ISO 8601 TTL deadline (per plan)'),
})

const auditLogResponseSchema = z.object({
  items: z.array(auditLogEntrySchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
})

// ─── Controller ─────────────────────────────────────────────────────────────

const auditLogController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const parsed = auditLogQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid audit log query', parsed.error.issues)
    }

    const { limit, offset, action } = parsed.data
    const filter: Record<string, unknown> = { userId }
    if (action) {
      filter.action = action
    }

    const AuditLog = await getAuditLogModel()
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ])

    sendSuccess(res, {
      items: items.map(item => ({
        id: item._id.toString(),
        userId: item.userId,
        appName: item.appName,
        action: item.action,
        metadata: item.metadata ?? {},
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
      })),
      total,
      limit,
      offset,
    })
  } catch (err) {
    // MED-1 — generic message; raw err.message would leak DB internals.
    logger.error('List audit log error:', err)
    sendError(res, 'Failed to list audit log', 500)
  }
}

docRouter.get('/me/audit-log', auditLogRateLimiter, authMiddleware, auditLogController, {
  summary: "List the current user's audit log entries (paginated, filterable)",
  tags: ['User'],
  querySchema: auditLogQuerySchema,
  responseSchema: auditLogResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    422: { description: 'Invalid query parameters', schema: errorResponseSchema },
  },
})

export default router
