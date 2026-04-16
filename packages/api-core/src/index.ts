/**
 * @ezstart/api-core
 *
 * Unified Express-based API server framework.
 *
 * Agnostic primitives live under `./core/*` — zero `@ezstart/*` coupling,
 * publishable on npm as-is. The monorepo wrapper (`createEzstartServer`) is
 * a thin convenience layer that wires `@ezstart/config` + `@ezstart/logger`.
 */

// Global Express augmentation (req.userId, req.user, req.validated*)
import './core/express-aug.js'

// ---------------------------------------------------------------------------
// Agnostic core — factories
// ---------------------------------------------------------------------------
export { createApiServer } from './core/create-server.js'
export { startServer, type StartServerOptions } from './core/server.js'

// Response helpers
export {
  sendError,
  sendSuccess,
  sendValidationError,
  type SendErrorOptions,
} from './core/responses.js'

// Middlewares
export { createCorsMiddleware } from './core/middleware/cors.js'
export {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
  type RateLimitOptions,
} from './core/middleware/rate-limit.js'
export {
  createAuthMiddleware,
  type AuthMiddlewareConfig,
  type AuthMiddlewares,
} from './core/middleware/auth.js'
export { validateBody, validateParams, validateQuery } from './core/middleware/validate.js'

// OpenAPI-aware router
export {
  createDocRouter,
  type DocMethod,
  type DocRouter,
  type RouteDocOptions,
} from './core/router.js'

// OpenAPI helpers
export {
  checkMissingDescriptions,
  scanRegistriesForMissingDescriptions,
} from './core/openapi/check-missing-descriptions.js'

// API versioning
export {
  addVersionHeader,
  createVersionedRouter,
  extractVersionFromPath,
} from './core/versioning.js'

// Re-exports from transitive deps — the monorepo centralizes on these
// symbols so consumers don't need direct dependencies on `express` or
// `@asteasolutions/zod-to-openapi`.
export { Router } from 'express'
export type { Express, NextFunction, Request, RequestHandler, Response } from 'express'
export { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'

// Core types
export type {
  ApiMeta,
  ApiServer,
  AuthenticatedUser,
  CorsConfig,
  RateLimitPreset,
  ServerConfig,
  ServerLogger,
  TokenVerifier,
} from './core/types.js'

// DB connector contract (abstract — consumers inject their impl).
export type { DbConnector } from './core/db-connector.js'

// Optional Socket.IO helper (dynamic import — truly optional).
export { createSocketServer, type SocketServerConfig } from './core/sockets.js'

// ---------------------------------------------------------------------------
// @ezstart monorepo wrapper (optional — requires @ezstart/config + @ezstart/logger)
// ---------------------------------------------------------------------------
export { createEzstartServer, type EzstartServerOptions } from './ezstart-server.js'
export { connectToMongo } from './connect-to-mongo.js'
