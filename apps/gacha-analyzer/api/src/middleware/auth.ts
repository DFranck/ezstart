import { createEzstartAuth, type RequestHandler } from '@ezstart/api-core'

const auth = createEzstartAuth()
export const authMiddleware: RequestHandler = auth.authMiddleware
export const optionalAuthMiddleware: RequestHandler = auth.optionalAuthMiddleware
