import { createRouterWithDoc, OpenAPIRegistry, Router, sendError, sendValidationError } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import {
  verifyRequestSchema,
  verifyResponseSchema,
  errorResponseSchema
} from '@ezstart/auth-sdk/server'

export const verifyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyRegistry, router)

// Verify token validity
const verifyController = async (req: any, res: any) => {
  try {
    const parsed = verifyRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid verify request', parsed.error.issues)
    }

    const { token, app } = parsed.data
    const payload = await AuthService.verifyToken(token)

    // Check app access if specified
    if (app) {
      const hasAccess = await AuthService.checkAppAccess(payload.userId, app)
      if (!hasAccess) {
        return sendError(res, `No access to app: ${app}`, 403)
      }
    }

    res.json({
      success: true,
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
        apps: payload.apps,
        exp: payload.exp
      }
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    })
  }
}

docRouter.post('/verify', verifyController, {
  summary: 'Verify token validity',
  tags: ['Authentication'],
  bodySchema: verifyRequestSchema,
  responseSchema: verifyResponseSchema,
  extraResponses: {
    401: { description: 'Invalid token', schema: errorResponseSchema },
    403: { description: 'No app access', schema: errorResponseSchema }
  }
})

export default router
