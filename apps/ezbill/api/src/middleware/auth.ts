import { createApiAuth, type RequestHandler } from '@ezstart/api-core'

const auth = createApiAuth()
export const authMiddleware: RequestHandler = auth.authMiddleware
export const optionalAuthMiddleware: RequestHandler = auth.optionalAuthMiddleware
