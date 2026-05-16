/**
 * API versioning primitives.
 *
 * - `createVersionedRouter` — mount a router at both `/basePath` and
 *   `/basePath/<version>` so both URL schemes work in parallel.
 * - `addVersionHeader` — emit `API-Version` / `X-API-Version` on every
 *   response.
 * - `extractVersionFromPath` — populate `req.apiVersion` from the URL
 *   (fallback `'v1'`).
 *
 * Fully agnostic — zero monorepo coupling.
 */

import { Router, type NextFunction, type Request, type Response } from 'express'

/**
 * Build a router that exposes `router` at both `${basePath}` and
 * `${basePath}/${currentVersion}`.
 *
 * ### Double-prefix guard (Wave B Lot 4 — M1, 2026-05-16)
 *
 * Mounting the same `router` at both `${basePath}` and
 * `${basePath}/${currentVersion}` creates a path-aliasing footgun: a request
 * to `${basePath}/${currentVersion}/${currentVersion}/<route>` (e.g.
 * `/api/v1/v1/users`) strips the `${basePath}` prefix and the inner router
 * matches `/v1/<route>` against any route that happens to start with that
 * segment. Two different URLs serve the same endpoint → observability is
 * split, analytics double-count, Sentry groups inconsistently.
 *
 * Mounting an explicit 404 handler at `${basePath}/${currentVersion}` ahead
 * of the inner router rejects the double-prefix call without affecting the
 * legitimate `${basePath}/<route>` and `${basePath}/${currentVersion}/<route>`
 * paths. Single canonical mapping, no security boundary moved.
 *
 * @example
 * ```ts
 * import { Router } from 'express'
 * import { createVersionedRouter } from '@ezstart/api-core'
 *
 * const api = Router()
 * api.get('/users', listUsers)
 *
 * // Accessible at /api/users AND /api/v1/users — but NOT /api/v1/v1/users.
 * app.use(createVersionedRouter('/api', api))
 * ```
 */
export function createVersionedRouter(
  basePath: string,
  router: Router,
  currentVersion = 'v1'
): Router {
  const versionedRouter = Router()
  // Block the double-prefix alias FIRST so it can never reach the inner
  // router via the `${basePath}` mount below. Express evaluates middleware
  // in registration order — this 404 fires before the `${basePath}` router
  // gets to strip its prefix and re-match.
  const doublePrefixGuard = `${basePath}/${currentVersion}/${currentVersion}`
  versionedRouter.use(doublePrefixGuard, (_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Not Found', code: 'NOT_FOUND' },
    })
  })
  versionedRouter.use(basePath, router)
  versionedRouter.use(`${basePath}/${currentVersion}`, router)
  return versionedRouter
}

/**
 * Middleware that tags every response with the current API version.
 *
 * @example
 * ```ts
 * app.use(addVersionHeader('v1'))
 * ```
 */
export function addVersionHeader(version = 'v1') {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('API-Version', version)
    res.setHeader('X-API-Version', version)
    next()
  }
}

/**
 * Middleware that parses the version segment out of the URL and stores it on
 * `req.apiVersion`. Defaults to `'v1'` when no segment is present.
 *
 * @example
 * ```ts
 * app.use(extractVersionFromPath())
 * app.get('/api/:rest*', (req, res) => res.json({ v: req.apiVersion }))
 * ```
 */
export function extractVersionFromPath() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const match = req.path.match(/\/v(\d+)\//)
    const apiVersion = match ? `v${match[1]}` : 'v1'
    ;(req as Request & { apiVersion: string }).apiVersion = apiVersion
    next()
  }
}
