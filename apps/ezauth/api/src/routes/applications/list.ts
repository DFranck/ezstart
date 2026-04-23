/**
 * GET /api/applications — list Applications owned by the current user.
 *
 * Auth: Bearer. Superadmins can pass `?all=true` to list all Applications
 * across all owners (platform admin view).
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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { serializeApplication } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const listApplicationsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApplicationsRegistry, router)

const themeTokenSchema = z.object({
  primary: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  accent: z.string().optional(),
  logo: z.string().optional(),
})

const applicationItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  ownerId: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  status: z.enum(['active', 'archived']),
  theme: themeTokenSchema.nullable().optional(),
  themeEnabled: z.boolean(),
  isPlatformOwned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const listApplicationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(applicationItemSchema),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const listApplicationsController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const all = req.query.all === 'true'

    let query: Record<string, unknown> = { ownerId: userId }

    if (all) {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        return sendError(res, '`?all=true` requires superadmin', 403)
      }
      query = {}
    }

    const Application = await getApplicationModel()
    const apps = await Application.find(query).sort({ createdAt: -1 }).lean()

    const data = apps.map(a => serializeApplication(a))

    return sendSuccess(res, data)
  } catch (error: unknown) {
    logger.error('List applications error:', error)
    return sendError(res, 'Failed to list applications', 500)
  }
}

docRouter.get('/applications', verifyTokenMiddleware, listApplicationsController, {
  summary: 'List Applications owned by the current user (or all, for superadmin)',
  tags: ['Applications'],
  responseSchema: listApplicationsResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    403: {
      description: 'Forbidden (`?all=true` requires superadmin)',
      schema: errorResponseSchema,
    },
  },
})

export default router
