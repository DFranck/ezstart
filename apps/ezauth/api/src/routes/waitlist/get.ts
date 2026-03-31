import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createAuthMiddleware,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { verifyTokenMiddleware } from '../../middleware/auth.js'

export const waitlistGetRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistGetRegistry, router)

// Schemas for validation and documentation
const waitlistResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  message: z.string().optional().describe('Optional success message'),
  alreadyExists: z
    .boolean()
    .optional()
    .describe('Indicates if the email was already in the waitlist'),
  count: z.number().describe('Total number of emails in the waitlist'),
  appName: z.string().optional().describe('Name of the application'),
  emails: z.array(z.string()).optional().describe('List of emails in the waitlist (admin only)'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for error responses'),
  error: z.string().describe('Error message explaining what went wrong'),
})

// Get waitlist for an app (admin only)
const getWaitlistController = async (req: Request, res: Response) => {
  try {
    const { appName } = req.params
    const user = req.user as
      | {
          globalRoles?: string[]
          appRoles?: Record<string, string[]>
        }
      | undefined

    // Check authorization: globalRoles admin/superadmin OR appRoles admin for this app
    const isGlobalAdmin =
      user?.globalRoles?.includes('superadmin') || user?.globalRoles?.includes('admin')
    const isAppAdmin = user?.appRoles?.[appName!]?.includes('admin')

    if (!isGlobalAdmin && !isAppAdmin) {
      return sendError(res, 'Admin access required', 403)
    }

    const WaitlistModel = await getWaitlistModel()

    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return sendSuccess(res, {
        appName,
        count: 0,
        emails: [],
      })
    }

    sendSuccess(res, {
      appName,
      count: waitlist.emails.length,
      emails: waitlist.emails,
    })
  } catch (error) {
    logger.error('Error fetching waitlist:', error)
    sendError(res, 'Failed to fetch waitlist', 500)
  }
}

docRouter.get('/:appName', verifyTokenMiddleware, getWaitlistController, {
  summary: 'Get waitlist for specific app (admin only)',
  tags: ['Waitlist'],
  responseSchema: waitlistResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorSchema },
    403: { description: 'Admin access required', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
