/**
 * Monorepo wrapper — pre-configures PayClient with @ezstart/config URLs.
 * This is the thin bridge between the agnostic core and the monorepo.
 */
import { getApiUrl, getCurrentEnvironment } from '@ezstart/config/urls'
import { PayClient } from './core/pay-client.js'
import type { LegacyPayClientConfig, PayClientConfig } from './core/types.js'

/**
 * Create a PayClient pre-configured with EZPay API URL from @ezstart/config.
 *
 * Accepts either the new `PayClientConfig` (with `apiUrl`) or the legacy
 * config shape (with optional `baseURL`). When `apiUrl`/`baseURL` is omitted,
 * it is auto-resolved via `@ezstart/config`.
 */
export function createPayClient(
  config: (Omit<PayClientConfig, 'apiUrl'> & { apiUrl?: string }) | LegacyPayClientConfig
): PayClient {
  const env = getCurrentEnvironment()
  const autoApiUrl = `${getApiUrl('ezpay', env)}/api`

  // Support legacy `baseURL` field
  const resolvedApiUrl =
    ('apiUrl' in config ? config.apiUrl : undefined) ??
    ('baseURL' in config ? config.baseURL : undefined) ??
    autoApiUrl

  return new PayClient({
    ...config,
    apiUrl: resolvedApiUrl,
  })
}
