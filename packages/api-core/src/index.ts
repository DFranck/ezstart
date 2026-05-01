/**
 * @ezstart/api-core
 *
 * Unified Express-based API server framework.
 *
 * Agnostic primitives live under `./core/*` — zero `@ezstart/*` coupling,
 * publishable on npm as-is. The monorepo wrapper (`createApiServer`) is
 * a thin convenience layer that wires `@ezstart/config` + `@ezstart/logger`.
 */

// Global Express augmentation (req.userId, req.user, req.validated*)
import './core/express-aug.js'

// ---------------------------------------------------------------------------
// Agnostic core — factories
// ---------------------------------------------------------------------------
//
// `createBaseApiServer` is the low-level agnostic primitive (publishable as-is,
// zero `@ezstart/*` coupling). Most monorepo consumers should use the
// higher-level `createApiServer(appName, options)` wrapper exported below
// from `./create-api-server.js`, which pre-wires `@ezstart/config` and
// `@ezstart/logger`.
//
// NOTE: prior to v0.x.0 the wrapper was named `createEzstartServer` and the
// agnostic primitive was named `createApiServer`. Both old names are still
// re-exported below as deprecated aliases. See CHANGELOG for migration.
export { createBaseApiServer } from './core/create-server.js'
export { startServer, type StartServerOptions } from './core/server.js'

// Response helpers
export {
  sendError,
  sendSuccess,
  sendValidationError,
  type SendErrorOptions,
} from './core/responses.js'

// Health checks (`/health/deep` readiness probe)
export {
  aggregateStatus,
  createDbHealthCheck,
  createDeepHealthHandler,
  runHealthCheck,
  type DeepHealthHandlerConfig,
  type DeepHealthSnapshot,
  type HealthCheck,
  type HealthCheckResult,
  type HealthCheckStatus,
} from './core/health.js'

// Middlewares
export {
  createCorsMiddleware,
  createPermissiveCorsMiddleware,
  createStrictCorsMiddleware,
  type PermissiveCorsOptions,
  type StrictCorsEntry,
  type StrictCorsOptions,
} from './core/middleware/cors.js'
export {
  createIdempotencyMiddleware,
  createInMemoryIdempotencyStore,
  type IdempotencyMiddlewareConfig,
  type IdempotencyRecord,
  type IdempotencyStore,
  type InMemoryStoreConfig,
} from './core/middleware/idempotency.js'
export {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
  type RateLimitOptions,
} from './core/middleware/rate-limit.js'
export {
  createKeyHashRateLimiter,
  type KeyHashRateLimiter,
  type KeyHashRateLimiterOptions,
} from './core/middleware/key-hash-rate-limit.js'
export {
  createAuthMiddleware,
  createRoleMiddleware,
  type AuthMiddlewareConfig,
  type AuthMiddlewares,
} from './core/middleware/auth.js'
export {
  createUnifiedAuthMiddleware,
  type UnifiedApiKeyResult,
  type UnifiedAuthConfig,
  type UnifiedAuthScope,
  type UnifiedJwtResult,
} from './core/middleware/unified-auth.js'
export { createCsrfMiddleware } from './core/middleware/csrf.js'
export {
  attachDerivedMode,
  resolveDerivedMode,
  withRequestContextMiddleware,
} from './core/middleware/derive-mode.js'
export { attachDerivedScope, type DerivedScope } from './core/middleware/derive-scope.js'
export {
  testModeScopePlugin,
  type TestModeScopeOptions,
} from './core/middleware/test-mode-scope.js'
export {
  createErrorHandler,
  type ErrorHandlerConfig,
  type ErrorPersistCallback,
} from './core/middleware/error-handler.js'
export { validateBody, validateParams, validateQuery } from './core/middleware/validate.js'

// Request-scoped context (AsyncLocalStorage)
export {
  getRequestContext,
  withRequestContext,
  type DerivedMode,
  type RequestContext,
} from './core/context/request-context.js'

// OpenAPI-aware router
export {
  createDocRouter,
  type DocMethod,
  type DocRouter,
  type RouteDocOptions,
} from './core/router.js'

// Backward compat alias
export { createDocRouter as createRouterWithDoc } from './core/router.js'

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

// Cryptographic primitives — base64url + HMAC + EZStart-Signature protocol.
// See `./core/crypto.ts` for the full rationale (single source of truth for
// the S2S webhook header `X-EZStart-Signature: t=<unix>,v1=<hex>`).
export {
  base64urlDecode,
  base64urlEncode,
  buildEzstartSignatureHeader,
  EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS,
  hmacSign,
  hmacVerify,
  parseEzstartSignatureHeader,
  verifyEzstartSignature,
  type EzstartSignatureHeader,
  type EzstartSignatureVerifyResult,
  type HmacEncoding,
} from './core/crypto.js'

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
  CookieAuthAllowlistEntry,
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
//
// `createApiServer(appName, options)` is the recommended factory for any
// monorepo consumer. It wires `@ezstart/config` (port + first-party CORS
// origins) and `@ezstart/logger` automatically. For agnostic usage outside
// the monorepo, drop down to `createBaseApiServer(config)` exported above.
export {
  createApiAuth,
  createApiServer,
  createEzstartAuth,
  createEzstartServer,
  type ApiServerOptions,
  type EzstartServerOptions,
} from './create-api-server.js'
export { connectToMongo } from './connect-to-mongo.js'

// Unified API boot ceremony — shrinks app `index.ts` files to a thin
// descriptor (slug + routes + per-app warmup). Optional opt-in.
export {
  bootApi,
  type BootApiOptions,
  type BootApiResult,
  type BootServerConfig,
  type OnReadyHook,
} from './boot-api.js'

// ---------------------------------------------------------------------------
// Observability — Sentry init + manual capture (no-op when DSN empty)
// ---------------------------------------------------------------------------
//
// Uses `@sentry/node-core` with ZERO auto-integrations to avoid the
// 2026-04-25 incident (OTEL HTTP/Express auto-instrumentation broke CORS on
// Railway). We capture manually from `createErrorHandler` — see
// `core/middleware/error-handler.ts`.
export { captureException, initSentry, type InitSentryOptions } from './observability/index.js'
