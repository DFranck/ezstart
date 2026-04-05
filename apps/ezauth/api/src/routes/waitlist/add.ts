import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createStrictRateLimiter,
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

/** Strict rate limit: 5 requests per 15 minutes */
const waitlistAddRateLimiter = createStrictRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many waitlist registration attempts, please try again later.',
})

export const waitlistAddRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistAddRegistry, router)

// Schemas for validation and documentation
const addEmailSchema = z.object({
  email: z.string().email('Invalid email format').describe('Email address to add to the waitlist'),
})

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

// Add email to waitlist for an app
const addEmailController = async (req: Request, res: Response) => {
  try {
    const parsed = addEmailSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid email address', parsed.error.issues)
    }

    const WaitlistModel = await getWaitlistModel()

    const { appName } = req.params
    const { email } = parsed.data

    // Find or create waitlist for this app
    let waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      waitlist = new WaitlistModel({
        appName,
        emails: [],
      })
    }

    // Check if email already exists
    const emailLower = email.toLowerCase()
    const existingEntry = waitlist.findEntryByEmail(emailLower)

    if (existingEntry) {
      return sendError(res, 'Email already registered', 409)
    }

    // Add email with default status 'pending'
    waitlist.emails.push({
      email: emailLower,
      status: 'pending',
      accessCode: null,
      invitedAt: null,
      invitedBy: null,
      activatedAt: null,
      notes: '',
      addedAt: new Date(),
    })
    await waitlist.save()

    res.status(201)
    sendSuccess(res, {
      message: 'Successfully added to waitlist',
      count: waitlist.emails.length,
    })
  } catch (error) {
    logger.error('Error adding to waitlist:', error)
    sendError(res, 'Failed to add email to waitlist', 500)
  }
}

docRouter.post('/:appName/add', waitlistAddRateLimiter, addEmailController, {
  summary: 'Add email to waitlist for specific app',
  tags: ['Waitlist'],
  bodySchema: addEmailSchema,
  responseSchema: waitlistResponseSchema,
  status: 201,
  extraResponses: {
    400: { description: 'Invalid email', schema: errorSchema },
    409: { description: 'Email already exists', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
