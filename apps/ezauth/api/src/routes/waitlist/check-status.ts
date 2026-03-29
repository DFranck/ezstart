import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const checkStatusRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(checkStatusRegistry, router)

// Schemas
const checkStatusResponseSchema = z.object({
  found: z.boolean().describe('Whether email was found in waitlist'),
  status: z
    .enum(['pending', 'invited', 'activated', 'rejected'])
    .optional()
    .describe('Current status'),
  accessCode: z.string().optional().describe('Access code if invited'),
  appName: z.string().describe('Application name'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for errors'),
  error: z.string().describe('Error message'),
})

// Check status of email in waitlist
const checkStatusController = async (req: any, res: any) => {
  try {
    const { appName, email } = req.params

    const WaitlistModel = await getWaitlistModel()
    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return sendSuccess(res, {
        found: false,
        appName,
      })
    }

    const entry = waitlist.findEntryByEmail(email)

    if (!entry) {
      return sendSuccess(res, {
        found: false,
        appName,
      })
    }

    sendSuccess(res, {
      found: true,
      status: entry.status,
      accessCode: entry.status === 'invited' ? entry.accessCode : undefined,
      appName: waitlist.appName,
    })
  } catch (error) {
    logger.error('Error checking waitlist status:', error)
    sendError(res, 'Failed to check status', 500)
  }
}

docRouter.get('/:appName/status/:email', checkStatusController, {
  summary: 'Check email status in waitlist',
  tags: ['Waitlist'],
  responseSchema: checkStatusResponseSchema,
  extraResponses: {
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
