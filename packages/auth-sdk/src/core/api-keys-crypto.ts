/**
 * API key crypto primitives — agnostic pure functions.
 *
 * These helpers are shared between EZAuth / EZPay / any service that issues
 * or verifies `ez_(pk|sk)_(live|test)_*` keys. Zero framework coupling.
 *
 * @module @ezstart/auth-sdk/core/api-keys-crypto
 */

import { randomBytes, createHash } from 'node:crypto'

import type { ApiKeyEnv, ApiKeyScope, ApiKeyType } from '@ezstart/api-contracts'

/** Length (in bytes) of the random payload before hex-encoding. */
const RAW_KEY_LENGTH = 32

/**
 * Re-exports of the wire-level key discriminators. The canonical home for
 * these types is `@ezstart/api-contracts` — re-exporting here preserves the
 * original import path (`@ezstart/auth-sdk` → `ApiKeyType` etc.) so existing
 * call sites keep working.
 *
 * @deprecated Import from `@ezstart/api-contracts` instead.
 */
export type { ApiKeyEnv, ApiKeyScope, ApiKeyType }

/** Modern prefix map keyed by `${type}.${env}`. */
export const KEY_PREFIX: Record<`${ApiKeyType}.${ApiKeyEnv}`, string> = {
  'publishable.live': 'ez_pk_live_',
  'publishable.test': 'ez_pk_test_',
  'secret.live': 'ez_sk_live_',
  'secret.test': 'ez_sk_test_',
}

/** Legacy prefixes retained for backwards compatibility (read-only, 90-day window). */
export const LEGACY_PREFIXES = ['ezk_live_', 'ezk_test_', 'ezk_admin_'] as const

/** Result of {@link detectKeyFormat}. */
export interface KeyFormat {
  type: ApiKeyType
  env: ApiKeyEnv
  isLegacy: boolean
}

/**
 * Detect the type/env/legacy status of a raw key.
 * Returns `null` if the prefix is not recognized.
 *
 * Legacy mapping:
 * - `ezk_live_*` → publishable/live (was the default live key)
 * - `ezk_test_*` → publishable/test (was the default test key)
 * - `ezk_admin_*` → secret/live (was a cross-app superadmin key, treated as a secret key)
 *
 * @example
 * detectKeyFormat('ez_pk_live_abc123') // { type: 'publishable', env: 'live', isLegacy: false }
 */
export function detectKeyFormat(rawKey: string): KeyFormat | null {
  if (rawKey.startsWith('ez_pk_live_')) return { type: 'publishable', env: 'live', isLegacy: false }
  if (rawKey.startsWith('ez_pk_test_')) return { type: 'publishable', env: 'test', isLegacy: false }
  if (rawKey.startsWith('ez_sk_live_')) return { type: 'secret', env: 'live', isLegacy: false }
  if (rawKey.startsWith('ez_sk_test_')) return { type: 'secret', env: 'test', isLegacy: false }
  if (rawKey.startsWith('ezk_live_')) return { type: 'publishable', env: 'live', isLegacy: true }
  if (rawKey.startsWith('ezk_test_')) return { type: 'publishable', env: 'test', isLegacy: true }
  if (rawKey.startsWith('ezk_admin_')) return { type: 'secret', env: 'live', isLegacy: true }
  return null
}

/**
 * Generate a raw API key with a modern prefix followed by 64 hex chars of entropy.
 *
 * @example
 * generateRawApiKey({ type: 'publishable', env: 'live' })
 * // → 'ez_pk_live_a1b2c3...<64 hex>'
 */
export function generateRawApiKey(opts: { type: ApiKeyType; env: ApiKeyEnv }): string {
  const prefix = KEY_PREFIX[`${opts.type}.${opts.env}`]
  const hex = randomBytes(RAW_KEY_LENGTH).toString('hex')
  return `${prefix}${hex}`
}

/**
 * Hash an API key with SHA-256 for at-rest storage.
 *
 * @example
 * hashApiKey('ez_pk_live_...') // → '64-char hex digest'
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Extract a display prefix from a raw API key (prefix + first 6 hex chars).
 *
 * Lengths:
 * - `ez_pk_live_a1b2c3` / `ez_sk_test_a1b2c3` → 17 chars (modern)
 * - `ezk_live_a1b2c3` / `ezk_admin_a1b2c3` → 15 chars (legacy)
 * - Unknown formats → first 12 chars (fallback)
 */
export function extractKeyPrefix(rawKey: string): string {
  if (rawKey.startsWith('ez_pk_') || rawKey.startsWith('ez_sk_')) {
    return rawKey.substring(0, 17) // 11 (prefix) + 6 (hex)
  }
  if (rawKey.startsWith('ezk_')) {
    return rawKey.substring(0, 15) // 9 (prefix) + 6 (hex)
  }
  return rawKey.substring(0, 12) // unknown fallback
}
