import { randomBytes, createHash } from 'crypto'

const API_KEY_PREFIX = 'ezk_'
const RAW_KEY_LENGTH = 32

/** Generate a raw API key with `ezk_` prefix + 32 hex chars. */
export function generateRawApiKey(): string {
  const hex = randomBytes(RAW_KEY_LENGTH).toString('hex')
  return `${API_KEY_PREFIX}${hex}`
}

/** Hash an API key with SHA-256 for storage. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/** Extract a display prefix from a raw API key (first 12 chars). */
export function extractKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 12)
}
