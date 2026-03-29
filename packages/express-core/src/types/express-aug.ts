/// <reference types="express" />

import 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      validatedQuery?: unknown
      validatedBody?: unknown
      validatedParams?: unknown
    }
  }
}
