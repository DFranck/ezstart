/**
 * Express User augmentation for EZAuth
 * Mirrors @ezstart/rbac express.d.ts
 */

declare global {
  namespace Express {
    interface User {
      _id: string
      email: string
      roles?: string[]
      globalRoles?: string[]
      appRoles?: Record<string, string[]>
      permissions?: string[]
      features?: string[]
      apps?: string[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Express User augmentation requires index signature
      [key: string]: any
    }
  }
}

export {}
