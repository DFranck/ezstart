import { logger } from '@ezstart/logger/server'
import {
  createModerateRateLimiter,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { CONTACT_TOPICS, sendContactEmail } from '../../services/contact-email.js'

export const submitContactRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(submitContactRegistry, router, '/contact')

export const ContactRequestSchema = z.object({
  topic: z.enum(CONTACT_TOPICS).default('general').describe('What the visitor wants to discuss'),
  company: z.string().trim().min(1).max(200).describe('Company name'),
  email: z.string().trim().email().max(254).describe('Contact email'),
  message: z.string().trim().min(1).max(3000).describe('Description of the need'),
  locale: z.enum(['en', 'fr', 'vi']).optional().describe('Visitor locale'),
  // Honeypot: real visitors never fill this hidden field.
  website: z.string().max(500).optional().describe('Leave empty'),
})

const ContactResponseSchema = z.object({
  success: z.boolean().describe('Whether the message was accepted'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// POST /api/contact - public contact form (rate limited per IP)
docRouter.post(
  '/',
  createModerateRateLimiter({ message: 'Too many messages, please try again later.' }),
  async (req, res) => {
    const validation = ContactRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid request body', validation.error.errors)
    }

    const { website, ...message } = validation.data

    // Bots fill the honeypot: answer like a success so they learn nothing.
    if (website && website.length > 0) {
      return sendSuccess(res, { received: true })
    }

    try {
      await sendContactEmail(message)
      sendSuccess(res, { received: true })
    } catch (error) {
      logger.error('Contact form delivery failed:', error)
      sendError(res, 'Failed to send message', 502)
    }
  },
  {
    summary: 'Send a contact request',
    tags: ['Contact'],
    bodySchema: ContactRequestSchema,
    responseSchema: ContactResponseSchema,
  }
)

export default router
