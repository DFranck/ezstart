/// <reference types="express" />

import 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      user?: {
        _id?: string
        userId: string
        email?: string
        username?: string
        apps?: string[]
        globalRoles?: string[]
        appRoles?: Record<string, string[]>
        permissions?: string[]
        features?: string[]
        [key: string]: unknown
      }
      validatedQuery?: unknown
      validatedBody?: unknown
      validatedParams?: unknown
    }
  }
}
