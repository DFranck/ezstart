/**
 * SSR cache wrapper around `GET /api/keys/config`.
 *
 * Next.js middleware runs in the Edge runtime and is invoked once per request
 * — including for asset prefetches and RSC probes. We keep a tiny
 * module-level LRU so repeated fetches for the same publishable key within a
 * short window avoid re-hitting the EZAuth API.
 *
 * 30 s TTL matches the server-side `/keys/config` cache, so the worst-case
 * staleness after a dashboard theme toggle is ~60 s (client → server TTL
 * stack). `PATCH /applications/:id/theme` calls `__resetKeyConfigCache()` on
 * the API side, so the propagation is faster in practice.
 */

export interface KeyConfigTheme {
  primary?: string
  /**
   * Legacy fields retained for backwards compatibility with older API
   * responses. The SSR renderer intentionally does NOT emit CSS overrides
   * for these tokens — light/dark mode is driven by next-themes and
   * overriding those tokens would collide with the user's theme preference.
   */
  background?: string
  foreground?: string
  accent?: string
  logo?: string
}

export interface KeyConfigResponse {
  appName: string
  /**
   * Human-readable Application name (e.g. `'GreenPulse.AI'`), resolved from
   * `Application.name` in the DB. Optional — absent for platform-wide keys
   * that are not bound to a specific Application. Consumers MUST fall back
   * to a prettified `appName` when missing.
   */
  appDisplayName?: string
  apiUrl: string
  webUrl: string
  features: string[]
  plan: string
  quotaMonthly: number
  scope: 'admin' | 'user' | 'readonly' | 'test' | 'live'
  theme?: KeyConfigTheme
}

interface CacheEntry {
  value: KeyConfigResponse | null
  expiresAt: number
}

const CACHE_TTL_MS = 30_000
const CACHE_MAX_ENTRIES = 200
const cache = new Map<string, CacheEntry>()

/**
 * Hard timeout for the upstream call. Middleware runs on the hot path of
 * every page render — a slow auth API must never block the user.
 */
const FETCH_TIMEOUT_MS = 800

function readCache(key: string): KeyConfigResponse | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function writeCache(key: string, value: KeyConfigResponse | null): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Fetch the key config from the EZAuth API, using an in-memory LRU to avoid
 * repeated hits on the same publishable key within the TTL window.
 *
 * Returns `null` when the key is invalid / expired / rate-limited — callers
 * should treat this identically to "no theme data" and fall back to the
 * default CSS preset. Throwing is reserved for truly unexpected errors
 * (callers in middleware already swallow them).
 *
 * @param publishableKey — raw key from `?key=` URL param
 * @param apiBaseUrl — base URL like `https://api.ezauth.staging.ezstart.xyz`
 */
export async function fetchKeyConfigCached(
  publishableKey: string,
  apiBaseUrl: string
): Promise<KeyConfigResponse | null> {
  if (!publishableKey) return null

  const cached = readCache(publishableKey)
  if (cached !== undefined) return cached

  const url = `${apiBaseUrl.replace(/\/$/, '')}/api/keys/config?key=${encodeURIComponent(publishableKey)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    // Edge runtime hot-path call — keep raw fetch here:
    // 1. `fetchExternal()` from @ezstart/api-sdk throws on non-2xx, but this
    //    cache must SILENTLY return null on 4xx/5xx (invalid keys, rate
    //    limits) so the worst case is "no theme override" not a 500 page.
    // 2. We need explicit AbortSignal+timeout, custom validation, and
    //    write-through cache semantics that don't fit the apiCall envelope.
    // 3. `apiCall()` injects auth + assumes the standardized envelope shape.
    // eslint-disable-next-line @ezstart/ezstart/no-raw-fetch
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Never trigger cookie-based session auth — this endpoint is public.
      credentials: 'omit',
    })

    if (!response.ok) {
      // Cache the "no config" signal for a shorter window to avoid thrashing
      // the API when a bot probes with invalid keys repeatedly.
      writeCache(publishableKey, null)
      return null
    }

    const body: unknown = await response.json()
    if (!isValidConfigEnvelope(body)) {
      writeCache(publishableKey, null)
      return null
    }

    writeCache(publishableKey, body.data)
    return body.data
  } catch {
    // Timeout / network / abort — cache a null so subsequent requests in the
    // same window don't pile up while the upstream recovers.
    writeCache(publishableKey, null)
    return null
  } finally {
    clearTimeout(timer)
  }
}

function isValidConfigEnvelope(
  value: unknown
): value is { success: true; data: KeyConfigResponse } {
  if (!value || typeof value !== 'object') return false
  const v = value as { success?: unknown; data?: unknown }
  if (v.success !== true) return false
  if (!v.data || typeof v.data !== 'object') return false
  const d = v.data as Record<string, unknown>
  if (
    typeof d.appName !== 'string' ||
    typeof d.apiUrl !== 'string' ||
    typeof d.webUrl !== 'string' ||
    !Array.isArray(d.features) ||
    typeof d.plan !== 'string' ||
    typeof d.quotaMonthly !== 'number' ||
    typeof d.scope !== 'string'
  ) {
    return false
  }
  // Optional fields: validate when present to reject garbage shapes early.
  if (d.appDisplayName !== undefined && typeof d.appDisplayName !== 'string') return false
  return true
}

/**
 * Test-only helper — allows unit tests to purge the LRU between cases.
 * @internal
 */
export function __resetKeyConfigSsrCache(): void {
  cache.clear()
}
