/**
 * GET /api/applications/lookup?slug=acme — public endpoint.
 *
 * Returns the minimal tenant identity (`id`, `slug`, `name`) without auth.
 * Used by sibling services (ezpay, etc.) to resolve a slug to its canonical
 * Application id before persisting keys. Rate-limited per slug to mitigate
 * enumeration.
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getApplicationModel, APPLICATION_SLUG_REGEX } from '../../models/application.js'
import { logger } from '@ezstart/logger/server'

export const lookupApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(lookupApplicationRegistry, router)

const lookupResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// Simple in-memory rate limiter per slug (same pattern as /keys/config).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

function isRateLimited(slug: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(slug)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(slug, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

const lookupApplicationController = async (req: Request, res: Response) => {
  try {
    const slugRaw = req.query.slug
    if (!slugRaw || typeof slugRaw !== 'string') {
      return sendError(res, 'Missing slug query parameter', 400)
    }

    const slug = slugRaw.toLowerCase().trim()

    if (!APPLICATION_SLUG_REGEX.test(slug)) {
      return sendError(res, 'Invalid slug format', 400)
    }

    if (isRateLimited(slug)) {
      return sendError(res, 'Rate limited', 429)
    }

    const Application = await getApplicationModel()
    const app = await Application.findOne({ slug, status: 'active' }).lean()

    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    return sendSuccess(res, {
      id: app._id.toString(),
      slug: app.slug,
      name: app.name,
    })
  } catch (error: unknown) {
    logger.error('Lookup application error:', error)
    return sendError(res, 'Failed to lookup application', 500)
  }
}

docRouter.get('/applications/lookup', lookupApplicationController, {
  summary: 'Public lookup of an Application by slug (rate-limited)',
  tags: ['Applications'],
  responseSchema: lookupResponseSchema,
  extraResponses: {
    400: { description: 'Missing or invalid slug parameter', schema: errorResponseSchema },
    404: { description: 'Application not found', schema: errorResponseSchema },
    429: { description: 'Rate limited', schema: errorResponseSchema },
  },
})

export default router
