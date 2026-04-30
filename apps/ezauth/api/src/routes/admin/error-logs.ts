/**
 * Admin endpoint — list & inspect locally-persisted error logs.
 *
 * Reads from the `error_logs` Mongo collection populated by the
 * `persistError` callback wired in `src/index.ts`. Sentry-free stopgap so
 * the admin dashboard can browse production errors without depending on
 * a third-party tracker.
 *
 * Auth — superadmin only. App-admins should NOT see cross-tenant errors
 * (would leak app-specific context like applicationId in `context`).
 */

import type { Request, Response } from 'express'
import {
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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import {
  ERROR_LOG_LEVELS,
  getErrorLogModel,
  type ErrorLogDocument,
} from '../../models/error-log.js'
import { adminErrorSchema, paginationMetaSchema } from '../../types/admin-schemas.js'

export const errorLogsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(errorLogsRegistry, router)

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const errorLogSchema = z.object({
  _id: z.string().describe('Mongo ObjectId of the error log entry'),
  timestamp: z.string().describe('ISO timestamp of when the error occurred'),
  level: z.enum(['error', 'warn', 'fatal']).describe('Severity level'),
  message: z.string().describe('Truncated error message (max 2000 chars)'),
  errorName: z.string().optional().describe('Error class name (TypeError, ZodError, …)'),
  url: z.string().optional().describe('Request URL (originalUrl) at error time'),
  method: z.string().optional().describe('HTTP method'),
  statusCode: z.number().optional().describe('Response status code (when known)'),
  userId: z.string().optional().describe('Authenticated user ID at error time'),
  ip: z.string().optional().describe('Client IP (best-effort behind reverse proxy)'),
  env: z.string().optional().describe('DEPLOY_ENV / NODE_ENV snapshot'),
})

const errorLogDetailSchema = errorLogSchema.extend({
  stack: z.string().optional().describe('Truncated stack trace (max 8000 chars)'),
  userAgent: z.string().optional().describe('Truncated User-Agent header (max 500 chars)'),
  releaseSha: z.string().optional().describe('Git commit SHA from deploy environment'),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Free-form caller-supplied context'),
})

const listErrorLogsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(errorLogSchema).describe('Error log entries (most recent first)'),
  meta: paginationMetaSchema,
})

const getErrorLogResponseSchema = z.object({
  success: z.literal(true),
  data: errorLogDetailSchema,
})

const listErrorLogsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(50)
    .openapi({ description: 'Page size (1-200, default 50)' }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .openapi({ description: 'Pagination offset (0-based)' }),
  level: z
    .enum(ERROR_LOG_LEVELS as unknown as [string, ...string[]])
    .optional()
    .openapi({ description: 'Filter by severity level' }),
  statusCodeRange: z
    .enum(['4xx', '5xx'])
    .optional()
    .openapi({ description: 'Coarse-grained status code filter' }),
  url: z
    .string()
    .max(500)
    .optional()
    .openapi({ description: 'Substring match on the request URL (case-insensitive)' }),
  userId: z.string().optional().openapi({ description: 'Filter by authenticated userId' }),
})

const getErrorLogParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .describe('MongoDB ObjectId of the error log entry'),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isSuperAdmin(req: Request): boolean {
  return req.user?.globalRoles?.includes('superadmin') === true
}

function serializeListEntry(doc: ErrorLogDocument) {
  return {
    _id: String(doc._id),
    timestamp:
      doc.timestamp instanceof Date ? doc.timestamp.toISOString() : new Date().toISOString(),
    level: doc.level,
    message: doc.message,
    errorName: doc.errorName,
    url: doc.url,
    method: doc.method,
    statusCode: doc.statusCode,
    userId: doc.userId,
    ip: doc.ip,
    env: doc.env,
  }
}

function serializeDetailEntry(doc: ErrorLogDocument) {
  return {
    ...serializeListEntry(doc),
    stack: doc.stack,
    userAgent: doc.userAgent,
    releaseSha: doc.releaseSha,
    context: doc.context,
  }
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

const listErrorLogsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSuperAdmin(req)) {
      sendError(res, 'Superadmin role required', 403)
      return
    }

    const parsedQuery = listErrorLogsQuerySchema.safeParse(req.query)
    if (!parsedQuery.success) {
      sendValidationError(res, 'Invalid query parameters', parsedQuery.error.issues)
      return
    }

    const { limit, offset, level, statusCodeRange, url, userId } = parsedQuery.data

    const ErrorLog = await getErrorLogModel()
    const query: Record<string, unknown> = {}

    if (level) query.level = level
    if (statusCodeRange === '4xx') query.statusCode = { $gte: 400, $lt: 500 }
    if (statusCodeRange === '5xx') query.statusCode = { $gte: 500, $lt: 600 }
    if (userId) query.userId = userId
    if (url) {
      query.url = { $regex: escapeRegex(url), $options: 'i' }
    }

    const [docs, total] = await Promise.all([
      ErrorLog.find(query).sort({ timestamp: -1 }).skip(offset).limit(limit).lean(),
      ErrorLog.countDocuments(query),
    ])

    const data = docs.map(d => serializeListEntry(d as unknown as ErrorLogDocument))
    sendSuccess(res, data, { total, limit, offset })
  } catch (err: unknown) {
    logger.error('Error listing error logs:', err)
    sendError(res, 'Failed to list error logs', 500)
  }
}

const getErrorLogController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSuperAdmin(req)) {
      sendError(res, 'Superadmin role required', 403)
      return
    }

    const parsedParams = getErrorLogParamsSchema.safeParse(req.params)
    if (!parsedParams.success) {
      sendValidationError(res, 'Invalid parameters', parsedParams.error.issues)
      return
    }

    const ErrorLog = await getErrorLogModel()
    const doc = await ErrorLog.findById(parsedParams.data.id).lean()

    if (!doc) {
      sendError(res, 'Error log entry not found', 404)
      return
    }

    sendSuccess(res, serializeDetailEntry(doc as unknown as ErrorLogDocument))
  } catch (err: unknown) {
    logger.error('Error getting error log:', err)
    sendError(res, 'Failed to get error log', 500)
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

docRouter.get('/error-logs', verifyTokenMiddleware, requireAdmin, listErrorLogsController, {
  summary: 'List recent error logs (superadmin)',
  tags: ['Admin'],
  querySchema: listErrorLogsQuerySchema,
  responseSchema: listErrorLogsResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: adminErrorSchema },
    403: { description: 'Superadmin role required', schema: adminErrorSchema },
    500: { description: 'Server error', schema: adminErrorSchema },
  },
})

docRouter.get('/error-logs/:id', verifyTokenMiddleware, requireAdmin, getErrorLogController, {
  summary: 'Get single error log entry (superadmin)',
  tags: ['Admin'],
  responseSchema: getErrorLogResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: adminErrorSchema },
    403: { description: 'Superadmin role required', schema: adminErrorSchema },
    404: { description: 'Error log entry not found', schema: adminErrorSchema },
    500: { description: 'Server error', schema: adminErrorSchema },
  },
})

export default router
