import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

export const logoutRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(logoutRegistry, router)

// Logout (clear httpOnly cookie)
const logoutController = async (req: any, res: any) => {
  // Clear cookie
  res.clearCookie('ezauth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined,
  })

  sendSuccess(res, { message: 'Logged out successfully' })
}

docRouter.post('/logout', logoutController, {
  summary: 'Logout and clear httpOnly cookie',
  tags: ['Authentication'],
  responseSchema: errorResponseSchema, // Using for success response too
  status: 200,
})

export default router
