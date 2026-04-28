/**
 * Global Express Request augmentation.
 *
 * Importing anywhere in an app that consumes `@ezstart/api-core` makes
 * `req.userId`, `req.user`, `req.validatedBody`, `req.validatedQuery` and
 * `req.validatedParams` available on the Request type.
 */

/// <reference types="express" />
import 'express'
import type { DerivedScope } from './middleware/derive-scope.js'
import type { AuthenticatedUser } from './types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `createAuthMiddleware().requireAuth`. */
      userId?: string
      /** Populated by `createAuthMiddleware().requireAuth` when the verifier returns a payload. */
      user?: AuthenticatedUser
      /** Populated by `validateBody(schema)`. */
      validatedBody?: unknown
      /** Populated by `validateQuery(schema)`. */
      validatedQuery?: unknown
      /** Populated by `validateParams(schema)`. */
      validatedParams?: unknown
      /** Populated by `attachDerivedScope` — RBAC audience scope derived from `req.user`. */
      derivedScope?: DerivedScope
    }
  }
}
