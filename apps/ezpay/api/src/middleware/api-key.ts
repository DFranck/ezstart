/**
 * EZPay API-key authentication middleware.
 *
 * Thin wrapper around `createApiKeyMiddleware` from
 * `@ezstart/auth-sdk/server` — the canonical implementation lives in the
 * SDK so ezauth, ezpay, and any future API share identical header parsing,
 * hash lookup, expiry / revocation handling, monthly quota enforcement,
 * and fire-and-forget bookkeeping (no per-app duplication).
 *
 * Validates requests carrying an `X-API-Key` header or an
 * `Authorization: ApiKey <key>` header. The key is SHA-256 hashed and looked
 * up in the LOCAL ezpay `api_keys` collection — no cross-service call is
 * made on the hot path. Cross-service validation happens ONLY at key
 * creation time (`POST /api/keys`) via the ezauth-client service.
 *
 * Side effects on success:
 * - `req.apiKeyId`, `req.apiKeyUserId`, `req.apiKeyApplicationId`,
 *   `req.apiKeyAppSlug`, `req.apiKeyScope` are populated.
 * - `lastUsedAt` on the key is bumped fire-and-forget.
 * - A per-day bucket in `api_key_usage` is incremented fire-and-forget.
 *
 * @module apps/ezpay/api/src/middleware/api-key
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
    req.apiKeyApplicationId = key.applicationId as string | undefined
    req.apiKeyAppSlug = key.appSlug as string | undefined
    req.apiKeyScope = key.scope as 'admin' | 'user' | 'readonly' | undefined
    const keyType = (key as { type?: 'publishable' | 'secret' }).type
    if (keyType === 'publishable' || keyType === 'secret') {
      req.apiKeyType = keyType
    }
  },
  logger,
})

export const validateApiKey = middleware

/**
 * @internal Exposed for tests only — clears the in-memory usage cache so
 * test cases don't bleed cached quotas into each other.
 */
export function _resetUsageCacheForTests(): void {
  middleware.reset()
}
