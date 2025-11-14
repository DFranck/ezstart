/**
 * Type declarations for Express Request with user property
 */

import type { Role } from './types'

declare global {
  namespace Express {
    interface User {
      _id: string
      email: string
      roles: Role[]
      [key: string]: any
    }

    interface Request {
      user?: User
    }
  }
}

export {}
