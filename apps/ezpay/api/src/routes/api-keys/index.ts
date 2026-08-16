/**
 * Barrel for EZPay API-key routes.
 *
 * Aggregates routers + OpenAPI registries so the parent `routes/index.ts`
 * can mount them under `/keys` with a single pair of iterables.
 *
 * @module apps/ezpay/api/src/routes/api-keys/index
 */

import configRouter, { configApiKeyRegistry } from './config.js'
import createRouter, { createApiKeyRegistry } from './create.js'
import listRouter, { listApiKeysRegistry } from './list.js'
import revokeRouter, { revokeApiKeyRegistry } from './revoke.js'
import rotateRouter, { rotateApiKeyRegistry } from './rotate.js'
import usageRouter, { usageApiKeyRegistry } from './usage.js'

export const apiKeyRegistries = [
  configApiKeyRegistry,
  createApiKeyRegistry,
  listApiKeysRegistry,
  revokeApiKeyRegistry,
  rotateApiKeyRegistry,
  usageApiKeyRegistry,
]

export const apiKeyRouters = [
  configRouter,
  createRouter,
  listRouter,
  revokeRouter,
  rotateRouter,
  usageRouter,
]
