/**
 * API key crypto primitives for EZAuth API.
 *
 * Thin re-export of the agnostic primitives promoted to `@ezstart/auth-sdk/core`.
 * Do not add new logic here — extend the SDK core module instead so EZPay
 * and other services share the exact same implementation.
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
