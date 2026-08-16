/**
 * Generic Mongoose TTL plugin.
 *
 * Installs a MongoDB TTL index on a date field so documents are automatically
 * deleted after `ttlSeconds`. Works in any environment (dev, staging, prod,
 * sandbox) for any use case — session tokens, magic links, OTPs, sandbox data,
 * temp uploads, etc.
 *
 * ## Usage
 *
 * ```ts
 * import { ttlPlugin } from '@ezstart/api-core'
 *
 * // All documents expire after 1 hour
 * magicLinkSchema.plugin(ttlPlugin, { ttlSeconds: 3600 })
 *
 * // Only test-mode documents expire after 24h (sandbox isolation)
 * paymentSchema.plugin(ttlPlugin, {
 *   ttlSeconds: 86400,
 *   partialFilter: { isTestMode: true },
 * })
 *
 * // Custom field (default is 'createdAt')
 * sessionSchema.plugin(ttlPlugin, { ttlSeconds: 604800, field: 'expiresAt' })
 * ```
 *
 * @module @ezstart/api-core/middleware/ttl
 */

import type { Schema } from 'mongoose'

export interface TTLPluginOptions {
  /** Seconds after `field` before the document is deleted. */
  ttlSeconds: number
  /**
   * Date field to index.
   * @default 'createdAt'
   */
  field?: string
  /**
   * Optional MongoDB partial filter expression — only matching documents are
   * subject to TTL deletion.
   *
   * @example { isTestMode: true }  // sandbox isolation: only purge test docs
   * @example { status: 'consumed' }  // only purge already-consumed tokens
   */
  partialFilter?: Record<string, unknown>
  /**
   * Explicit index name. Auto-generated when omitted:
   * `ttl_<field>_<ttlSeconds>s[_partial]`
   */
  indexName?: string
}

/**
 * Mongoose plugin that installs a MongoDB TTL index on a date field.
 *
 * Apply with `schema.plugin(ttlPlugin, { ttlSeconds: 3600 })`.
 */
export function ttlPlugin(schema: Schema, options: TTLPluginOptions): void {
  const field = options.field ?? 'createdAt'
  const hasPartial = options.partialFilter !== undefined

  const name =
    options.indexName ?? `ttl_${field}_${options.ttlSeconds}s${hasPartial ? '_partial' : ''}`

  const indexOptions: Record<string, unknown> = {
    name,
    expireAfterSeconds: options.ttlSeconds,
  }

  if (hasPartial) {
    indexOptions.partialFilterExpression = options.partialFilter
  }

  schema.index({ [field]: 1 }, indexOptions)
}
