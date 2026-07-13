/**
 * Express User augmentation for EZAuth
 * Mirrors @ezstart/auth-sdk RBAC express.d.ts
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

    interface Request {
      apiKeyId?: string
      apiKeyUserId?: string
      /**
       * API key permission scope (metadata).
       * Modern values: 'admin' | 'user' | 'readonly'.
       * Legacy values retained for backwards compat: 'test' | 'live'.
       */
      apiKeyScope?: 'admin' | 'user' | 'readonly' | 'test' | 'live'
      apiKeyAppName?: string
      /**
       * Key type derived from prefix — `publishable` (ez_pk_*) or `secret`
       * (ez_sk_*). Absent on legacy `ezk_*` keys. Downstream gates that
       * demand S2S secret auth (e.g. internal PII endpoints) check this.
       */
      apiKeyType?: 'publishable' | 'secret'
    }
  }
}

export {}
