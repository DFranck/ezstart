// @ezstart/api-core/src/index.ts
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

// Middlewares
export { validateParams } from './middlewares/validate-params.js'
export { validateQuery } from './middlewares/validate-query.js'

// OpenAPI helpers (incl. OpenAPIRegistry, z, createRouterWithDoc, etc.)
export { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
export { z } from '@ezstart/types'
export { checkMissingDescriptions } from './openapi/check-missing-descriptions.js'
export { openApiCompatible } from './openapi/openapi-compatible.js'
export { createRouterWithDoc } from './openapi/route-with-doc.js'
export { stripIncompatible } from './openapi/strip-incompatible.js'
export { zObjectWithAutoOpenApi } from './openapi/z-object-helper.js'

// Utils
export { findWithQuery } from './utils/find-with-query.js'
export { toApiObject } from './utils/to-api-object.js'
