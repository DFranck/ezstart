import { createRouterWithDoc, OpenAPIRegistry, Router, sendError, sendValidationError } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import {
  tokenRequestSchema,
  tokenResponseSchema,
  errorResponseSchema
} from '@ezstart/auth-sdk/server'

export const tokenRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(tokenRegistry, router)

// Exchange code for token
const tokenController = async (req: any, res: any) => {
  try {
    const parsed = tokenRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid token request', parsed.error.issues)
    }

    const token = await AuthService.exchangeCodeForToken(parsed.data)

    // DUAL-MODE: Set httpOnly cookie for apps using httpOnly mode
    res.cookie('ezauth_token', token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined
    })

    res.json({
      success: true,
      ...token
    })
  } catch (error) {
    logger.error('Token exchange error:', error)
    sendError(res, error instanceof Error ? error.message : 'Token exchange failed', 400)
  }
}

docRouter.post('/token', tokenController, {
  summary: 'Exchange authorization code for access token',
  tags: ['Authentication'],
  bodySchema: tokenRequestSchema,
  responseSchema: tokenResponseSchema,
  extraResponses: {
    400: { description: 'Token exchange failed', schema: errorResponseSchema }
  }
})

export default router
