import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { z } from 'zod'

export const listWaitlistRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listWaitlistRegistry, router)

// Schemas
const waitlistEntrySchema = z.object({
  email: z.string(),
  status: z.enum(['pending', 'invited', 'activated', 'rejected']),
  accessCode: z.string().nullable(),
  invitedAt: z.string().nullable(),
  invitedBy: z.string().nullable(),
  activatedAt: z.string().nullable(),
  notes: z.string(),
  addedAt: z.string(),
})

const listWaitlistResponseSchema = z.object({
  success: z.boolean(),
  appName: z.string(),
  entries: z.array(waitlistEntrySchema),
  stats: z.object({
    total: z.number(),
    pending: z.number(),
    invited: z.number(),
    activated: z.number(),
    rejected: z.number(),
  }),
})

const errorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// List waitlist for an app
const listWaitlistController = async (req: any, res: any) => {
  try {
    const currentUser = req.user
    const isAdmin = currentUser.roles?.includes('admin') || currentUser.roles?.includes('superadmin')

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    const WaitlistModel = await getWaitlistModel()
    const { appName } = req.params
    const { status } = req.query

    // Find waitlist
    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return res.status(404).json({
        success: false,
        error: `Waitlist not found for app: ${appName}`
      })
    }

    // Filter by status if provided
    let entries = waitlist.emails
    if (status) {
      entries = entries.filter((entry: any) => entry.status === status)
    }

    // Calculate stats
    const stats = {
      total: waitlist.emails.length,
      pending: waitlist.emails.filter((e: any) => e.status === 'pending').length,
      invited: waitlist.emails.filter((e: any) => e.status === 'invited').length,
      activated: waitlist.emails.filter((e: any) => e.status === 'activated').length,
      rejected: waitlist.emails.filter((e: any) => e.status === 'rejected').length,
    }

    res.json({
      success: true,
      appName: waitlist.appName,
      entries,
      stats
    })
  } catch (error) {
    console.error('Error listing waitlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list waitlist'
    })
  }
}

docRouter.get('/:appName', verifyTokenMiddleware, listWaitlistController, {
  summary: 'List waitlist entries for an app (Admin only)',
  tags: ['Admin', 'Waitlist'],
  responseSchema: listWaitlistResponseSchema,
  status: 200,
  extraResponses: {
    403: { description: 'Forbidden - Admin access required', schema: errorSchema },
    404: { description: 'Waitlist not found', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
