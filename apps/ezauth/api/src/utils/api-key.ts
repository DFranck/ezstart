import { randomBytes, createHash } from 'crypto'

const RAW_KEY_LENGTH = 32

/** Key prefix by scope. */
const SCOPE_PREFIX = {
  test: 'ezk_test_',
  live: 'ezk_live_',
  admin: 'ezk_admin_',
} as const

export type ApiKeyScope = 'test' | 'live' | 'admin'

/** Generate a raw API key with scope-based prefix + 32 hex chars. */
export function generateRawApiKey(scope: ApiKeyScope = 'live'): string {
  const hex = randomBytes(RAW_KEY_LENGTH).toString('hex')
  return `${SCOPE_PREFIX[scope]}${hex}`
}

/** Hash an API key with SHA-256 for storage. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/** Extract a display prefix from a raw API key (first 12 chars). */
export function extractKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 12)
}
