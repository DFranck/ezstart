import { randomBytes, createHash } from 'crypto'

const RAW_KEY_LENGTH = 32

/**
 * API key type — determines whether the key is safe to expose client-side.
 * - `publishable` → safe in frontend/browser (prefix `ez_pk_*`)
 * - `secret` → server-only, never exposed (prefix `ez_sk_*`)
 */
export type ApiKeyType = 'publishable' | 'secret'

/**
 * API key environment — separates production keys from sandbox/test keys.
 */
export type ApiKeyEnv = 'live' | 'test'

/**
 * API key permission scope — metadata only, NEVER embedded in the prefix.
 */
export type ApiKeyScope = 'admin' | 'user' | 'readonly'

/** Modern prefix map keyed by `${type}.${env}`. */
const KEY_PREFIX: Record<`${ApiKeyType}.${ApiKeyEnv}`, string> = {
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

/** Hash an API key with SHA-256 for at-rest storage. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Extract a display prefix from a raw API key (prefix + first 6 hex chars).
 * Examples:
 * - `ez_pk_live_a1b2c3` (17 chars, modern format)
 * - `ezk_live_a1b2c3` (15 chars, legacy format)
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
