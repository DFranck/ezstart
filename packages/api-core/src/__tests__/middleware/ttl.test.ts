/**
 * Unit tests for `ttlPlugin` (Mongoose TTL index plugin).
 *
 * The plugin is a pure synchronous function: it calls `schema.index(...)` with
 * the TTL options derived from its arguments. We assert against `schema.indexes()`
 * (Mongoose's declared-index introspection) — no MongoMemoryServer required.
 *
 * A real Mongo TTL monitor runs every ~60 s and is impractical to test in unit
 * scope; the contract we ship is "the index is declared correctly so Mongo will
 * honor it". That is exactly what these tests verify.
 *
 * @module @ezstart/api-core/__tests__/middleware/ttl
 */

import mongoose, { Schema } from 'mongoose'
import { describe, expect, it } from 'vitest'

import { ttlPlugin, type TTLPluginOptions } from '../../core/middleware/ttl.js'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

interface IndexSpec {
  /** Field map produced by `schema.index({...}, opts)` — `{ field: 1 }` etc. */
  fields: Record<string, number | string>
  /** Index options merged with the field map. */
  options: Record<string, unknown>
}

/**
 * Build a fresh schema with the given timestamp shape, apply the plugin, and
 * return the declared indexes in a deterministic format.
 *
 * `bufferCommands: false` mirrors the monorepo convention (`mongodb.md` §1).
 */
function buildSchemaWithPlugin(
  options: TTLPluginOptions,
  schemaFields: Record<string, unknown> = { createdAt: Date, name: String }
): IndexSpec[] {
  const schema = new Schema(schemaFields, { bufferCommands: false })
  schema.plugin(ttlPlugin, options)
  // Mongoose's `schema.indexes()` returns `[fields, options]` tuples for every
  // declared compound/secondary index (NOT including the implicit `_id` index).
  return schema.indexes().map(([fields, opts]) => ({
    fields: fields as Record<string, number | string>,
    options: (opts ?? {}) as Record<string, unknown>,
  }))
}

/** Find the single TTL index produced by the plugin (asserts exactly one). */
function findTtlIndex(indexes: IndexSpec[]): IndexSpec {
  // The plugin contributes one index; helpers like `expires: ...` on a field
  // would create extras, but our buildSchemaWithPlugin keeps fields plain.
  expect(indexes).toHaveLength(1)
  return indexes[0]
}

/* -------------------------------------------------------------------------- */
/* Suites                                                                     */
/* -------------------------------------------------------------------------- */

describe('ttlPlugin', () => {
  describe('defaults', () => {
    it('uses `createdAt` as the default field', () => {
      const indexes = buildSchemaWithPlugin({ ttlSeconds: 3600 })
      const ttl = findTtlIndex(indexes)
      expect(ttl.fields).toEqual({ createdAt: 1 })
    })

    it('sets `expireAfterSeconds` equal to the provided `ttlSeconds`', () => {
      const indexes = buildSchemaWithPlugin({ ttlSeconds: 3600 })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.expireAfterSeconds).toBe(3600)
    })

    it('auto-generates the index name as `ttl_<field>_<ttlSeconds>s` (no partial)', () => {
      const indexes = buildSchemaWithPlugin({ ttlSeconds: 3600 })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('ttl_createdAt_3600s')
    })

    it('does NOT set `partialFilterExpression` when no partial filter is provided', () => {
      const indexes = buildSchemaWithPlugin({ ttlSeconds: 3600 })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options).not.toHaveProperty('partialFilterExpression')
    })
  })

  describe('custom field', () => {
    it('indexes the supplied custom field instead of `createdAt`', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 604800, field: 'expiresAt' },
        { expiresAt: Date, name: String }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.fields).toEqual({ expiresAt: 1 })
    })

    it('embeds the custom field name in the auto-generated index name', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 604800, field: 'expiresAt' },
        { expiresAt: Date, name: String }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('ttl_expiresAt_604800s')
    })

    it('still emits the correct `expireAfterSeconds` for a custom field', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 86400, field: 'lastUsedAt' },
        { lastUsedAt: Date }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.expireAfterSeconds).toBe(86400)
    })
  })

  describe('partial filter', () => {
    it('injects `partialFilterExpression` verbatim when a partial filter is provided', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 86400, partialFilter: { isTestMode: true } },
        { createdAt: Date, isTestMode: Boolean }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.partialFilterExpression).toEqual({ isTestMode: true })
    })

    it('suffixes the auto-generated index name with `_partial` when a partial filter is provided', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 86400, partialFilter: { isTestMode: true } },
        { createdAt: Date, isTestMode: Boolean }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('ttl_createdAt_86400s_partial')
    })

    it('keeps a multi-key partial filter intact (status + isTestMode)', () => {
      const partialFilter = { status: 'consumed', isTestMode: true }
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 3600, partialFilter },
        { createdAt: Date, status: String, isTestMode: Boolean }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.partialFilterExpression).toEqual(partialFilter)
    })

    it('treats an empty-object partial filter as "present" (suffixes `_partial`)', () => {
      // Edge case: passing `{}` is unusual but technically `partialFilter !== undefined`,
      // so the plugin must honor it. Mongo will reject this at index-build time, which
      // is the consumer's responsibility — the plugin behaviour stays predictable.
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 3600, partialFilter: {} },
        { createdAt: Date }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('ttl_createdAt_3600s_partial')
      expect(ttl.options.partialFilterExpression).toEqual({})
    })

    it('combines custom field + partial filter in the auto-generated name', () => {
      const indexes = buildSchemaWithPlugin(
        {
          ttlSeconds: 1800,
          field: 'expiresAt',
          partialFilter: { isTestMode: true },
        },
        { expiresAt: Date, isTestMode: Boolean }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('ttl_expiresAt_1800s_partial')
    })
  })

  describe('explicit indexName override', () => {
    it('uses `indexName` verbatim instead of the auto-generated name', () => {
      const indexes = buildSchemaWithPlugin({
        ttlSeconds: 3600,
        indexName: 'custom_ttl_name',
      })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('custom_ttl_name')
    })

    it('respects `indexName` even when a partial filter would normally append `_partial`', () => {
      const indexes = buildSchemaWithPlugin(
        {
          ttlSeconds: 3600,
          partialFilter: { isTestMode: true },
          indexName: 'explicit_name_wins',
        },
        { createdAt: Date, isTestMode: Boolean }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('explicit_name_wins')
      // Partial filter still applied — only the *name* derivation is overridden.
      expect(ttl.options.partialFilterExpression).toEqual({ isTestMode: true })
    })

    it('respects `indexName` together with a custom field', () => {
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 604800, field: 'expiresAt', indexName: 'session_ttl' },
        { expiresAt: Date }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.name).toBe('session_ttl')
      expect(ttl.fields).toEqual({ expiresAt: 1 })
    })
  })

  describe('schema integration', () => {
    it('does not interfere with other indexes already declared on the schema', () => {
      const schema = new Schema(
        { createdAt: Date, applicationId: String, name: String },
        { bufferCommands: false }
      )
      // Pre-existing application index — the plugin must not remove or mutate it.
      schema.index({ applicationId: 1 }, { name: 'by_application' })

      schema.plugin(ttlPlugin, { ttlSeconds: 3600 })

      const indexes = schema.indexes()
      expect(indexes).toHaveLength(2)

      const byName = new Map(
        indexes.map(([, opts]) => [
          (opts as { name?: string }).name,
          opts as Record<string, unknown>,
        ])
      )
      expect(byName.get('by_application')).toBeDefined()
      expect(byName.get('ttl_createdAt_3600s')).toMatchObject({
        expireAfterSeconds: 3600,
      })
    })

    it('does not mutate existing schema paths (no shadow field added)', () => {
      const schema = new Schema({ createdAt: Date, label: String }, { bufferCommands: false })
      const beforePaths = Object.keys(schema.paths).sort()
      schema.plugin(ttlPlugin, { ttlSeconds: 3600 })
      const afterPaths = Object.keys(schema.paths).sort()
      expect(afterPaths).toEqual(beforePaths)
    })

    it('can be applied to two distinct schemas without cross-contamination', () => {
      const schemaA = new Schema({ createdAt: Date }, { bufferCommands: false })
      const schemaB = new Schema({ expiresAt: Date }, { bufferCommands: false })

      schemaA.plugin(ttlPlugin, { ttlSeconds: 3600 })
      schemaB.plugin(ttlPlugin, { ttlSeconds: 604800, field: 'expiresAt' })

      const [aField] = schemaA.indexes()[0]
      const [bField] = schemaB.indexes()[0]
      expect(aField).toEqual({ createdAt: 1 })
      expect(bField).toEqual({ expiresAt: 1 })

      // Each schema must have exactly its own single TTL index.
      expect(schemaA.indexes()).toHaveLength(1)
      expect(schemaB.indexes()).toHaveLength(1)
    })

    it('is compatible with model compilation (no runtime error from index declaration)', () => {
      // Compiling a model triggers index validation in Mongoose. We use a unique
      // model name per test run to avoid collisions with sibling tests.
      const modelName = `TtlPluginTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const schema = new Schema(
        { createdAt: Date, applicationId: String },
        { bufferCommands: false }
      )
      schema.plugin(ttlPlugin, { ttlSeconds: 3600, partialFilter: { applicationId: 'app-1' } })
      expect(() => mongoose.model(modelName, schema)).not.toThrow()
      // Cleanup the registered model so subsequent tests don't see it.
      mongoose.deleteModel(modelName)
    })
  })

  describe('numeric ttl edge cases', () => {
    it('honors a 1-second TTL (smallest practical positive value)', () => {
      const indexes = buildSchemaWithPlugin({ ttlSeconds: 1 })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.expireAfterSeconds).toBe(1)
      expect(ttl.options.name).toBe('ttl_createdAt_1s')
    })

    it('honors a 0-second TTL (Mongo standard: expire as soon as the field date is in the past)', () => {
      // `expireAfterSeconds: 0` is a documented Mongo pattern when the indexed
      // field already holds the target expiry instant (e.g. `expiresAt`).
      const indexes = buildSchemaWithPlugin(
        { ttlSeconds: 0, field: 'expiresAt' },
        { expiresAt: Date }
      )
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.expireAfterSeconds).toBe(0)
      expect(ttl.options.name).toBe('ttl_expiresAt_0s')
    })

    it('passes large TTL values through without coercion (e.g. 30-day retention)', () => {
      const thirtyDays = 30 * 24 * 60 * 60 // 2_592_000
      const indexes = buildSchemaWithPlugin({ ttlSeconds: thirtyDays })
      const ttl = findTtlIndex(indexes)
      expect(ttl.options.expireAfterSeconds).toBe(thirtyDays)
      expect(ttl.options.name).toBe(`ttl_createdAt_${thirtyDays}s`)
    })
  })
})
