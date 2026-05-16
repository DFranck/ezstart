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
 * ## Coalesce semantics (live vs test asymmetry)
 *
 * Live mode coalesces `undefined` as live (backward compat for pre-V2 docs
 * that predate the `isTestMode` column). New docs default to `false` via the
 * schema, but legacy data may still lack the field entirely until a backfill
 * migration has run. Treating `undefined` as live keeps API behaviour
 * invariant across the migration window.
 *
 * Test mode is strict — `isTestMode: true` ONLY. Test data is an explicit
 * opt-in (created against test keys / seeded by tests), never accidental.
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
 * ## Methods NOT auto-scoped (caller responsibility — L3 / L4 hardening 2026-05-16)
 *
 * The following Mongoose operations are INTENTIONALLY left unscoped — their
 * shapes are too varied (aggregation pipelines) or too destructive
 * (`deleteOne`/`deleteMany`/`bulkWrite`) for a blanket auto-injection to be
 * safe. Callers MUST add an explicit `isTestMode` filter when test/live
 * isolation matters:
 *
 *   - **`aggregate(pipeline)`** — pipelines have many shapes, and a `$match`
 *     injection at the top of a pipeline can subtly change grouping /
 *     `$facet` / `$lookup` semantics. Add `{ $match: { isTestMode: ... } }`
 *     as the FIRST pipeline element (or use a cross-mode opt-out for
 *     analytics that legitimately span both partitions).
 *
 *   - **`deleteOne(filter)` / `deleteMany(filter)`** — destructive operations
 *     where a missing scope can wipe live data from a test-key request (or
 *     vice versa). The plugin refuses to silently inject a filter here
 *     because a wrong scope inferred from request context could be worse
 *     than no filter at all (e.g. cron deletes that run outside any request
 *     frame). Add `{ isTestMode: getRequestMode() === 'test' }` to the
 *     filter explicitly when the operation runs under a request context.
 *
 *   - **`bulkWrite(ops)`** — heterogeneous operations array; each entry
 *     needs its own filter. Apply per-op scoping.
 *
 * **Misuse example**:
 * ```ts
 * // ❌ DANGEROUS — a live-key request that hits this path with an attacker-
 * // controlled `userId` could wipe that user's TEST data (or vice versa)
 * // because no mode filter is auto-injected.
 * await Model.deleteMany({ userId: req.params.userId })
 *
 * // ✅ SAFE — explicit mode filter matches the auto-scoping the plugin
 * // would have applied on `findOne`/`updateMany`/etc.
 * import { getRequestContext } from '@ezstart/api-core'
 * const mode = getRequestContext()?.derivedMode
 * await Model.deleteMany({ userId: req.params.userId, isTestMode: mode === 'test' })
 * ```
 *
 * See `.claude/rules/standard-saas-data.md` §4 for the test/live isolation
 * contract this plugin enforces (and where it deliberately defers to the
 * caller).
 *
 * ## Generic by design
 *
 * This plugin is a pure-plumbing primitive for any SaaS service that follows
 * the Stripe test/live partition. It depends only on `getRequestContext()`
 * (an AsyncLocalStorage frame populated by `withRequestContextMiddleware`)
 * and a Mongoose `Schema` with an `isTestMode` path — no app coupling.
 *
 * @module @ezstart/api-core/middleware/test-mode-scope
 */

import type { Query, Schema } from 'mongoose'
import { getRequestContext } from '../context/request-context.js'

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

  // Live mode coalesces `undefined` as live (backward compat for pre-V2 docs
  // that predate the `isTestMode` column). New docs default to `false` via
  // the schema, but legacy data may still lack the field entirely until the
  // backfill migration has run on every environment. Treating undefined as
  // live keeps the API behaviour invariant across the migration window.
  //
  // Test mode is strict — `isTestMode: true` ONLY. Test data is an explicit
  // opt-in (created against test keys / seeded by tests), never undefined.
  if (ctx.derivedMode === 'test') {
    this.where({ isTestMode: true })
  } else {
    this.where({ $or: [{ isTestMode: false }, { isTestMode: { $exists: false } }] })
  }
  next()
}

/**
 * Mongoose plugin function. Apply with `schema.plugin(testModeScopePlugin)`
 * inside each model factory, BEFORE the `mongoose.model(...)` call.
 *
 * No-op for schemas that do not declare an `isTestMode` path — safe to apply
 * unconditionally if you ever want to wire a global plugin (we currently
 * apply per-model for explicitness).
 *
 * ## Auto-scoped operations
 *
 * Hooked: `find`, `findOne`, `findOneAndUpdate`, `findOneAndDelete`,
 * `findOneAndReplace`, `countDocuments`, `distinct`, `updateOne`, `updateMany`.
 *
 * ## NOT auto-scoped (caller responsibility)
 *
 * `aggregate()`, `deleteOne()`, `deleteMany()`, `bulkWrite()` — see the
 * module docstring for the rationale and the safe usage pattern. Misuse can
 * cause cross-mode data destruction (live key wiping test data, or vice
 * versa). Always pair these with an explicit `isTestMode` filter when the
 * operation runs under a request context.
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
  // L3 / L4 (2026-05-16): `deleteOne` / `deleteMany` / `aggregate` /
  // `bulkWrite` are intentionally NOT auto-scoped. Pipelines are too varied
  // for a blanket `$match` injection (changes grouping / `$facet` /
  // `$lookup` semantics), and destructive deletes refuse to inherit a
  // request-derived mode silently because a wrong scope could be worse than
  // none (e.g. cron-driven cleanup runs outside any request frame).
  // See the module docstring for the safe-usage pattern.
}
