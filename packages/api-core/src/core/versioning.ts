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
 * @example
 * ```ts
 * import { Router } from 'express'
 * import { createVersionedRouter } from '@ezstart/api-core'
 *
 * const api = Router()
 * api.get('/users', listUsers)
 *
 * // Accessible at /api/users AND /api/v1/users
 * app.use(createVersionedRouter('/api', api))
 * ```
 */
export function createVersionedRouter(
  basePath: string,
  router: Router,
  currentVersion = 'v1'
): Router {
  const versionedRouter = Router()
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
