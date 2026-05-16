/**
 * Global Express Request augmentation.
 *
 * Importing anywhere in an app that consumes `@ezstart/api-core` makes
 * `req.userId`, `req.user`, `req.validatedBody`, `req.validatedQuery` and
 * `req.validatedParams` available on the Request type.
 */

/// <reference types="express" />
import 'express'
import type { DerivedMode } from './context/request-context.js'
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
      /**
       * Populated by `attachDerivedMode` — Stripe-pattern test/live mode
       * derived from the API key prefix (`ez_pk_test_*` → `'test'`, etc.).
       * Defaults to `'live'` for cookie-auth dashboard requests.
       */
      derivedMode?: DerivedMode
      /**
       * Populated by the consumer's API-key middleware when the request is
       * authenticated via `X-API-Key` / `Authorization: ApiKey ...`.
       *
       * Holds the Application id referenced by the API key (always the key
       * owner's Application — already validated upstream). Consumed by
       * `createTenantScopeMiddleware({ source: 'apiKey' })` as a pre-trusted
       * tenant id (no further ownership check needed).
       */
      apiKeyApplicationId?: string
      /**
       * Populated by `createTenantScopeMiddleware` after the source field
       * has been resolved AND (when applicable) ownership has been verified
       * against `req.userId`. Always a tenant id the authenticated caller
       * is allowed to act on.
       */
      applicationId?: string
    }
  }
}
