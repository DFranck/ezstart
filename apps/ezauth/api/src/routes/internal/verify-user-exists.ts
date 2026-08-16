/**
 * Internal S2S endpoint — verify a user id exists in the ezauth
 * source-of-truth.
 *
 * Returns a MINIMAL boolean response with NO PII (no email, no globalRoles,
 * no username). Used by other @ezstart APIs (ezpay `POST /api/subscribe`) to
 * gate creation of user-bound rows on the ezauth source-of-truth.
 *
 * ## Threat model
 *
 * The previous design reused `GET /api/admin/users/:id` for this purpose but
 * that endpoint returns a full PII payload (email + globalRoles + username +
 * timestamps). Since `NEXT_PUBLIC_EZAUTH_KEY` is a publishable-scope=admin key
 * shipped in every ezauth-web bundle, a browser visitor could extract it and
 * enumerate any user's PII — a GDPR-grade leak.
 *
 * This endpoint fixes that by:
 *
 * 1. Accepting `authJwtOrKey({ requireKeyScope: 'admin' })` — a superadmin
 *    JWT OR an admin-scoped key.
 * 2. Additionally requiring `req.apiKeyType === 'secret'` when the caller
 *    authenticated via an API key (i.e. NOT a publishable key). A publishable
 *    admin key that leaks into a browser bundle CANNOT invoke this endpoint.
 * 3. Returning only `{ exists, isDeleted }` — no PII whatsoever.
 *
 * @module apps/ezauth/api/src/routes/internal/verify-user-exists
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { requireAdmin } from '../admin/require-admin.js'
import { requireSecretKeyOrJwt } from '../../middleware/require-secret-key-or-jwt.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const verifyUserExistsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyUserExistsRegistry, router)

const bodySchema = z.object({
  userId: z
    .string()
    .min(1, 'userId is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .describe('MongoDB ObjectId of the user to verify'),
})

const responseSchema = z.object({
  exists: z.boolean().describe('Whether the user document exists'),
  isDeleted: z.boolean().describe('Whether the user is soft-deleted'),
})

const errorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const verifyUserExistsController = async (req: Request, res: Response) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid body', parsed.error.issues)
    }

    const AuthUser = await getAuthUserModel()

    // The AuthUser schema has a pre-hook that filters `deletedAt: null` on
    // findOne — so we bypass that with a raw query to observe soft-deleted
    // state and expose the distinction to callers.
    const user = await AuthUser.collection.findOne(
      { _id: new (await import('mongoose')).Types.ObjectId(parsed.data.userId) },
      { projection: { deletedAt: 1 } }
    )

    if (!user) {
      return sendSuccess(res, { exists: false, isDeleted: false })
    }

    const isDeleted = user.deletedAt !== null && user.deletedAt !== undefined
    sendSuccess(res, { exists: !isDeleted, isDeleted })
  } catch (error: unknown) {
    logger.error('Error verifying user existence:', error)
    sendError(res, 'Failed to verify user', 500)
  }
}

docRouter.post(
  '/verify-user-exists',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  requireSecretKeyOrJwt,
  verifyUserExistsController,
  {
    summary: 'Verify a userId exists (internal S2S)',
    tags: ['Internal'],
    bodySchema,
    responseSchema,
    extraResponses: {
      400: { description: 'Invalid body', schema: errorSchema },
      401: { description: 'Unauthorized', schema: errorSchema },
      403: {
        description: 'Publishable key rejected — secret S2S key required',
        schema: errorSchema,
      },
      500: { description: 'Server error', schema: errorSchema },
    },
  }
)

export { verifyUserExistsRegistry as registry, router }
export default router
