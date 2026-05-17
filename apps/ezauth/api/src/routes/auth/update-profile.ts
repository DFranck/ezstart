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
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { userResponseSchema, errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { isValidAvatarUrl, MAX_AVATAR_URL_LENGTH } from '../../utils/avatar.js'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'
import { requireEmailVerified } from '../../middleware/require-email-verified.js'

export const updateProfileRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateProfileRegistry, router)

const updateProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional().describe('First name'),
  lastName: z.string().trim().max(100).optional().describe('Last name'),
  avatar: z
    .string()
    .max(MAX_AVATAR_URL_LENGTH)
    .refine(isValidAvatarUrl, 'Invalid avatar URL — must be https:// or data:image/(png|jpeg|webp)')
    .optional()
    .describe('Avatar URL (https://…) or base64 data URI (image/png|jpeg|webp, ≤100KB)'),
})

const updateProfileController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const parsed = updateProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid profile data', parsed.error.issues)
    }

    const { firstName, lastName, avatar } = parsed.data

    // Build update object with only provided fields
    const update: Record<string, unknown> = {}
    if (firstName !== undefined) update.firstName = firstName
    if (lastName !== undefined) update.lastName = lastName
    if (avatar !== undefined) update.avatar = avatar

    if (Object.keys(update).length === 0) {
      return sendError(res, 'No fields to update', 400)
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findByIdAndUpdate(userId, { $set: update }, { new: true })

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    sendSuccess(res, { user: user.toAuthUser() })
  } catch (error) {
    logger.error('Update profile error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to update profile', 500)
  }
}

docRouter.put(
  '/profile',
  verifyCookieCsrf,
  authMiddleware,
  // HAC-HIGH-2 (2026-05-17) — anti identity-squatting: an unverified
  // account must not be able to set firstName/lastName/avatar (the
  // squatter would otherwise build a "real-looking" profile on top of a
  // stolen email address). Cf. `standard-saas-security.md` §2.
  requireEmailVerified,
  updateProfileController,
  {
    summary: 'Update own profile (firstName, lastName, avatar)',
    tags: ['User'],
    bodySchema: updateProfileSchema,
    responseSchema: userResponseSchema,
    extraResponses: {
      400: { description: 'No fields to update', schema: errorResponseSchema },
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: {
        description: 'Email not verified — `code: EMAIL_VERIFICATION_REQUIRED`',
        schema: errorResponseSchema,
      },
      404: { description: 'User not found', schema: errorResponseSchema },
    },
  }
)

export default router
