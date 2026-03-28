import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const waitlistListRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(waitlistListRegistry, router)

// Schemas for validation and documentation
const getAllWaitlistsResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  waitlists: z.record(z.array(z.string())).describe('Object mapping app names to arrays of email addresses'),
  totalCount: z.number().describe('Total number of emails across all waitlists'),
  pagination: z.object({
    page: z.number().describe('Current page number'),
    limit: z.number().describe('Items per page'),
    total: z.number().describe('Total number of items'),
    totalPages: z.number().describe('Total number of pages'),
  }).describe('Pagination metadata for waitlist documents'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for error responses'),
  error: z.string().describe('Error message explaining what went wrong')
})

// Get all waitlists (admin endpoint)
const getAllWaitlistsController = async (req: any, res: any) => {
  try {
    const WaitlistModel = await getWaitlistModel()
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    // @ts-expect-error - Mongoose type inference issue
    const [waitlists, total] = await Promise.all([
      WaitlistModel.find({}).skip((page - 1) * limit).limit(limit),
      WaitlistModel.countDocuments({})
    ])

    const result = waitlists.reduce((acc: Record<string, string[]>, waitlist: any) => {
      acc[waitlist.appName] = waitlist.emails
      return acc
    }, {} as Record<string, string[]>)

    res.json({
      success: true,
      waitlists: result,
      totalCount: Object.values(result).reduce((sum: number, emails: unknown) => sum + (emails as string[]).length, 0),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Error fetching all waitlists:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waitlists'
    })
  }
}

docRouter.get('/', getAllWaitlistsController, {
  summary: 'Get all waitlists (admin)',
  tags: ['Waitlist'],
  responseSchema: getAllWaitlistsResponseSchema,
  extraResponses: {
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
