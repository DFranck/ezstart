/**
 * Internal helpers for {@link StatusPage}: fires a single check against a
 * {@link StatusService} (shallow or deep) and returns a normalized
 * {@link CheckOutcome}. Extracted into its own file to keep
 * `status-page.tsx` under the 400-line limit (cf.
 * `.claude/rules/standard.md` §3).
 *
 * @internal
 */

import type { StatusDependency, StatusService, StatusServiceState } from './status-page-types'

export interface CheckOutcome {
  state: StatusServiceState
  responseTimeMs: number | null
  statusCode: number | null
  error: string | null
  dependencies?: StatusDependency[]
}

/**
 * Structural shape of the JSON snapshot returned by
 * `createDeepHealthHandler` from `@ezstart/api-core`. Kept minimal and
 * permissive so the UI package stays decoupled from the api-core types
 * (the snapshot can also come from a third-party deep-health endpoint
 * that loosely follows the same convention).
 */
export interface DeepHealthResponse {
  status?: 'ok' | 'degraded' | 'down'
  checks?: Record<
    string,
    {
      status?: 'ok' | 'degraded' | 'down'
      message?: string
      durationMs?: number
    }
  >
}

export function parseDeepResponse(body: unknown): StatusDependency[] | undefined {
  if (!body || typeof body !== 'object') return undefined
  const checks = (body as DeepHealthResponse).checks
  if (!checks || typeof checks !== 'object') return undefined
  const deps: StatusDependency[] = []
  for (const [name, value] of Object.entries(checks)) {
    if (!value || typeof value !== 'object') continue
    const status =
      value.status === 'ok' || value.status === 'degraded' || value.status === 'down'
        ? value.status
        : 'down'
    const dep: StatusDependency = { name, status }
    if (typeof value.message === 'string') dep.message = value.message
    if (typeof value.durationMs === 'number') dep.durationMs = value.durationMs
    deps.push(dep)
  }
  return deps
}

export function aggregateDeepState(deps: StatusDependency[]): StatusServiceState {
  if (deps.some(d => d.status === 'down')) return 'down'
  if (deps.some(d => d.status === 'degraded')) return 'degraded'
  return 'operational'
}

export async function checkOne(service: StatusService, timeoutMs: number): Promise<CheckOutcome> {
  const useDeep = service.mode === 'deep' && Boolean(service.deepUrl)
  const url = useDeep ? (service.deepUrl as string) : service.url

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    })
    const responseTimeMs = Date.now() - start
    clearTimeout(timer)

    // Deep mode — parse JSON snapshot, derive state from `checks` map. The
    // deep handler returns 503 when any dependency is `down` so we accept
    // both 200 and 503 as "the snapshot is consumable".
    if (useDeep && (response.ok || response.status === 503)) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        return {
          state: 'degraded',
          responseTimeMs,
          statusCode: response.status,
          error: 'Deep health endpoint returned non-JSON',
        }
      }
      const deps = parseDeepResponse(body) ?? []
      const state = deps.length === 0 ? 'operational' : aggregateDeepState(deps)
      const outcome: CheckOutcome = {
        state,
        responseTimeMs,
        statusCode: response.status,
        error:
          state === 'operational'
            ? null
            : (deps.find(d => d.status === 'down')?.message ??
              deps.find(d => d.status === 'degraded')?.message ??
              null),
        dependencies: deps,
      }
      return outcome
    }

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return {
        state: 'operational',
        responseTimeMs,
        statusCode: response.status,
        error: null,
      }
    }

    return {
      state: 'degraded',
      responseTimeMs,
      statusCode: response.status,
      error: `HTTP ${response.status} ${response.statusText}`,
    }
  } catch (error) {
    clearTimeout(timer)
    const responseTimeMs = Date.now() - start
    const isAbort = error instanceof Error && error.name === 'AbortError'
    const message = isAbort
      ? `Timeout after ${timeoutMs}ms`
      : error instanceof Error
        ? error.message
        : 'Network error'

    return {
      state: 'down',
      responseTimeMs: isAbort ? null : responseTimeMs,
      statusCode: null,
      error: message,
    }
  }
}
