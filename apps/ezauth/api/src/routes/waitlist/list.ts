import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from '../admin/require-admin.js'

export const waitlistListRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistListRegistry, router)

// Schemas for validation and documentation
const getAllWaitlistsResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  waitlists: z
    .record(z.array(z.string()))
    .describe('Object mapping app names to arrays of email addresses'),
  totalCount: z.number().describe('Total number of emails across all waitlists'),
  pagination: z
    .object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Items per page'),
      total: z.number().describe('Total number of items'),
      totalPages: z.number().describe('Total number of pages'),
    })
    .describe('Pagination metadata for waitlist documents'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for error responses'),
  error: z.string().describe('Error message explaining what went wrong'),
})

// Query validation schema
const listWaitlistsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// Get all waitlists (global admin only)
const getAllWaitlistsController = async (req: Request, res: Response) => {
  try {
    const parsedQuery = listWaitlistsQuerySchema.safeParse(req.query)
    if (!parsedQuery.success) {
      return sendValidationError(res, 'Invalid query parameters', parsedQuery.error.issues)
    }

    const WaitlistModel = await getWaitlistModel()
    const { page, limit } = parsedQuery.data

    const [waitlists, total] = await Promise.all([
      // @ts-expect-error - Mongoose type inference issue with dynamic query
      WaitlistModel.find({})
        .skip((page - 1) * limit)
        .limit(limit),
      WaitlistModel.countDocuments({}),
    ])

    const result = waitlists.reduce(
      (acc: Record<string, string[]>, waitlist: { appName: string; emails: string[] }) => {
        acc[waitlist.appName] = waitlist.emails
        return acc
      },
      {} as Record<string, string[]>
    )

    sendSuccess(res, {
      waitlists: result,
      totalCount: Object.values(result).reduce(
        (sum: number, emails: unknown) => sum + (emails as string[]).length,
        0
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Error fetching all waitlists:', error)
    sendError(res, 'Failed to fetch waitlists', 500)
  }
}

docRouter.get('/', verifyTokenMiddleware, requireAdmin, getAllWaitlistsController, {
  summary: 'Get all waitlists (global admin only)',
  tags: ['Waitlist'],
  responseSchema: getAllWaitlistsResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorSchema },
    403: { description: 'Admin access required', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
