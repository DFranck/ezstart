/**
 * Mongoose plugin that auto-scopes every read query by `isTestMode` based on
 * the current request's `derivedMode` (Stripe-pattern test/live partitioning).
 *
 * ## Behaviour
 *
 * For schemas that DECLARE an `isTestMode` field, this plugin installs a
 * `pre('find')` / `pre('findOne')` / `pre('countDocuments')` / `pre('distinct')`
 * / `pre('updateMany')` / `pre('updateOne')` / `pre('findOneAndUpdate')`
 * / `pre('findOneAndDelete')` / `pre('findOneAndReplace')` family of hooks
 * that injects `{ isTestMode: <derived> }` into the filter when:
 *
 * 1. A request context exists (`getRequestContext()` returns a value), AND
 * 2. The caller did NOT explicitly include `isTestMode` in the filter (caller
 *    knows best), AND
 * 3. The query options do NOT carry `{ skipTestModeScope: true }`.
 *
 * ## Opt-out scenarios
 *
 * Pass `{ skipTestModeScope: true }` as the query option to bypass scoping.
 * Legitimate cases:
 * - Migration / seed scripts running outside a request lifecycle (also handled
 *   by the "no context → no filter" check, but explicit is better).
 * - Superadmin "view across both modes" endpoints (rare).
 * - Cross-mode integrity checks (e.g. duplicate detection on email regardless
 *   of mode).
 *
 * ## Schema requirement
 *
 * The schema MUST have an `isTestMode` path. The plugin checks `schema.path
 * ('isTestMode')` and is a no-op when absent — safe to apply globally.
 *
 * ## Aggregations
 *
 * Aggregation pipelines are NOT auto-scoped — they have many shapes and a
 * blanket `$match` injection at the top of the pipeline can subtly change
 * grouping semantics. Callers that aggregate across `isTestMode`-scoped
 * collections MUST add their own `{ $match: { isTestMode: ... } }` stage as
 * the FIRST pipeline element (or use the explicit opt-out for cross-mode
 * analytics).
 *
 * @module apps/ezauth/api/src/middleware/test-mode-scope
 */

import { getRequestContext } from '@ezstart/api-core'
import type { Query, Schema } from 'mongoose'

/** Custom query options recognised by the plugin. */
export interface TestModeScopeOptions {
  /** Bypass the auto-injection — caller is fully responsible for the filter. */
  skipTestModeScope?: boolean
}

/**
 * True iff any clause of the filter (top-level, `$or`, `$and`, `$nor`)
 * mentions `isTestMode` — caller is being explicit, leave them alone.
 *
 * @internal
 */
function filterMentionsTestMode(filter: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(filter, 'isTestMode')) return true
  for (const op of ['$or', '$and', '$nor'] as const) {
    const arr = filter[op]
    if (Array.isArray(arr)) {
      for (const clause of arr) {
        if (
          clause &&
          typeof clause === 'object' &&
          filterMentionsTestMode(clause as Record<string, unknown>)
        ) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Build the `pre` hook closure shared by every Mongoose method we patch.
 *
 * @internal
 */
function injectTestModeFilter(this: Query<unknown, unknown>, next: (err?: Error) => void): void {
  const opts = this.getOptions() as TestModeScopeOptions
  if (opts.skipTestModeScope === true) return next()

  const ctx = getRequestContext()
  // Outside a request frame (cron, migration, boot warm-up) — no filter.
  if (!ctx?.derivedMode) return next()

  const filter = this.getFilter() as Record<string, unknown>
  if (filterMentionsTestMode(filter)) return next()

  this.where({ isTestMode: ctx.derivedMode === 'test' })
  next()
}

/**
 * Mongoose plugin function. Apply with `schema.plugin(testModeScopePlugin)`
 * inside each model factory, BEFORE the `mongoose.model(...)` call.
 *
 * No-op for schemas that do not declare an `isTestMode` path — safe to apply
 * unconditionally if you ever want to wire a global plugin (we currently
 * apply per-model for explicitness).
 */
export function testModeScopePlugin(schema: Schema): void {
  if (!schema.path('isTestMode')) return

  schema.pre('find', injectTestModeFilter)
  schema.pre('findOne', injectTestModeFilter)
  schema.pre('findOneAndUpdate', injectTestModeFilter)
  schema.pre('findOneAndDelete', injectTestModeFilter)
  schema.pre('findOneAndReplace', injectTestModeFilter)
  schema.pre('countDocuments', injectTestModeFilter)
  schema.pre('distinct', injectTestModeFilter)
  schema.pre('updateOne', injectTestModeFilter)
  schema.pre('updateMany', injectTestModeFilter)
  // NOTE: `deleteOne` / `deleteMany` / `aggregate` are intentionally NOT
  // auto-scoped — see module docstring.
}
