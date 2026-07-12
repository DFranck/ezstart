/**
 * Publishable-key config fetching + SDK config resolution.
 *
 * Hosts `fetchKeyConfig`, `resolveSDKConfig`, the `PendingKeyFetch` descriptor,
 * and the URL/redirect/localhost helpers they depend on. Re-exported from
 * `../auth-client.ts` so the public import path (`@ezstart/auth-sdk/core` /
 * `./auth-client.js`) is preserved unchanged.
 */

import type { CrossOriginLogger } from '../cross-origin.js'
import { getEzauthDefaultUrls } from '../defaults.js'
import { AuthError } from '../errors.js'
import type { AuthClientConfig, AuthSDKConfig, PublishableKeyConfig } from '../types.js'
import { parseError, unwrapEnvelope } from './context.js'

// ---------------------------------------------------------------------------
// Publishable key config fetching
// ---------------------------------------------------------------------------

/**
 * Normalize a URL to a bare base (no trailing `/api/auth`, no trailing slash).
 *
 * Accepts either convention the SDK can receive from consumers:
 * - Base URL:   `'https://api.example.com'`
 * - Auth URL:   `'https://api.example.com/api/auth'` (low-level `AuthClientConfig` shape)
 *
 * Returns: `'https://api.example.com'` in both cases.
 *
 * This avoids URL construction bugs like `/api/auth/api/keys/config` when a
 * consumer passes the auth URL to a function that expects the base.
 *
 * @internal
 */
function normalizeApiBaseUrl(input: string): string {
  let base = input
  if (base.endsWith('/api/auth')) {
    base = base.slice(0, -'/api/auth'.length)
  }
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  return base
}

/**
 * Fetch app configuration from EZAuth API using a publishable key.
 * The key acts as authentication — no user auth needed.
 *
 * Accepts either a bare base URL or an auth URL (with `/api/auth` suffix) —
 * the function normalizes internally to avoid double-prefixing the path.
 *
 * @example
 * ```ts
 * // Both of these resolve to GET https://api.ezauth.com/api/keys/config
 * await fetchKeyConfig('ez_pk_live_abc123', 'https://api.ezauth.com')
 * await fetchKeyConfig('ez_pk_live_abc123', 'https://api.ezauth.com/api/auth')
 * ```
 */
export async function fetchKeyConfig(
  publishableKey: string,
  apiBaseUrl: string
): Promise<PublishableKeyConfig> {
  const base = normalizeApiBaseUrl(apiBaseUrl)
  const response = await fetch(`${base}/api/keys/config?key=${encodeURIComponent(publishableKey)}`)
  const result = await response.json()

  if (!response.ok) {
    throw new AuthError(
      parseError(result, 'Failed to fetch key config'),
      response.status,
      'KEY_CONFIG_ERROR'
    )
  }

  const data = unwrapEnvelope<PublishableKeyConfig>(result)
  return data
}

// ---------------------------------------------------------------------------
// SDK config resolver
// ---------------------------------------------------------------------------

/**
 * Default API URL for localhost development only.
 *
 * Agnostic convention: localhost dev envs commonly boot the auth API on a
 * well-known port, so defaulting to `http://localhost:6110` here keeps the
 * dev DX zero-config without coupling the SDK to any specific deployment.
 *
 * For any non-localhost environment (staging, production, self-hosted,
 * preview, etc.), the consumer MUST pass `apiUrl` explicitly (or a
 * `publishableKey` whose `/api/keys/config` response provides the URL).
 * The SDK intentionally does NOT ship hardcoded monorepo-specific fallbacks.
 */
const DEFAULT_LOCAL_API = 'http://localhost:6110'

/**
 * Thrown when `resolveSDKConfig` is invoked outside localhost without any of
 * the signals that would let it resolve an API URL: no `firstParty`, no
 * `publishableKey`, no explicit `apiUrl`.
 *
 * Fail-fast, no silent fallback to a vendor-specific production URL.
 */
/**
 * Thrown when `firstParty: true` is used off-localhost without an explicit
 * `appName`. Defaulting to `'ezauth'` silently on a non-ezauth app would
 * cause every auth request to carry `app=ezauth`, which is a cross-tenant
 * leak (sessions, keys, quotas attributed to the wrong tenant).
 *
 * Localhost is intentionally permissive to preserve zero-config dev DX.
 */
const MISSING_FIRST_PARTY_APP_NAME_MESSAGE =
  'auth-sdk: first-party mode requires an explicit `appName` off-localhost. ' +
  'Defaulting to `"ezauth"` silently would leak cross-tenant requests.'

/**
 * Thrown when a resolved `webUrl` still points at localhost while the app
 * itself is running off-localhost. This usually means an env var such as
 * `NEXT_PUBLIC_EZAUTH_WEB_URL` is missing or empty in the target
 * environment — without this guard the user would be redirected to
 * `http://localhost:6111` at login/register time and the auth flow would
 * silently break in production.
 */
const WEB_URL_LOCALHOST_TRAP_MESSAGE =
  'auth-sdk: webUrl resolves to localhost but the app is not running on ' +
  'localhost. Set `NEXT_PUBLIC_EZAUTH_WEB_URL` (or an equivalent env var) ' +
  'or pass `webUrl` explicitly to your provider.'

/**
 * Assert that a `webUrl` is safe for the current environment. Warns when
 * the app runs off-localhost but `webUrl` still resolves to a localhost
 * host. Localhost apps may point anywhere (including other localhost
 * ports), so no check is applied when `isLocal` is true.
 *
 * Matches `http://localhost`, `https://localhost`, and the `.localhost`
 * TLD variants so multi-tenant dev URLs (e.g. `https://app.localhost`)
 * also trip the guard when used unintentionally in prod.
 *
 * @param logger - Optional logger; only `warn` is called. Defaults to a
 *   silent no-op so the agnostic core never writes to `console` directly
 *   (cf. standard.md §1/§2 — logging is injected, not hard-coded). The
 *   consuming provider wires its own logger (which may route to console,
 *   toast, Sentry, etc.) through `resolveSDKConfig`.
 */
function assertWebUrlNotLocalhostOffLocal(
  webUrl: string,
  isLocal: boolean,
  logger?: CrossOriginLogger
): void {
  if (isLocal) return

  // Phase D follow-up (2026-05-05) — converted from `throw` to a warning.
  //
  // Original intent : catch consumers shipping production builds with a
  // localhost webUrl baked in (login click would dead-end on localhost).
  //
  // Why warn instead of throw : in a Stripe-pattern SDK with env-aware
  // defaults, the assertion fires false-positive when the bundler dead-
  // code-eliminates the env detection in client builds, leaving stale
  // localhost defaults visible to the trap. Throwing at provider mount
  // time kills the entire app (white screen) — much worse UX than a
  // potentially mis-configured login button. The warn surfaces the
  // problem (visible to operators + Sentry-style trackers via the
  // injected logger) without breaking the page render.
  //
  // Lot 3B (2026-05-20) — routed through the injected logger instead of a
  // direct `console.warn` so the agnostic core stays console-free.
  let isLocalhostUrl = false
  try {
    const parsed = new URL(webUrl)
    const host = parsed.hostname
    isLocalhostUrl =
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
  } catch {
    // Malformed URL: fall back to string contains to avoid false negatives.
    isLocalhostUrl = webUrl.includes('localhost') || webUrl.includes('127.0.0.1')
  }

  if (isLocalhostUrl) {
    logger?.warn?.(`[auth-sdk] ${WEB_URL_LOCALHOST_TRAP_MESSAGE}`)
  }
}

/**
 * Check if we are running on localhost.
 *
 * Covers:
 * - `localhost`
 * - `*.localhost` TLD (RFC 6761, used by Chrome for multi-tenant local dev)
 * - `127.0.0.1` (IPv4 loopback)
 * - `0.0.0.0` (unspecified IPv4, often bound in dev)
 * - `[::1]` / `::1` (IPv6 loopback, bracketed or bare)
 *
 * Returns `false` when `window` is undefined (SSR / Node). Consumers running
 * the SDK in a server-rendered context (Next.js SSR/RSC) MUST either:
 * - Pass an explicit `apiUrl` so `resolveSDKConfig` never needs to guess from
 *   hostname, OR
 * - Load the provider behind a `'use client'` boundary so this helper only
 *   ever evaluates in the browser.
 *
 * Without one of the above, `resolveSDKConfig` will throw a CONFIG_ERROR at
 * SSR time because no URL signals are available.
 */
function isLocalhost(): boolean {
  // Browser: authoritative — check hostname directly.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    return (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
    )
  }
  // SSR / Node: use env signals. `VERCEL_ENV` is always set on Vercel (dev
  // preview/production alike), while Next.js local dev only exposes
  // `NODE_ENV === 'development'`. If we are running under Next dev without
  // any Vercel deploy marker, we are on localhost — even though the window
  // global does not exist yet for this server render pass.
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VERCEL_ENV || process.env.RAILWAY_ENVIRONMENT) return false
    if (process.env.NODE_ENV === 'development') return true
  }
  return false
}

/**
 * Detect the redirect URI from the current browser URL.
 *
 * Returns the **locale-less** `${origin}/auth/callback` form. OAuth callback
 * URLs MUST be stable identifiers per RFC 6749 §3.1.2 (exact-match against
 * the registered allowlist) — embedding the locale would multiply the surface
 * by the number of supported languages and make `Application.redirectUris`
 * unbounded.
 *
 * The locale is a presentation concern handled by the framework's i18n
 * middleware AFTER the callback page renders (next-intl resolves the locale
 * from the `Accept-Language` header, the `NEXT_LOCALE` cookie, or the URL
 * pathname). Visiting `/auth/callback` therefore resolves transparently to
 * the user's current locale (`/en/auth/callback`, `/fr/auth/callback`, …).
 *
 * This same value is sent at:
 * - `/authorize` (login or OAuth init)  → backend stores it on the auth code
 * - `/token` (code exchange)            → backend enforces strict equality
 *
 * Pre-2026-06-21 behavior included a `/${locale}` prefix detected from
 * `window.location.pathname`. That broke `Application.redirectUris` exact-
 * match validation whenever the user reached `/login` on a non-default
 * locale (`/fr/login` → `redirect_uri=/fr/auth/callback`, but the registered
 * allowlist only carried `/auth/callback`). See AUTH-OAUTH-REDIRECT-URI-SEED-001.
 *
 * @internal Exported for parity tests only — every helper that emits a
 * `redirect_uri` for `/auth/callback` MUST return bit-equal output to this
 * function (see `hooks.test.tsx` parity matrix).
 */
export function detectRedirectUri(): string {
  if (typeof window === 'undefined') return '/auth/callback'
  return `${window.location.origin}/auth/callback`
}

/**
 * Descriptor for the async publishable-key → app config fetch the caller must
 * perform when `resolveSDKConfig` returns a non-null `keyFetch`. The fetch is
 * intentionally NOT started here so that `resolveSDKConfig` is a pure function
 * safe to call from `useMemo` (React may recompute memoized values more than
 * once per dep change — firing the fetch from inside the memo would hammer
 * `/api/keys/config` and trip the 30 req/min rate limit).
 */
export interface PendingKeyFetch {
  /** The publishable key to resolve. */
  publishableKey: string
  /** Normalized API base (no `/api/auth` or trailing slash), ready for `fetchKeyConfig`. */
  apiBaseUrl: string
}

/**
 * Resolve the full SDK configuration into a CoreAuthClient config + web URL.
 *
 * Handles three modes:
 * 1. Publishable key → returns a `keyFetch` descriptor the caller must pass to
 *    `fetchKeyConfig()` inside an effect (NOT during render).
 * 2. First-party → immediate config from env/defaults
 * 3. Dev mode (no key + localhost) → permissive defaults
 *
 * **Pure function** — no side effects, safe to call from `useMemo`. The actual
 * network request is deferred to the caller's effect.
 *
 * @param sdkConfig - The consumer-supplied SDK configuration.
 * @param logger - Optional logger; only `warn` is called, surfaced when the
 *   resolved `webUrl` is a stale localhost value off-localhost (the
 *   localhost-trap guard). Defaults to a silent no-op so the agnostic core
 *   never touches `console` directly — the consuming `<AuthProvider>` wires
 *   its own `logger` (console / toast / Sentry) and forwards it here.
 * @returns Resolved config with apiUrl, appName, webUrl, and an optional
 *          `keyFetch` descriptor the caller resolves asynchronously.
 */
export function resolveSDKConfig(
  sdkConfig: AuthSDKConfig,
  logger?: CrossOriginLogger
): {
  clientConfig: AuthClientConfig
  webUrl: string
  /**
   * Descriptor the caller must pass to `fetchKeyConfig()` from an effect when
   * a publishable key was provided. `null` otherwise.
   */
  keyFetch: PendingKeyFetch | null
} {
  const key = sdkConfig.publishableKey
  const local = isLocalhost()

  // Normalize the consumer-supplied apiUrl (if any) to a bare base URL.
  // Accepts both `'http://host'` and `'http://host/api/auth'` conventions so
  // downstream URL construction never ends up with `/api/auth/api/auth` or
  // `/api/auth/api/keys/config` suffixes.
  const consumerBaseUrl = sdkConfig.apiUrl ? normalizeApiBaseUrl(sdkConfig.apiUrl) : undefined

  // Env-aware default URLs for the canonical EZAuth deployment. Picks
  // production / staging / local based on `DEPLOY_ENV` / `VERCEL_GIT_*` /
  // hostname (cf. `core/defaults.ts` `detectAuthEnvironment`). External
  // customers self-hosting against a different cloud override via the
  // `apiUrl` / `webUrl` props or the `NEXT_PUBLIC_EZAUTH_*_URL` env vars
  // — those win over these defaults. The defaults exist so the canonical
  // EZStart deployment needs ZERO env vars in any of its environments.
  const envDefaults = getEzauthDefaultUrls()
  const defaultApiBaseUrl = envDefaults.api
  const defaultWebUrl = sdkConfig.webUrl ?? envDefaults.web

  if (sdkConfig.firstParty) {
    // First-party mode: direct access, no key needed.
    //
    // Security guard: off-localhost, `appName` must be explicit. Defaulting
    // to `'ezauth'` on a non-ezauth first-party app would silently mislabel
    // every outbound request with the wrong tenant (cross-tenant leak).
    if (!local && sdkConfig.appName === undefined) {
      throw new AuthError(MISSING_FIRST_PARTY_APP_NAME_MESSAGE, 0, 'CONFIG_ERROR')
    }

    // First-party callers without an explicit `apiUrl` get the env-aware
    // default API base. Eliminates the need for `NEXT_PUBLIC_EZAUTH_API_URL`
    // when the consumer is the canonical EZStart auth provider.
    const apiBaseUrl = consumerBaseUrl ?? defaultApiBaseUrl
    const apiUrl = `${apiBaseUrl}/api/auth`
    const webUrl = defaultWebUrl
    const appName = sdkConfig.appName ?? 'ezauth'

    assertWebUrlNotLocalhostOffLocal(webUrl, local, logger)

    return {
      clientConfig: {
        apiUrl,
        appName,
        redirectUri: detectRedirectUri(),
      },
      webUrl,
      keyFetch: null,
    }
  }

  if (key) {
    // Publishable key mode: create client with defaults, then async-update
    // from key config. Consumer-provided `apiUrl` wins; otherwise we use the
    // env-aware default so a consumer pointing at the canonical EZStart
    // cloud needs no env var to discover where `/keys/config` lives.
    const apiBaseUrl = consumerBaseUrl ?? defaultApiBaseUrl
    const apiUrl = `${apiBaseUrl}/api/auth`
    const webUrl = defaultWebUrl

    assertWebUrlNotLocalhostOffLocal(webUrl, local, logger)

    // We create the client with placeholder appName; it will be updated after config fetch
    const clientConfig: AuthClientConfig = {
      apiUrl,
      appName: sdkConfig.appName ?? 'pending',
      apiKey: key,
      redirectUri: detectRedirectUri(),
    }

    // CRITICAL: return a descriptor, NOT a started promise. React may call
    // this function from `useMemo` multiple times (memos are not a semantic
    // guarantee of single execution). Starting the fetch here would hammer
    // `/api/keys/config` and trip the 30 req/min rate limit. The caller is
    // expected to invoke `fetchKeyConfig(publishableKey, apiBaseUrl)` from
    // an effect guarded against duplicate fires.
    return {
      clientConfig,
      webUrl,
      keyFetch: { publishableKey: key, apiBaseUrl },
    }
  }

  // Dev mode: no key, no first-party → permissive defaults. Off-localhost
  // we still resolve a sensible default API URL via the env-aware lookup
  // (no more fail-fast on bare `<AuthProvider>` mounts during static
  // prerender — the env-aware default covers the canonical deployment).
  const apiBaseUrl = consumerBaseUrl ?? (local ? DEFAULT_LOCAL_API : defaultApiBaseUrl)
  const apiUrl = `${apiBaseUrl}/api/auth`
  const webUrl = defaultWebUrl
  const appName = sdkConfig.appName ?? 'dev'

  assertWebUrlNotLocalhostOffLocal(webUrl, local, logger)

  return {
    clientConfig: {
      apiUrl,
      appName,
      redirectUri: detectRedirectUri(),
    },
    webUrl,
    keyFetch: null,
  }
}
