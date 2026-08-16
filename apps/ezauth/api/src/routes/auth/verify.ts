import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createRateLimiter,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { updatePresenceByUserId } from '../../services/presence.service.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import {
  verifyRequestSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'

export const verifyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyRegistry, router)

// Per-endpoint rate limiter — /verify is called frequently by clients so we use
// the standard 100 req/15min bucket rather than the strict auth limiter.
const verifyRateLimiter = createRateLimiter()

// Verify token validity
const verifyController = async (req: Request, res: Response) => {
  try {
    const parsed = verifyRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid verify request', parsed.error.issues)
    }

    const { token, app } = parsed.data
    const payload = await AuthService.verifyToken(token)

    // Soft-delete gate — a still-unexpired access token (15 min TTL) MUST
    // not validate against an account that was scheduled for deletion.
    // Without this lookup the JWT signature alone keeps the session usable
    // until natural expiry, even after the cookies are cleared and the
    // refresh tokens revoked. (P0 — see standard-saas-security.md §3.)
    //
    // `includeDeleted: true` opts out of the AuthUser pre-find guard so we
    // can distinguish "user never existed" from "account is soft-deleted"
    // and return a more precise error message. The model-level guard would
    // collapse both branches to a generic 'User not found' response.
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne(
      { _id: payload.userId },
      { deletedAt: 1 },
      { includeDeleted: true }
    ).lean()
    if (!user) {
      return sendError(res, 'User not found', 401)
    }
    if (user.deletedAt) {
      return sendError(res, 'Account has been deleted', 401)
    }

    // Check app access if specified
    if (app) {
      const hasAccess = await AuthService.checkAppAccess(payload.userId, app)
      if (!hasAccess) {
        return sendError(res, `No access to app: ${app}`, 403)
      }
    }

    // Fire-and-forget presence update (throttled, non-blocking)
    updatePresenceByUserId(payload.userId)

    sendSuccess(res, {
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
        apps: payload.apps,
        exp: payload.exp,
      },
    })
  } catch {
    // MED-1 — never echo a raw error.message. `verifyToken` already throws the
    // intentional 'Invalid token' message and any other (unexpected) error must
    // collapse to the same stable 401 so internal detail never leaks.
    sendError(res, 'Invalid token', 401)
  }
}

docRouter.post('/verify', verifyRateLimiter, verifyController, {
  summary: 'Verify token validity',
  tags: ['Authentication'],
  bodySchema: verifyRequestSchema,
  responseSchema: verifyResponseSchema,
  extraResponses: {
    401: { description: 'Invalid token', schema: errorResponseSchema },
    403: { description: 'No app access', schema: errorResponseSchema },
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
