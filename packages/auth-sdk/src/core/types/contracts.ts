/**
 * Backward-compat re-exports for wire shapes that moved to
 * `@ezstart/api-contracts` in v1.1.0.
 *
 * These types moved out of auth-sdk so any server that issues / verifies keys
 * (EZAuth, EZPay, future) and any client agree on the same shape without
 * taking a backward dep on auth-sdk. The re-exports preserve the original
 * import path (`@ezstart/auth-sdk/core` → `ApiKeyItem`, `Application`, etc.)
 * so existing consumer call sites keep working unchanged.
 *
 * The crypto runtime (`generateRawApiKey`, `hashApiKey`, `detectKeyFormat`)
 * stays in `../api-keys-crypto.ts` because it depends on Node's `crypto`
 * module.
 */

// ---------------------------------------------------------------------------
// API Keys (Developer Portal)
// ---------------------------------------------------------------------------

/**
 * @deprecated Import from `@ezstart/api-contracts` instead.
 */
export type {
  ApiKeyItem,
  ApiKeyUsageResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '@ezstart/api-contracts'

// ---------------------------------------------------------------------------
// Applications (P6 — multi-tenant entity shared across services)
// ---------------------------------------------------------------------------

/**
 * @deprecated Import from `@ezstart/api-contracts` instead.
 */
export type {
  Application,
  ApplicationResolveResponse,
  ApplicationStatus,
  ApplicationTheme,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  UpdateApplicationThemeRequest,
} from '@ezstart/api-contracts'
