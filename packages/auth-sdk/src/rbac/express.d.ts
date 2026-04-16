/**
 * Type declarations for Express Request with user property
 */

import type { Role } from './types'

declare global {
  namespace Express {
    interface User {
      _id: string
      email: string

      // RBAC - Role-Based Access Control
      globalRoles?: string[] // Cross-app roles (only 'superadmin' allowed)
      appRoles?: Record<string, string[]> // App-specific roles
      permissions?: string[]
      features?: string[]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Express User augmentation requires index signature
      [key: string]: any
    }

    interface Request {
      user?: User
    }
  }
}

export {}
