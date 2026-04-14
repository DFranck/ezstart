import type { RefreshConfig, TokenStore } from '../types.js'

/**
 * @internal
 *
 * Default body builder: `{ refreshToken }`.
 */
function defaultBuildBody(refreshToken: string): unknown {
  return { refreshToken }
}

/**
 * @internal
 *
 * Default response parser. Looks up `accessToken`/`refreshToken` (or snake_case)
 * inside `body.data` then `body`.
 */
function defaultParseResponse(body: unknown): { accessToken: string; refreshToken: string } | null {
  if (!body || typeof body !== 'object') return null

  const root = body as Record<string, unknown>
  const candidate =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root

  const accessToken =
    typeof candidate.accessToken === 'string'
      ? candidate.accessToken
      : typeof candidate.access_token === 'string'
        ? candidate.access_token
        : null

  const refreshToken =
    typeof candidate.refreshToken === 'string'
      ? candidate.refreshToken
      : typeof candidate.refresh_token === 'string'
        ? candidate.refresh_token
        : null

  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

/**
 * @internal
 *
 * Per-client refresh helper with single-flight deduplication.
 */
export type RefreshHelper = {
  /** Returns the new access token on success, `null` otherwise. */
  refresh(): Promise<string | null>
  /** Reset the in-flight cache (for tests). */
  reset(): void
}

/**
 * @internal
 *
 * Build a refresh helper bound to a specific config / token store.
 */
export function createRefreshHelper(
  refresh: RefreshConfig | undefined,
  tokenStore: TokenStore | undefined
): RefreshHelper {
  let inflight: Promise<string | null> | null = null

  async function doRefresh(): Promise<string | null> {
    if (!refresh || !tokenStore?.getRefreshToken) return null

    const rt = await tokenStore.getRefreshToken()
    if (!rt) return null

    const buildBody = refresh.buildBody ?? defaultBuildBody
    const parseResponse = refresh.parseResponse ?? defaultParseResponse

    let res: Response
    try {
      res = await fetch(refresh.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(rt)),
      })
    } catch {
      return null
    }

    if (!res.ok) return null

    let body: unknown
    try {
      body = await res.json()
    } catch {
      return null
    }

    const tokens = parseResponse(body)
    if (!tokens) return null

    if (tokenStore.setTokens) {
      try {
        await tokenStore.setTokens(tokens)
      } catch {
        // best-effort; still return the access token
      }
    }
    return tokens.accessToken
  }

  return {
    refresh(): Promise<string | null> {
      if (inflight) return inflight
      inflight = doRefresh().finally(() => {
        inflight = null
      })
      return inflight
    },
    reset(): void {
      inflight = null
    },
  }
}
