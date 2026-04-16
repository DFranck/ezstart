import createRouter, { createApiKeyRegistry } from './create.js'
import listRouter, { listApiKeysRegistry } from './list.js'
import revokeRouter, { revokeApiKeyRegistry } from './revoke.js'
import rotateRouter, { rotateApiKeyRegistry } from './rotate.js'
import usageRouter, { usageApiKeyRegistry } from './usage.js'

export const apiKeyRegistries = [
  createApiKeyRegistry,
  listApiKeysRegistry,
  revokeApiKeyRegistry,
  rotateApiKeyRegistry,
  usageApiKeyRegistry,
]

export const apiKeyRouters = [createRouter, listRouter, revokeRouter, rotateRouter, usageRouter]
