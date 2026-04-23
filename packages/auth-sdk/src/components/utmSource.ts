'use client'

/**
 * UTM source reader — shared between SignUpForm and QuickSignUpForm.
 *
 * Marketing attribution: the landing page / router middleware persists the
 * `utm_source` query param into localStorage. On signup, we forward it to
 * the backend so it can be stored on the user alongside `promoCode`.
 *
 * @internal
 */

/** Max length of utm_source the backend accepts (mirrors API contract). */
export const UTM_SOURCE_MAX_LENGTH = 128

/**
 * localStorage key used by the landing page / router to persist the
 * `utm_source` query param. Kept here so both the reader and any
 * downstream writer share a single source of truth.
 */
export const UTM_SOURCE_STORAGE_KEY = 'utm_source'

/**
 * Read the `utm_source` attribution value persisted in localStorage by the
 * landing page / router. Returns `undefined` when missing, empty, SSR, or
 * storage is inaccessible (private browsing, storage quota, disabled).
 *
 * The value is trimmed and capped at {@link UTM_SOURCE_MAX_LENGTH} chars so
 * a malformed or oversized value never reaches the backend — the API
 * schema enforces the same limit as a defence in depth.
 */
export function readUtmSource(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(UTM_SOURCE_STORAGE_KEY)
    if (typeof raw !== 'string') return undefined
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, UTM_SOURCE_MAX_LENGTH)
  } catch {
    return undefined
  }
}
