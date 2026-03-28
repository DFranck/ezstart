import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const waitlistGetRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistGetRegistry, router)

// Schemas for validation and documentation
const waitlistResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  message: z.string().optional().describe('Optional success message'),
  alreadyExists: z.boolean().optional().describe('Indicates if the email was already in the waitlist'),
  count: z.number().describe('Total number of emails in the waitlist'),
  appName: z.string().optional().describe('Name of the application'),
  emails: z.array(z.string()).optional().describe('List of emails in the waitlist (admin only)')
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for error responses'),
  error: z.string().describe('Error message explaining what went wrong')
})

// Get waitlist for an app
const getWaitlistController = async (req: any, res: any) => {
  try {
    const WaitlistModel = await getWaitlistModel()

    const { appName } = req.params

    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return res.json({
        success: true,
        appName,
        count: 0,
        emails: []
      })
    }

    res.json({
      success: true,
      appName,
      count: waitlist.emails.length,
      emails: waitlist.emails
    })
  } catch (error) {
    logger.error('Error fetching waitlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waitlist'
    })
  }
}

docRouter.get('/:appName', getWaitlistController, {
  summary: 'Get waitlist for specific app',
  tags: ['Waitlist'],
  responseSchema: waitlistResponseSchema,
  extraResponses: {
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
