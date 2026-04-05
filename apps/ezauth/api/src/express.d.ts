/**
 * Express User augmentation for EZAuth
 * Mirrors @ezstart/rbac express.d.ts
 */

declare global {
  namespace Express {
    interface User {
      _id: string
      email: string
      globalRoles?: string[]
      appRoles?: Record<string, string[]>
      permissions?: string[]
      features?: string[]
      apps?: string[]
      [key: string]: string | string[] | boolean | Record<string, string[]> | undefined
    }
  }
}

export {}
