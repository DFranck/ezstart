import type { ClientLogger, RefreshConfig, TokenStore } from '../types.js'

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
 * Per-call options accepted by {@link RefreshHelper.refresh}.
 *
 * - `signal` propagates an upstream `AbortSignal` (e.g. the original
 *   `apiCall`'s cancellation) to the refresh `fetch`. Without this, a
 *   refresh started by an aborted `apiCall` would complete after the user
 *   has navigated away and silently re-hydrate fresh tokens.
 */
export type RefreshOptions = {
  signal?: AbortSignal
}

/**
 * @internal
 *
 * Per-client refresh helper with single-flight deduplication.
 */
export type RefreshHelper = {
  /** Returns the new access token on success, `null` otherwise. */
  refresh(opts?: RefreshOptions): Promise<string | null>
  /** Reset the in-flight cache (for tests). */
  reset(): void
}

// ---------------------------------------------------------------------------
// Logout race protection (CRIT-2)
// ---------------------------------------------------------------------------
//
// The auth-sdk (or any consumer that manages user sessions) MUST call
// `bumpLogoutEpoch()` BEFORE clearing the token store on logout. Refresh
// helpers snapshot the epoch at the start of each refresh; if the epoch
// changes during the refresh round-trip, the resulting tokens are discarded
// instead of being written back to the token store.
//
// Without this guard, the following race silently re-logs the user in:
//   T+0   apiCall('/me') -> 401 -> refresh() starts
//   T+50  user clicks Logout -> store cleared
//   T+100 refresh POST resolves with fresh tokens -> setTokens() runs
//   T+101 user is "re-logged-in" without ever knowing.
//
// The counter is module-level on purpose: every refresh helper in the
// process shares the same logout signal, which is the desired semantic for
// a SaaS where one logout invalidates every in-flight refresh.

let logoutEpoch = 0

/**
 * Signal that the user has logged out. Every in-flight refresh started
 * before this call will discard its result instead of writing fresh tokens
 * back to the token store.
 *
 * MUST be called BEFORE clearing the token store (otherwise an in-flight
 * refresh started between the bump and the clear is still vulnerable).
 *
 * Wired by `@ezstart/auth-sdk` inside its `logout()` action.
 *
 * @internal
 */
export function bumpLogoutEpoch(): void {
  logoutEpoch++
}

/**
 * @internal
 *
 * Read the current logout epoch. Exposed for tests.
 */
export function __getLogoutEpochForTests(): number {
  return logoutEpoch
}

// ---------------------------------------------------------------------------
// Circuit breaker (CRIT-3)
// ---------------------------------------------------------------------------
//
// Prevents refresh storms when a pathological server hands out tokens that
// are immediately invalid. After `MAX_FAILURES` consecutive failed refreshes
// within `WINDOW_MS`, subsequent calls return `null` immediately until the
// window expires or a successful refresh resets the counter.
//
// Module-level on purpose: a 401 storm is a process-wide condition (the
// server is the shared resource being protected), not a per-client one.

const BREAKER_MAX_FAILURES = 3
const BREAKER_WINDOW_MS = 60_000

const refreshBreaker = {
  consecutiveFailures: 0,
  windowStart: 0,
}

function isBreakerOpen(): boolean {
  if (refreshBreaker.consecutiveFailures < BREAKER_MAX_FAILURES) return false
  return Date.now() - refreshBreaker.windowStart < BREAKER_WINDOW_MS
}

/**
 * Record a refresh failure. Returns `true` when this failure tripped the
 * breaker (i.e. crossed the `MAX_FAILURES` threshold within the window).
 */
function recordRefreshFailure(): boolean {
  const now = Date.now()
  // Reset the rolling window when the previous window has elapsed.
  if (now - refreshBreaker.windowStart > BREAKER_WINDOW_MS) {
    refreshBreaker.consecutiveFailures = 1
    refreshBreaker.windowStart = now
    return false
  }
  refreshBreaker.consecutiveFailures++
  // `=== MAX_FAILURES` (not `>=`) so we log the trip exactly once.
  return refreshBreaker.consecutiveFailures === BREAKER_MAX_FAILURES
}

function recordRefreshSuccess(): void {
  refreshBreaker.consecutiveFailures = 0
  refreshBreaker.windowStart = 0
}

/**
 * Reset the refresh circuit breaker. Exposed for tests only.
 *
 * @internal
 */
export function resetRefreshBreaker(): void {
  refreshBreaker.consecutiveFailures = 0
  refreshBreaker.windowStart = 0
}

// ---------------------------------------------------------------------------
// Refresh helper factory
// ---------------------------------------------------------------------------

/**
 * @internal
 *
 * No-op safe wrapper around `logger.warn`. A throwing logger transport
 * (e.g. pino with a downed destination) MUST NOT convert a soft refresh
 * fallback into a hard promise rejection — per `standard-sdk-dx.md`
 * §11bis.2, SDK loggers must be no-op safe.
 */
function safeWarn(
  logger: ClientLogger | undefined,
  message: string,
  context?: Record<string, unknown>
): void {
  if (!logger?.warn) return
  try {
    logger.warn(message, context)
  } catch {
    // Swallow: a throwing logger must never break the refresh control
    // flow. See standard-sdk-dx.md §11bis.2 (defensive programming —
    // SDK loggers are no-op safe by contract).
  }
}

/**
 * @internal
 *
 * Options accepted by {@link createRefreshHelper}.
 *
 * - `credentials` propagates the client's credentials mode (default
 *   `'include'`) to the refresh `fetch`. Required for cookie-based refresh
 *   schemes (httpOnly refresh token in a cookie) — without it the cookie
 *   is never sent and refresh always 401s.
 * - `logger` surfaces failure paths (network error, breaker trip, logout
 *   race) so operators can debug production refresh failures instead of
 *   silently logging users out.
 */
export type CreateRefreshHelperOptions = {
  credentials?: RequestCredentials
  logger?: ClientLogger
}

/**
 * @internal
 *
 * Build a refresh helper bound to a specific config / token store.
 */
export function createRefreshHelper(
  refresh: RefreshConfig | undefined,
  tokenStore: TokenStore | undefined,
  options: CreateRefreshHelperOptions = {}
): RefreshHelper {
  const credentials = options.credentials ?? 'include'
  const logger = options.logger
  let inflight: Promise<string | null> | null = null

  async function doRefresh(signal?: AbortSignal): Promise<string | null> {
    if (!refresh || !tokenStore?.getRefreshToken) return null

    // Circuit breaker — refuse further attempts if recent failures
    // crossed the threshold within the rolling window.
    if (isBreakerOpen()) {
      safeWarn(logger, '[api-sdk] refresh circuit breaker open — refusing further attempts', {
        endpoint: refresh.endpoint,
        consecutiveFailures: refreshBreaker.consecutiveFailures,
      })
      return null
    }

    const rt = await tokenStore.getRefreshToken()
    if (!rt) return null

    const buildBody = refresh.buildBody ?? defaultBuildBody
    const parseResponse = refresh.parseResponse ?? defaultParseResponse

    // Snapshot the logout epoch BEFORE the network round-trip so we can
    // detect a logout that happens during the refresh.
    const epochAtStart = logoutEpoch

    let res: Response
    try {
      res = await fetch(refresh.endpoint, {
        method: 'POST',
        // CRIT-1: propagate credentials so cookie-based refresh works.
        credentials,
        // CRIT-1: propagate the caller's AbortSignal so a logout/navigate
        // away cancels the in-flight refresh instead of letting it complete
        // and silently re-hydrate tokens.
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(rt)),
      })
    } catch (err) {
      // CRIT-1 × CRIT-3 interaction: a navigation-triggered abort must NOT
      // trip the breaker (otherwise 3 user navigations during refresh = 60s
      // self-DoS). Same carve-out as the logout-race branch below: abort ≠
      // refresh failure.
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        safeWarn(logger, '[api-sdk] refresh aborted by caller signal', {
          endpoint: refresh.endpoint,
        })
        return null
      }
      const message = err instanceof Error ? err.message : 'network error'
      safeWarn(logger, '[api-sdk] refresh fetch threw', {
        endpoint: refresh.endpoint,
        error: message,
      })
      if (recordRefreshFailure()) {
        safeWarn(
          logger,
          '[api-sdk] refresh circuit breaker TRIPPED — 3 consecutive failures within 60s',
          { endpoint: refresh.endpoint }
        )
      }
      return null
    }

    if (!res.ok) {
      safeWarn(logger, '[api-sdk] refresh returned non-OK status', {
        endpoint: refresh.endpoint,
        status: res.status,
      })
      if (recordRefreshFailure()) {
        safeWarn(
          logger,
          '[api-sdk] refresh circuit breaker TRIPPED — 3 consecutive failures within 60s',
          { endpoint: refresh.endpoint }
        )
      }
      return null
    }

    let body: unknown
    try {
      body = await res.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'JSON parse error'
      safeWarn(logger, '[api-sdk] refresh response body parse failed', {
        endpoint: refresh.endpoint,
        error: message,
      })
      if (recordRefreshFailure()) {
        safeWarn(
          logger,
          '[api-sdk] refresh circuit breaker TRIPPED — 3 consecutive failures within 60s',
          { endpoint: refresh.endpoint }
        )
      }
      return null
    }

    const tokens = parseResponse(body)
    if (!tokens) {
      safeWarn(logger, '[api-sdk] refresh response did not contain valid tokens', {
        endpoint: refresh.endpoint,
      })
      if (recordRefreshFailure()) {
        safeWarn(
          logger,
          '[api-sdk] refresh circuit breaker TRIPPED — 3 consecutive failures within 60s',
          { endpoint: refresh.endpoint }
        )
      }
      return null
    }

    // CRIT-2: user logged out during the refresh round-trip — discard the
    // fresh tokens instead of silently re-logging them in.
    if (logoutEpoch !== epochAtStart) {
      safeWarn(logger, '[api-sdk] refresh completed after logout — tokens discarded', {
        endpoint: refresh.endpoint,
      })
      // Logout-race is NOT a refresh failure — don't trip the breaker.
      return null
    }

    if (tokenStore.setTokens) {
      try {
        await tokenStore.setTokens(tokens)
      } catch (err) {
        // best-effort; still return the access token
        const message = err instanceof Error ? err.message : 'setTokens threw'
        safeWarn(logger, '[api-sdk] refresh setTokens threw — token persistence skipped', {
          endpoint: refresh.endpoint,
          error: message,
        })
      }
    }

    recordRefreshSuccess()
    return tokens.accessToken
  }

  return {
    refresh(opts: RefreshOptions = {}): Promise<string | null> {
      if (inflight) return inflight
      inflight = doRefresh(opts.signal).finally(() => {
        inflight = null
      })
      return inflight
    },
    reset(): void {
      inflight = null
    },
  }
}
