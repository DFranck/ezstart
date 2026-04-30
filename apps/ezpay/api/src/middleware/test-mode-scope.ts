/**
 * Mongoose plugin that auto-scopes every read query by `isTestMode` based on
 * the current request's `derivedMode` (Stripe-pattern test/live partitioning).
 *
 * Identical behaviour to the EZAuth twin (`apps/ezauth/api/src/middleware/
 * test-mode-scope.ts`). The two files are intentionally duplicated rather
 * than promoted to a shared package because the plugin must hold a stable
 * reference to the per-app `getRequestContext` symbol from `@ezstart/api-core`
 * — co-locating it with the app keeps imports trivial and avoids creating a
 * new package boundary for ~80 lines.
 *
 * See the EZAuth file for the full module docstring (opt-out, schema
 * requirement, aggregation caveats).
 *
 * @module apps/ezpay/api/src/middleware/test-mode-scope
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
 * unconditionally.
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
}
