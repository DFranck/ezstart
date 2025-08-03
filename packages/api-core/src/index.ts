// @ezstart/api-core/src/index.ts
// Controller factory
export { makeCreateController } from './controller-factory/make-create-controller'
export { makeDeleteController } from './controller-factory/make-delete-controller'
export { makeGetByIdController } from './controller-factory/make-get-by-id-controller'
export { makeGetListController } from './controller-factory/make-get-list-controller'
export { makeRestoreController } from './controller-factory/make-restore-controller'
export { makeUpdateController } from './controller-factory/make-update-controller'

// Infra
export { connectToMongo } from './infra/connectToMongo'
export { createApp } from './infra/createApp'
export { createSocketServer } from './infra/createSocketServer'
export { createTickerEngine } from './infra/createTickerEngine'
export { startServer } from './infra/startServer'

// Middlewares
export { validateParams } from './middlewares/validate-params'
export { validateQuery } from './middlewares/validate-query'

// OpenAPI helpers (incl. OpenAPIRegistry, z, createRouterWithDoc, etc.)
export { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
export { z } from '@ezstart/types/zod-extended'
export { checkMissingDescriptions } from './openapi/check-missing-descriptions'
export { openApiCompatible } from './openapi/openapi-compatible'
export { createRouterWithDoc } from './openapi/route-with-doc'
export { stripIncompatible } from './openapi/strip-incompatible'
export { zObjectWithAutoOpenApi } from './openapi/z-object-helper'

// Utils
export { findWithQuery } from './utils/find-with-query'
export { toApiObject } from './utils/to-api-object'
