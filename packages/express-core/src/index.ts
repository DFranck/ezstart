// @ezstart/api-core/src/index.ts

// Global Express augmentations (userId, validatedQuery, etc.)
import './types/express-aug.js'

// Controller factory
export { makeCreateController } from './controller-factory/make-create-controller.js'
export { makeDeleteController } from './controller-factory/make-delete-controller.js'
export { makeGetByIdController } from './controller-factory/make-get-by-id-controller.js'
export { makeGetListController } from './controller-factory/make-get-list-controller.js'
export { makeRestoreController } from './controller-factory/make-restore-controller.js'
export { makeUpdateController } from './controller-factory/make-update-controller.js'

// Infra
export { connectToMongo } from './infra/connectToMongo.js'
export { createApp } from './infra/createApp.js'
export { createSocketServer } from './infra/createSocketServer.js'
export { createTickerEngine } from './infra/createTickerEngine.js'
export { startServer } from './infra/startServer.js'

// Express exports for centralization
export { Router } from 'express'
export type { Request, Response, NextFunction, RequestHandler } from 'express'

// Config
export { getApiPort } from './config/ports.js'

// Middlewares
export { validateParams } from './middlewares/validate-params.js'
export { validateQuery } from './middlewares/validate-query.js'
export {
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
  createModerateRateLimiter,
} from './middleware/rateLimit.js'
export type { RateLimitOptions } from './middleware/rateLimit.js'
export { securityHeaders, securityHeadersPresets } from './middleware/security-headers.js'
export type { SecurityHeadersOptions } from './middleware/security-headers.js'
export { createAuthMiddleware, createRoleMiddleware } from './middleware/auth.js'
export { createCsrfMiddleware } from './middleware/csrf.js'

// Versioning
export { createVersionedRouter, addVersionHeader, extractVersionFromPath } from './versioning.js'

// Types & Validation (Zod + OpenAPI)
export { z, mongoIdSchema, listingQuerySchema } from './types/zod.js'
export type { Infer, Input, ListingQuery } from './types/zod.js'
export type { Json, JsonObject, JsonResponse } from './types/json.js'

// OpenAPI helpers (incl. OpenAPIRegistry, createRouterWithDoc, etc.)
export { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
export { checkMissingDescriptions } from './openapi/check-missing-descriptions.js'
export { openApiCompatible } from './openapi/openapi-compatible.js'
export { createRouterWithDoc } from './openapi/route-with-doc.js'
export { stripIncompatible } from './openapi/strip-incompatible.js'
export {
  zObjectWithAutoOpenApi,
  apiSuccessSchema,
  apiErrorSchema,
} from './openapi/z-object-helper.js'

// Helpers
export { sendSuccess, sendError, sendValidationError } from './helpers/api-response.js'
export {
  findById,
  findOne,
  findMany,
  findByIdAndUpdate,
  findOneAndUpdate,
  findByIdAndDelete,
  findOneAndDelete,
  countDocuments,
} from './helpers/mongoose-query.js'

// Utils
export { findWithQuery } from './utils/find-with-query.js'
export { toApiObject } from './utils/to-api-object.js'
