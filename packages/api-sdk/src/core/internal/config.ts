import { createCsrfManager, type CsrfManager } from './csrf.js'
import type { ApiClientConfig, BaseUrlResolver, ClientLogger, EnvelopeConfig } from '../types.js'

/**
 * @internal
 *
 * Fully-resolved client configuration with defaults applied. Builders
 * (`apiCall`, `apiStream`, `apiQuery`) consume this shape exclusively.
 */
export type ResolvedConfig = Omit<
  Required<Pick<ApiClientConfig, 'credentials' | 'pathPrefix' | 'logger'>>,
  never
> & {
  baseUrl: BaseUrlResolver
  envelope: EnvelopeConfig
  tokenStore: ApiClientConfig['tokenStore']
  refresh: ApiClientConfig['refresh']
  /** CSRF manager for cookie-auth writes, or `null` when `csrfConfig` is absent. */
  csrf: CsrfManager | null
}

// Silent by default (industry convention — ky/ofetch/axios don't log without
// explicit opt-in). Callers that want diagnostics pass their own logger via
// ApiClientConfig.logger.
const DEFAULT_LOGGER: ClientLogger = {
  warn: () => {},
  debug: () => {},
}

const DEFAULT_ENVELOPE: EnvelopeConfig = {
  unwrap: true,
  throwOnFailureEnvelope: true,
}

/**
 * @internal
 *
 * Apply defaults to an `ApiClientConfig`.
 */
export function resolveConfig(config: ApiClientConfig): ResolvedConfig {
  return {
    baseUrl: config.baseUrl ?? null,
    tokenStore: config.tokenStore,
    refresh: config.refresh,
    envelope: { ...DEFAULT_ENVELOPE, ...config.envelope },
    credentials: config.credentials ?? 'include',
    pathPrefix: config.pathPrefix ?? '/api',
    logger: config.logger ?? DEFAULT_LOGGER,
    csrf: config.csrfConfig ? createCsrfManager(config.csrfConfig) : null,
  }
}

/**
 * @internal
 *
 * Resolve the base URL for a given app name (or undefined for direct calls).
 */
export function resolveBaseUrl(
  resolver: BaseUrlResolver,
  appName: string | undefined
): string | null {
  if (resolver === null || resolver === undefined) return null
  if (typeof resolver === 'string') return resolver
  return resolver(appName)
}
