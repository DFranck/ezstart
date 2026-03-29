import { createAuthMiddleware } from '@ezstart/express-core'

export const { authMiddleware, optionalAuthMiddleware } = createAuthMiddleware()
