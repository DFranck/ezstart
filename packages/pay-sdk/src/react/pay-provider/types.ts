/**
 * Type surface + small helpers for `<PayProvider>`. Extracted from
 * `pay-provider.tsx` so the provider module stays a thin orchestrator
 * (standard.md §3 — file < 400 lines). Pure type/helper move, no behaviour
 * change.
 *
 * @module @ezstart/pay-sdk/react/pay-provider/types
 */
import type { ReactNode } from 'react'
import type { Logger } from '@ezstart/logger'
import type { PayClient } from '../../core/pay-client.js'
import type { PayClientConfig } from '../../core/types.js'
import type { ApplicationResolutionStatus } from '../store.js'

export interface PayContextValue {
  client: PayClient
  /**
   * Application id resolved from either `applicationId` config/prop or via
   * `resolveApplicationByKey(publishableKey)` on mount. `null` until resolved.
   */
  applicationId: string | null
  /** Human-friendly application slug (e.g. "ezbill"). `null` until resolved. */
  appSlug: string | null
  /**
   * `true` once the application context is resolved (explicit applicationId or
   * successful publishableKey resolve) OR when the legacy `appName`-only path
   * is used (no resolution possible). NEVER `true` on a transient resolve
   * failure — that case surfaces as `applicationResolutionStatus === 'failed'`.
   */
  isReady: boolean
  /**
   * Explicit resolution lifecycle:
   * - `idle` — no publishableKey provided (legacy `appName`-only, cross-app possible)
   * - `pending` — publishableKey provided, resolve in flight
   * - `ready` — applicationId is known (explicit or successfully resolved)
   * - `failed` — publishableKey was given but the resolve call threw. Consumers
   *   MUST NOT fall back to cross-app queries when status is `failed`.
   */
  applicationResolutionStatus: ApplicationResolutionStatus
  /**
   * Public ezpay web URL — where the developer portal (API keys CRUD) lives.
   * Used by pay-sdk components to build "Get your key" CTAs in graceful
   * fallback cards when the SDK is unconfigured or its queries fail.
   *
   * Different from `ApplicationConfigResponse.webUrl` (which is the ezauth
   * web URL returned by `/keys/config`). `null` when the consumer did not
   * provide a value and auto-detection failed (non-localhost production).
   */
  payWebUrl: string | null
  /**
   * BCP-47 locale inherited by every downstream pay-sdk component (used to
   * build locale-prefixed URLs such as the "Get your key" CTA). Set once on
   * `<PayProvider locale={…}>`; components may still override per-render via
   * their own `locale` prop. Defaults to `'en'` when the consumer did not
   * provide one.
   */
  locale: string
  /**
   * Diagnostic logger injected via `<PayProvider logger={...}>` (defaults to
   * a thin `console.*` adapter). Exposed so SDK components can surface
   * deprecation / misconfiguration signals through the consumer-controlled
   * sink instead of writing directly to `console`.
   */
  logger: Logger
}

export interface PayProviderProps {
  children: ReactNode
  /**
   * Legacy app-slug identifier. Kept for backward compatibility with existing
   * consumers. Prefer `applicationId` or `publishableKey` for new code.
   *
   * Using `appName` alone (without `applicationId` or `publishableKey`) puts
   * the provider in the `idle` resolution state — downstream queries that
   * depend on `applicationId` will fall back to cross-app scope. This path
   * emits a `console.error` in dev to encourage migration.
   *
   * @deprecated Use `applicationId` or `publishableKey` instead.
   */
  appName?: string
  /**
   * Ezauth Application id the provider is scoped to. Takes precedence over
   * `appName`. When omitted and `publishableKey` is provided, the value is
   * resolved automatically via `GET /api/keys/config`.
   */
  applicationId?: string
  /**
   * EZPay publishable key (`ez_pk_*`). When set, the provider calls
   * `GET /api/keys/config?key=<publishableKey>` on mount to resolve the
   * `applicationId` + `appSlug` and caches them in the React context.
   */
  publishableKey?: string
  config?: Partial<Omit<PayClientConfig, 'appName'>>
  /** Optional callback to retrieve the current auth token dynamically.
   *  Shorthand for config.getToken — if both are provided, this prop takes precedence. */
  getToken?: () => string | null | undefined
  /** Optional callback to refresh the auth token on 401. Should return the new token or null. */
  onTokenRefresh?: () => Promise<string | null>
  /** Optional callback invoked when token refresh fails (e.g. to trigger logout/redirect). */
  onAuthFailure?: () => void
  /**
   * Public ezpay web URL — where the developer portal (API keys CRUD) lives.
   * Used by pay-sdk components to build "Get your key" CTAs in graceful
   * fallback cards. Example: `https://ezpay.ezstart.xyz`.
   *
   * When omitted, auto-detected from `config.apiUrl` for localhost dev
   * (`http://localhost:6130` → `http://localhost:6131`). In production the
   * consumer MUST pass this explicitly — otherwise fallback cards render
   * without the CTA button.
   */
  payWebUrl?: string
  /**
   * BCP-47 locale propagated to every downstream pay-sdk component (used to
   * build locale-prefixed URLs such as the "Get your key" CTA). Consumers
   * using Next.js App Router typically pass `locale` from `params.locale` or
   * `useLocale()` (next-intl). When omitted, falls back to `'en'`.
   *
   * Components still accept a per-instance `locale` override via their own
   * prop, but the common case is to set it once here.
   */
  locale?: string
  /**
   * Optional {@link Logger} instance used to surface SDK diagnostics
   * (deprecation warnings, publishable-key resolve failures, ...). Defaults
   * to a thin `console.*` adapter so existing consumers keep seeing the
   * same messages.
   *
   * Pass a silent or scoped logger (`@ezstart/logger`, Pino child, custom
   * sink, etc.) to redirect or suppress these signals.
   *
   * @example
   * ```tsx
   * import { logger } from '@ezstart/logger'
   * <PayProvider logger={logger} ... />
   * ```
   */
  logger?: Logger
}

/**
 * Auto-detect the ezpay web URL for localhost dev when the consumer did not
 * provide `payWebUrl` explicitly. Falls back to `null` for any non-localhost
 * origin so we never silently link users to a wrong host in production.
 *
 * @internal
 */
export function resolvePayWebUrl(
  explicit: string | undefined,
  apiUrl: string | undefined
): string | null {
  if (explicit && explicit.length > 0) return explicit
  if (!apiUrl) return null
  // Only auto-wire localhost — production MUST be explicit.
  if (/^http:\/\/localhost:\d+/i.test(apiUrl)) {
    return 'http://localhost:6131'
  }
  return null
}
