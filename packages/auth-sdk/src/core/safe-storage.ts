/**
 * Defensive `localStorage` access helpers — agnostic, zero React, zero
 * `@ezstart/*` runtime dependency.
 *
 * **Why this exists** — every `localStorage` call can throw:
 * - Safari private mode rejects `setItem` with `QuotaExceededError`, and in
 *   some versions `getItem`/`removeItem` throw too.
 * - Storage disabled by browser policy / enterprise lockdown.
 * - Quota exceeded.
 * - SSR / agent harness environments where `window.localStorage` is absent.
 *
 * A storage failure must NEVER abort an auth flow (login redirect, callback
 * exchange, logout cleanup) — the persisted value is always a best-effort
 * hint, never the source of truth. These helpers swallow the throw, return a
 * safe fallback, and optionally surface a `warn` through a caller-injected
 * logger (silent no-op by default to keep the core agnostic).
 *
 * @module
 */

/**
 * Minimal logger contract — mirrors {@link CrossOriginLogger}. Only `warn`
 * is needed; pass `undefined` (or omit) for a silent no-op so the agnostic
 * core never couples to `@ezstart/logger`.
 */
export interface SafeStorageLogger {
  warn?: (message: string, ...args: unknown[]) => void
}

/**
 * Read a value from `localStorage` without ever throwing.
 *
 * Returns `null` when missing, server-side, or storage is inaccessible
 * (private mode / disabled / throwing). Callers treat `null` as "no stored
 * value" — typically falling back to a default — so the auth flow always
 * proceeds.
 *
 * @example
 * ```ts
 * const savedRedirect = safeGetLocalStorage('ezauth_redirect_after_login')
 * const finalRedirect = savedRedirect ?? redirectTo
 * ```
 */
export function safeGetLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Storage disabled / private mode — treat as absent. The auth flow
    // proceeds with its default fallback.
    return null
  }
}

/**
 * Write a value to `localStorage` without ever throwing.
 *
 * `setItem` throws in Safari private mode (`QuotaExceededError`), when storage
 * is disabled, or when the quota is full. The write is always best-effort, so
 * a failure must not abort the calling flow. On failure we surface a `warn`
 * through the injected logger (silent no-op by default) and continue.
 *
 * @example
 * ```ts
 * safeSetLocalStorage('ezauth_redirect_after_login', currentUrl, log)
 * ```
 */
export function safeSetLocalStorage(key: string, value: string, logger?: SafeStorageLogger): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch (err) {
    logger?.warn?.(
      `[auth-sdk] could not persist localStorage key "${key}"`,
      err instanceof Error ? err.message : String(err)
    )
  }
}

/**
 * Remove a key from `localStorage` without ever throwing.
 *
 * Used during logout cleanup and post-login redirect consumption. A removal
 * failure is non-fatal — the in-memory store reset is the source of truth.
 *
 * @example
 * ```ts
 * safeRemoveLocalStorage('ezauth_redirect_after_login')
 * ```
 */
export function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage disabled / quota exceeded / private mode — non-fatal.
  }
}
