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

export const getWaitlistRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getWaitlistRegistry, router)

// Schemas
const waitlistEntrySchema = z.object({
  _id: z.string().optional().describe('Entry unique identifier'),
  email: z.string().describe('Email address'),
  status: z.enum(['pending', 'invited', 'activated', 'rejected']).describe('Current status'),
  accessCode: z.string().nullable().describe('Access code if invited'),
  invitedAt: z.date().nullable().describe('Date when invited'),
  activatedAt: z.date().nullable().describe('Date when activated'),
  addedAt: z.date().describe('Date when added to waitlist'),
  notes: z.string().describe('Optional notes'),
})

const waitlistStatsSchema = z.object({
  total: z.number().describe('Total entries count'),
  pending: z.number().describe('Pending entries count'),
  invited: z.number().describe('Invited entries count'),
  activated: z.number().describe('Activated entries count'),
  rejected: z.number().describe('Rejected entries count'),
})

const getWaitlistResponseSchema = z.object({
  entries: z.array(waitlistEntrySchema).describe('Array of waitlist entries'),
  stats: waitlistStatsSchema.describe('Statistics about the waitlist'),
})

const errorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message'),
})

// Get waitlist for specific app (admin endpoint)
const getWaitlistController = async (req: Request, res: Response) => {
  try {
    const WaitlistModel = await getWaitlistModel()
    const { appName } = req.params

    // Find waitlist
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      // Return empty waitlist if not found
      return sendSuccess(res, {
        entries: [],
        stats: {
          total: 0,
          pending: 0,
          invited: 0,
          activated: 0,
          rejected: 0,
        },
      })
    }

    // Calculate stats
    const stats = {
      total: waitlist.emails.length,
      pending: waitlist.emails.filter((e: { status: string }) => e.status === 'pending').length,
      invited: waitlist.emails.filter((e: { status: string }) => e.status === 'invited').length,
      activated: waitlist.emails.filter((e: { status: string }) => e.status === 'activated').length,
      rejected: waitlist.emails.filter((e: { status: string }) => e.status === 'rejected').length,
    }

    sendSuccess(res, {
      entries: waitlist.emails,
      stats,
    })
  } catch (error) {
    logger.error('Error fetching waitlist:', error)
    sendError(res, 'Failed to fetch waitlist', 500)
  }
}

docRouter.get('/:appName', verifyTokenMiddleware, requireAdmin, getWaitlistController, {
  summary: 'Get waitlist for specific app (admin)',
  tags: ['Admin', 'Waitlist'],
  responseSchema: getWaitlistResponseSchema,
  extraResponses: {
    403: { description: 'Forbidden - Admin access required', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
