import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const listWaitlistRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listWaitlistRegistry, router)

// Schemas
const waitlistEntrySchema = z.object({
  email: z.string().describe('Email address'),
  status: z
    .enum(['pending', 'invited', 'activated', 'rejected'])
    .describe('Current waitlist status'),
  accessCode: z.string().nullable().describe('Access code if invited'),
  invitedAt: z.string().nullable().describe('Invitation date ISO string'),
  invitedBy: z.string().nullable().describe('ID of admin who invited'),
  activatedAt: z.string().nullable().describe('Activation date ISO string'),
  notes: z.string().describe('Admin notes'),
  addedAt: z.string().describe('Date added to waitlist'),
})

const listWaitlistResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  appName: z.string().describe('Application name'),
  entries: z.array(waitlistEntrySchema).describe('Waitlist entries'),
  pagination: z
    .object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Items per page'),
      total: z.number().describe('Total number of entries'),
      totalPages: z.number().describe('Total number of pages'),
    })
    .describe('Pagination metadata'),
  stats: z
    .object({
      total: z.number().describe('Total entries count'),
      pending: z.number().describe('Pending entries count'),
      invited: z.number().describe('Invited entries count'),
      activated: z.number().describe('Activated entries count'),
      rejected: z.number().describe('Rejected entries count'),
    })
    .describe('Waitlist statistics'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for errors'),
  error: z.string().describe('Error message'),
})

// List waitlist for an app
const listWaitlistController = async (req: Request, res: Response) => {
  try {
    const WaitlistModel = await getWaitlistModel()
    const { appName } = req.params
    const { status } = req.query
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    // Find waitlist
    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return sendError(res, `Waitlist not found for app: ${appName}`, 404)
    }

    // Filter by status if provided
    let entries = waitlist.emails
    if (status) {
      entries = entries.filter((entry: { status: string }) => entry.status === status)
    }

    // Calculate stats (on all emails, before pagination)
    const stats = {
      total: waitlist.emails.length,
      pending: waitlist.emails.filter((e: { status: string }) => e.status === 'pending').length,
      invited: waitlist.emails.filter((e: { status: string }) => e.status === 'invited').length,
      activated: waitlist.emails.filter((e: { status: string }) => e.status === 'activated').length,
      rejected: waitlist.emails.filter((e: { status: string }) => e.status === 'rejected').length,
    }

    // Paginate filtered entries
    const total = entries.length
    const skip = (page - 1) * limit
    const paginatedEntries = entries.slice(skip, skip + limit)

    sendSuccess(res, {
      appName: waitlist.appName,
      entries: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    logger.error('Error listing waitlist:', error)
    sendError(res, 'Failed to list waitlist', 500)
  }
}

docRouter.get('/:appName', verifyTokenMiddleware, requireAdmin, listWaitlistController, {
  summary: 'List waitlist entries for an app (Admin only)',
  tags: ['Admin', 'Waitlist'],
  responseSchema: listWaitlistResponseSchema,
  status: 200,
  extraResponses: {
    403: { description: 'Forbidden - Admin access required', schema: errorSchema },
    404: { description: 'Waitlist not found', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
