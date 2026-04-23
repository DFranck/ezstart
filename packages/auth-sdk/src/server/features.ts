/**
 * Server-side feature gate — answers "is this feature available in the
 * current (app, user) context?"
 *
 * Designed for the **dogfood pattern** (cf. `.claude/rules/standard-saas-keys.md`
 * §3). Each @ezstart app is a consumer of its own SaaS (ezauth, ezpay, ...).
 * Platform-owned apps (flagged `isPlatformOwned=true` on their `Application`
 * document) bypass billing — the platform never pays itself for its own
 * capabilities.
 *
 * Usage on the server (Express route):
 *
 * ```ts
 * import { hasFeature } from '@ezstart/auth-sdk/server'
 *
 * router.get('/theme', verifyTokenMiddleware, async (req, res) => {
 *   const app = await Application.findById(req.applicationId).lean()
 *   if (!hasFeature({ app, user: req.user, appSlug: app.slug, feature: 'custom-theme' })) {
 *     return sendError(res, 'Upgrade to Pro to customise the theme', 402)
 *   }
 *   // ...serve the theme editor
 * })
 * ```
 *
 * The helper is pure (no IO, no framework), so it can be called from
 * middleware, route handlers, batch jobs, or unit tests. Callers are
 * responsible for fetching the `app` + `user` documents first — the helper
 * deliberately does NOT reach into the DB to keep the contract obvious.
 */

// ---------------------------------------------------------------------------
// Input contracts
// ---------------------------------------------------------------------------

/**
 * Minimal shape of an Application required to evaluate feature availability.
 *
 * Only the fields touched by the resolution logic are declared — concrete
 * callers pass a superset (e.g. the full `Application` interface or the
 * Mongoose document) and structural typing takes care of the rest.
 */
export interface HasFeatureApp {
  /** `true` for the platform operator's own apps (dogfood). */
  isPlatformOwned?: boolean
  /**
   * The plan currently attached to the app. `null` or absent means "no plan"
   * (the app falls back to whatever the Free tier grants, which is typically
   * nothing).
   */
  plan?: { grantsFeatures?: string[] } | null
}

/**
 * Minimal shape of an authenticated user.
 *
 * Both role bags (`globalRoles` for platform-wide privileges, `appRoles` for
 * per-app custom roles) are optional — anonymous requests pass `undefined` and
 * every role check short-circuits to `false`.
 */
export interface HasFeatureUser {
  /**
   * Platform-wide roles — `superadmin` short-circuits feature gates.
   */
  globalRoles?: string[]
  /**
   * App-scoped roles — indexed by app slug. The `pro` role is the conventional
   * "this user paid for the Pro plan on this app" marker.
   */
  appRoles?: Record<string, string[]>
}

/** Input payload for {@link hasFeature}. */
export interface HasFeatureInput {
  /** The Application the request targets. */
  app: HasFeatureApp | null | undefined
  /**
   * The authenticated user, or `undefined` / `null` for anonymous callers.
   * Anonymous callers can still resolve to `true` when the app is
   * platform-owned or has a plan that grants the feature — useful for
   * public endpoints gated by the tenant's plan rather than the caller's
   * identity.
   */
  user?: HasFeatureUser | null
  /** Slug of `app` — used to look up `user.appRoles[appSlug]`. */
  appSlug: string
  /** The feature being checked (free-form string). */
  feature: string
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Resolve feature availability in the following priority order:
 *
 * 1. **Platform-owned app** (`app.isPlatformOwned === true`) → `true`.
 *    Dogfood: the platform never pays itself.
 * 2. **Superadmin** (`user.globalRoles` includes `'superadmin'`) → `true`.
 *    Cross-cutting: support / on-call need every feature to debug prod.
 * 3. **Plan grants feature** (`app.plan.grantsFeatures` includes `feature`)
 *    → `true`. Normal billing path.
 * 4. **User has `'pro'` role for this app** → `true`. Lets admins grant Pro
 *    access to individual users without changing the app-wide Plan (useful
 *    for beta testers, free-for-life accounts, grandfathered users).
 * 5. **Otherwise** → `false`.
 *
 * Each branch is cheap (in-memory array lookups); the function is meant to
 * be called on every request without caching.
 *
 * @example
 * ```ts
 * hasFeature({
 *   app: { isPlatformOwned: true },
 *   appSlug: 'ezstart',
 *   feature: 'custom-theme',
 * })
 * // → true (dogfood)
 *
 * hasFeature({
 *   app: { plan: { grantsFeatures: ['custom-theme'] } },
 *   user: { globalRoles: [] },
 *   appSlug: 'acme',
 *   feature: 'custom-theme',
 * })
 * // → true (plan grants it)
 *
 * hasFeature({
 *   app: { plan: { grantsFeatures: [] } },
 *   user: { appRoles: { acme: ['pro'] } },
 *   appSlug: 'acme',
 *   feature: 'custom-theme',
 * })
 * // → true (user's pro role)
 * ```
 */
export function hasFeature(input: HasFeatureInput): boolean {
  const { app, user, appSlug, feature } = input

  // 1. Platform-owned apps short-circuit: dogfood bypass.
  if (app?.isPlatformOwned === true) return true

  // 2. Superadmin bypass — global observers / support.
  if (user?.globalRoles?.includes('superadmin') === true) return true

  // 3. App's Plan explicitly grants the feature.
  if (app?.plan?.grantsFeatures?.includes(feature) === true) return true

  // 4. User has a per-app `pro` role — grandfathered / beta / complimentary
  //    accounts.
  if (user?.appRoles?.[appSlug]?.includes('pro') === true) return true

  // 5. Default: feature is NOT available.
  return false
}
