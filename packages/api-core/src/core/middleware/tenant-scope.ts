/**
 * Tenant-scope middleware factory.
 *
 * Resolves the target `applicationId` for the current request from a
 * configured source (API key, request body, or URL param) and — when the
 * source is caller-supplied — verifies that the authenticated user OWNS
 * the Application before letting the handler run.
 *
 * Why this exists: per-Application multi-tenancy SaaS routes routinely
 * accept an `applicationId` from the request body (e.g. `POST /subscribe`
 * with `{ applicationId, planId, ... }`). Without an ownership check, any
 * authenticated user can submit ANY victim's `applicationId` and get
 * grants / subscriptions / Connect fees routed to the victim's tenant —
 * see `audit-pay-sdk-hacker.md` finding C-3 ("free Pro tier" exploit
 * chain).
 *
 * This middleware is the foundation primitive. It is agnostic of Mongoose
 * (and of every storage backend): the caller injects an
 * `applicationLoader` function that returns the minimal
 * `{ id, ownerId, appName? }` shape.
 *
 * On success the middleware sets `req.applicationId` to the resolved,
 * verified tenant id and calls `next()`. Failures emit a structured
 * `{ success: false, error: { code, message } }` envelope via
 * `sendError`.
 *
 * @module @ezstart/api-core/middleware/tenant-scope
 */

import { ErrorCode } from '@ezstart/api-contracts'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { sendError } from '../responses.js'

/**
 * Minimal Application shape returned by an `applicationLoader`.
 *
 * The middleware never looks at fields beyond `id` / `ownerId` — the
 * `appName` slot is purely informational (logger context). The caller is
 * free to use any backing store (Mongoose, Prisma, in-memory, REST), as
 * long as the loader returns this shape.
 */
export interface TenantApplicationShape {
  /** Application id as stored / displayed (typically a Mongo ObjectId stringified, but any opaque token works). */
  id: string
  /** Id of the user that OWNS this Application — compared against `req.userId`. */
  ownerId: string
  /** Optional slug / display name — included in `logger.warn` context on denied access. */
  appName?: string | undefined
}

/**
 * Resolve an Application by id.
 *
 * - Returns the minimal `{ id, ownerId, appName? }` shape on hit.
 * - Returns `null` when no Application matches the id (middleware emits
 *   `404 + APPLICATION_NOT_FOUND`).
 * - Throws are caught and converted to `500 + INTERNAL_ERROR`.
 *
 * Loaders should be lean (`select('_id ownerId slug').lean()` with
 * Mongoose) — only those three fields are read.
 */
export type TenantApplicationLoader = (id: string) => Promise<TenantApplicationShape | null>

/**
 * Minimal logger contract the middleware uses to surface denied-access
 * events. Matches the rest of `@ezstart/api-core` — zero coupling to a
 * concrete logger.
 */
export interface TenantScopeLogger {
  warn: (msg: string, ctx?: object) => void
}

/**
 * Configuration accepted by `createTenantScopeMiddleware`.
 *
 * The `source` discriminates how `applicationId` is resolved. The other
 * options shape the verification policy (ownership check, superadmin
 * bypass, loader injection, logger).
 */
export interface TenantScopeOptions {
  /**
   * Where to read `applicationId` from:
   *
   * - `'apiKey'` — use `req.apiKeyApplicationId` (already validated by
   *   the upstream API-key auth middleware — no further ownership check,
   *   no `applicationLoader` call).
   * - `'body'` — read `req.body[bodyField ?? 'applicationId']`.
   * - `'param'` — read `req.params[paramName ?? 'applicationId']`.
   */
  source: 'apiKey' | 'body' | 'param'

  /** Custom body field name. Default `'applicationId'`. */
  bodyField?: string
  /** Custom URL param name. Default `'applicationId'`. */
  paramName?: string

  /**
   * When the source is `'body'` or `'param'`, verify the authenticated
   * user owns the Application (compare `application.ownerId` against
   * `req.userId`). Ignored for `'apiKey'` (pre-validated upstream).
   *
   * Default `true`. Set to `false` only when the route is intentionally
   * public-scoped (e.g. a public GET that needs to know the Application
   * for routing but does not mutate per-owner data).
   */
  verifyOwnership?: boolean

  /**
   * Allow `req.user.globalRoles.includes('superadmin')` to bypass the
   * ownership check. Default `true` — matches the platform-wide
   * superadmin pattern in `createRoleMiddleware`.
   */
  allowSuperadmin?: boolean

  /**
   * Loader that fetches an Application by id. REQUIRED for `'body'` /
   * `'param'` sources (even with `verifyOwnership: false`, the loader
   * proves the Application exists → 404 otherwise). OPTIONAL for
   * `'apiKey'` — the upstream key middleware already validated existence.
   *
   * Throws a config error at middleware creation if the source needs a
   * loader and none was provided.
   */
  applicationLoader?: TenantApplicationLoader

  /**
   * Optional logger. When provided, denied-access events (403) are
   * surfaced with `{ applicationId, userId, ownerId, appName? }` context.
   * Default: no-op (silent).
   */
  logger?: TenantScopeLogger
}

const SUPERADMIN_ROLE = 'superadmin'

function isSuperadmin(req: Request): boolean {
  const roles = req.user?.globalRoles
  return Array.isArray(roles) && roles.includes(SUPERADMIN_ROLE)
}

function readApplicationIdFromSource(
  req: Request,
  source: TenantScopeOptions['source'],
  bodyField: string,
  paramName: string
): string | null {
  if (source === 'apiKey') {
    const value = req.apiKeyApplicationId
    return typeof value === 'string' && value.length > 0 ? value : null
  }
  if (source === 'body') {
    const body = req.body as Record<string, unknown> | undefined
    const value = body?.[bodyField]
    return typeof value === 'string' && value.length > 0 ? value : null
  }
  // source === 'param'
  const value = req.params[paramName]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Build a tenant-scope middleware bound to the supplied policy.
 *
 * @example
 * ```ts
 * import { createTenantScopeMiddleware } from '@ezstart/api-core'
 * import { getApplicationModel } from './models/application.js'
 *
 * const tenantScope = createTenantScopeMiddleware({
 *   source: 'body',
 *   verifyOwnership: true,
 *   applicationLoader: async id => {
 *     const Application = await getApplicationModel()
 *     const app = await Application.findById(id).select('_id ownerId slug').lean()
 *     return app
 *       ? { id: String(app._id), ownerId: String(app.ownerId), appName: app.slug }
 *       : null
 *   },
 *   logger,
 * })
 *
 * router.post('/api/subscribe', requireAuth, tenantScope, subscribeHandler)
 * // Inside subscribeHandler: req.applicationId is guaranteed to be a tenant
 * // id the authenticated user is allowed to act on.
 * ```
 */
export function createTenantScopeMiddleware(options: TenantScopeOptions): RequestHandler {
  const source = options.source
  const bodyField = options.bodyField ?? 'applicationId'
  const paramName = options.paramName ?? 'applicationId'
  const verifyOwnership = options.verifyOwnership ?? true
  const allowSuperadmin = options.allowSuperadmin ?? true
  const loader = options.applicationLoader
  const logger = options.logger

  // Fail-fast config validation: body/param sources MUST receive a loader.
  // For apiKey source the loader is optional (id is pre-trusted).
  if (source !== 'apiKey' && !loader) {
    throw new Error(
      `[createTenantScopeMiddleware] source='${source}' requires an applicationLoader (set verifyOwnership=false if you only need existence check, but a loader is still required to prove the Application exists).`
    )
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    void runTenantScope(req, res, next, {
      source,
      bodyField,
      paramName,
      verifyOwnership,
      allowSuperadmin,
      loader,
      logger,
    })
  }
}

interface ResolvedConfig {
  source: TenantScopeOptions['source']
  bodyField: string
  paramName: string
  verifyOwnership: boolean
  allowSuperadmin: boolean
  loader: TenantApplicationLoader | undefined
  logger: TenantScopeLogger | undefined
}

async function runTenantScope(
  req: Request,
  res: Response,
  next: NextFunction,
  cfg: ResolvedConfig
): Promise<void> {
  // 1. Read the source field.
  const applicationId = readApplicationIdFromSource(req, cfg.source, cfg.bodyField, cfg.paramName)
  if (!applicationId) {
    sendError(res, 'applicationId is required', 400, {
      code: ErrorCode.APPLICATION_NOT_FOUND,
    })
    return
  }

  // 2. apiKey source — already validated upstream, skip loader + ownership.
  if (cfg.source === 'apiKey') {
    req.applicationId = applicationId
    next()
    return
  }

  // 3. body / param source — loader is guaranteed by config validation.
  const loader = cfg.loader
  // istanbul ignore next — invariant guaranteed by createTenantScopeMiddleware
  if (!loader) {
    sendError(res, 'Tenant scope misconfigured', 500, { code: ErrorCode.INTERNAL_ERROR })
    return
  }

  let application: TenantApplicationShape | null
  try {
    application = await loader(applicationId)
  } catch {
    sendError(res, 'Failed to resolve Application', 500, { code: ErrorCode.INTERNAL_ERROR })
    return
  }

  if (!application) {
    sendError(res, 'Application not found', 404, {
      code: ErrorCode.APPLICATION_NOT_FOUND,
    })
    return
  }

  // 4. Ownership check (when enabled).
  if (cfg.verifyOwnership) {
    const userId = req.userId
    const superadminBypass = cfg.allowSuperadmin && isSuperadmin(req)

    if (!superadminBypass) {
      if (!userId || application.ownerId !== userId) {
        cfg.logger?.warn('Tenant scope denied', {
          applicationId: application.id,
          userId,
          ownerId: application.ownerId,
          appName: application.appName,
        })
        sendError(res, 'You do not have access to this Application', 403, {
          code: ErrorCode.APPLICATION_ACCESS_DENIED,
        })
        return
      }
    }
  }

  // 5. Hydrate request and continue.
  req.applicationId = application.id
  next()
}
