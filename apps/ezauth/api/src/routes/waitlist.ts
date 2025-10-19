import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../models/waitlist.js'
import { z } from 'zod'

export const waitlistRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistRegistry, router)

// Schemas for validation and documentation
const addEmailSchema = z.object({
  email: z.string().email('Invalid email format').describe('Email address to add to the waitlist')
})

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

const getAllWaitlistsResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  waitlists: z.record(z.array(z.string())).describe('Object mapping app names to arrays of email addresses'),
  totalCount: z.number().describe('Total number of emails across all waitlists')
})

// Add email to waitlist for an app
const addEmailController = async (req: any, res: any) => {
  try {
    const WaitlistModel = await getWaitlistModel()

    const { appName } = req.params
    const { email } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      })
    }

    // Find or create waitlist for this app
    // @ts-expect-error - Mongoose type inference issue
    let waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      waitlist = new WaitlistModel({
        appName,
        emails: []
      })
    }

    // Check if email already exists
    const emailLower = email.toLowerCase()
    const exists = waitlist.emails.some((e: string) => e === emailLower)

    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
        count: waitlist.emails.length
      })
    }

    // Add email
    waitlist.emails.push(emailLower)
    await waitlist.save()

    res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist',
      count: waitlist.emails.length
    })
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add email to waitlist'
    })
  }
}

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
    console.error('Error fetching waitlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waitlist'
    })
  }
}

// Get all waitlists (admin endpoint)
const getAllWaitlistsController = async (req: any, res: any) => {
  try {
    const WaitlistModel = await getWaitlistModel()

    // @ts-expect-error - Mongoose type inference issue
    const waitlists = await WaitlistModel.find({})

    const result = waitlists.reduce((acc: Record<string, string[]>, waitlist: any) => {
      acc[waitlist.appName] = waitlist.emails
      return acc
    }, {} as Record<string, string[]>)

    res.json({
      success: true,
      waitlists: result,
      totalCount: Object.values(result).reduce((sum: number, emails: unknown) => sum + (emails as string[]).length, 0)
    })
  } catch (error) {
    console.error('Error fetching all waitlists:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waitlists'
    })
  }
}

// Define API routes with OpenAPI documentation
docRouter.post('/:appName/add', addEmailController, {
  summary: 'Add email to waitlist for specific app',
  tags: ['Waitlist'],
  bodySchema: addEmailSchema,
  responseSchema: waitlistResponseSchema,
  status: 201,
  extraResponses: {
    400: { description: 'Invalid email', schema: errorSchema },
    409: { description: 'Email already exists', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema }
  }
})

docRouter.get('/:appName', getWaitlistController, {
  summary: 'Get waitlist for specific app',
  tags: ['Waitlist'],
  responseSchema: waitlistResponseSchema,
  extraResponses: {
    500: { description: 'Server error', schema: errorSchema }
  }
})

docRouter.get('/', getAllWaitlistsController, {
  summary: 'Get all waitlists (admin)',
  tags: ['Waitlist'],
  responseSchema: getAllWaitlistsResponseSchema,
  extraResponses: {
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router