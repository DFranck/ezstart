/**
 * API key crypto helpers — re-exported from `@ezstart/auth-sdk/core`.
 *
 * These primitives (generate/hash/detect/extract) are shared across every
 * ezstart service that issues `ez_(pk|sk)_(live|test)_*` keys. Centralising
 * them in auth-sdk keeps the crypto surface agnostic and auditable.
 *
 * @module apps/ezpay/api/src/utils/api-key
 */

export {
  generateRawApiKey,
  hashApiKey,
  extractKeyPrefix,
  detectKeyFormat,
  KEY_PREFIX,
  LEGACY_PREFIXES,
} from '@ezstart/auth-sdk/core'

export type { ApiKeyType, ApiKeyEnv, ApiKeyScope, KeyFormat } from '@ezstart/auth-sdk/core'
