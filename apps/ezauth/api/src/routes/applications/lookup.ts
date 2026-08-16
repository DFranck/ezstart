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
  createKeyHashRateLimiter,
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

// Per-slug in-memory rate limiter (30 req / 60 s) shared from
// `@ezstart/api-core`. Mounted as middleware on the route so the limit
// applies BEFORE slug validation — keeps an attacker from probing the
// 400-vs-404 boundary via malformed slugs at higher RPS.
const rateLimiter = createKeyHashRateLimiter({
  extractKey: req => {
    const raw = req.query.slug
    if (typeof raw !== 'string' || raw.length === 0) return null
    return raw.toLowerCase().trim()
  },
})

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

docRouter.get('/applications/lookup', rateLimiter, lookupApplicationController, {
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
