/**
 * Mongoose module augmentation — adds the per-query escape hatches used by
 * the soft-delete / archive pre-find guards in `models/auth-user.ts` and
 * `models/application.ts`.
 *
 * Why augment instead of casting at every call site:
 *   - Keeps unsafe casts out of the codebase (cf. standard.md §2,
 *     "TypeScript strict — zero `any`, zero `as unknown`").
 *   - Surfaces the option in IntelliSense everywhere mongoose is used,
 *     making the opt-out discoverable to every developer touching DB code.
 *   - Locally scoped to the `api-ezauth` package (the augmentation only
 *     applies inside this app's tsconfig — other apps using mongoose are
 *     unaffected).
 *
 * Note: only `QueryOptions` is augmented (used by `find`, `findOne`,
 * `findById`, `countDocuments`). `MongooseUpdateQueryOptions` is a `Pick`
 * type alias derived from a fixed key list and cannot be extended via
 * declaration merging — update operations that need the opt-out should
 * arrange the data so the auto-injected filter still matches (e.g. soft-
 * delete a user via a query that targets a not-yet-deleted record).
 *
 * @internal
 */

import 'mongoose'

declare module 'mongoose' {
  interface QueryOptions {
    /**
     * Bypass the AuthUser soft-delete pre-find guard (cf. `models/auth-user.ts`).
     * When true, queries return soft-deleted users (`deletedAt != null`) too.
     * Default false.
     */
    includeDeleted?: boolean
    /**
     * Bypass the Application archive pre-find guard (cf. `models/application.ts`).
     * When true, queries return archived applications (`status === 'archived'`)
     * too. Default false.
     */
    includeArchived?: boolean
  }
}
