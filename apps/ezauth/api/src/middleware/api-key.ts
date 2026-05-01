/**
 * Middleware to authenticate requests using API keys.
 *
 * Thin wrapper around `createApiKeyMiddleware` from
 * `@ezstart/auth-sdk/server` — the canonical implementation lives in the
 * SDK so ezauth, ezpay, and any future API share identical header parsing,
 * hash lookup, expiry / revocation handling, monthly quota enforcement,
 * and fire-and-forget bookkeeping (no per-app duplication).
 *
 * Checks `X-API-Key` header or `Authorization: ApiKey <key>`. On success
 * stamps `req.apiKeyId`, `req.apiKeyUserId`, `req.apiKeyScope`, and
 * `req.apiKeyAppName` so downstream middleware (`attachDerivedScope`,
 * audit-log writers, ...) keep working unchanged.
 *
 * @module apps/ezauth/api/src/middleware/api-key
 */

import { createApiKeyMiddleware } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { getApiKeyModel } from '../models/api-key.js'
import { getApiKeyUsageModel } from '../models/api-key-usage.js'

const middleware = createApiKeyMiddleware({
  getKeyModel: getApiKeyModel,
  getUsageModel: getApiKeyUsageModel,
  populateRequest: (req, key) => {
    req.apiKeyId = typeof key._id === 'string' ? key._id : key._id.toString()
    req.apiKeyUserId = key.userId
    req.apiKeyScope =
      (key.scope as 'admin' | 'user' | 'readonly' | 'test' | 'live' | undefined) || 'live'
    req.apiKeyAppName = (key.appName as string) || '*'
  },
  logger,
})

export const validateApiKey = middleware

/**
 * @internal Exposed for tests only — clears the in-memory monthly usage
 * cache so test cases don't bleed cached quotas into each other.
 */
export function _resetUsageCacheForTests(): void {
  middleware.reset()
}
