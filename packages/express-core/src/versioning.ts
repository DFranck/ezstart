import { Router, type Request, type Response, type NextFunction } from 'express'

/**
 * API Versioning Middleware
 *
 * Provides backward-compatible API versioning support.
 * Routes can be accessed via both /api/resource and /api/v1/resource
 *
 * @example
 * ```typescript
 * import { createVersionedRouter } from '@ezstart/express-core'
 *
 * const router = Router()
 * router.get('/users', getUsers)
 *
 * // Supports both /api/users and /api/v1/users
 * app.use(createVersionedRouter('/api', router))
 * ```
 */
export function createVersionedRouter(basePath: string, router: Router, currentVersion: string = 'v1'): Router {
  const versionedRouter = Router()

  // Register routes for both versioned and non-versioned paths
  // /api/resource (backward compatible)
  versionedRouter.use(basePath, router)

  // /api/v1/resource (versioned)
  versionedRouter.use(`${basePath}/${currentVersion}`, router)

  return versionedRouter
}

/**
 * API Version Header Middleware
 *
 * Adds API-Version header to all responses for version tracking
 *
 * @param version - Current API version (default: 'v1')
 */
export function addVersionHeader(version: string = 'v1') {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('API-Version', version)
    res.setHeader('X-API-Version', version) // Alternative header
    next()
  }
}

/**
 * Version from path middleware
 *
 * Extracts version from path and adds to req object
 * Path format: /api/v1/resource or /api/v2/resource
 */
export function extractVersionFromPath() {
  return (req: Request, res: Response, next: NextFunction) => {
    const versionMatch = req.path.match(/\/v(\d+)\//)
    if (versionMatch) {
      ;(req as any).apiVersion = `v${versionMatch[1]}`
    } else {
      ;(req as any).apiVersion = 'v1' // Default version
    }
    next()
  }
}
