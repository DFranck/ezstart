import { randomBytes } from 'crypto'
import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model, type Query } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

/**
 * Application lifecycle status.
 *
 * - `active` — default, visible in listings, keys can be created against it.
 * - `archived` — soft-deleted, hidden from default listings, keys revoked (or
 *   blocked unless `?cascade=true` was used at archive time).
 */
export type ApplicationStatus = 'active' | 'archived'

/**
 * White-label theme tokens persisted on the Application document.
 *
 * All fields are OPTIONAL — an application can override as few or as many
 * design tokens as it wants. Unset tokens inherit the default EZAuth theme
 * (or the CSS preset for `data-app="<slug>"` when one exists).
 *
 * Values are expected to be valid CSS color strings. Both OKLCH
 * (`oklch(0.7 0.15 210)`) and hex (`#00D9F7`) formats are accepted — the
 * browser parses them identically when injected as `--primary: <value>`.
 *
 * `logo` is a URL to the tenant's logo asset (future feature, not rendered
 * yet by the current SSR layout — reserved for THEME-LOGO-UPLOAD-001).
 */
export interface ApplicationTheme {
  primary?: string
  background?: string
  foreground?: string
  accent?: string
  logo?: string
}

/**
 * Mongoose document for a multi-tenant Application entity.
 *
 * Applications live in the EZAuth database and are the source-of-truth for
 * cross-service tenant identity. Each API key (in ezauth, ezpay, or any
 * future service) references an `applicationId`, scoping the key to a
 * specific tenant.
 *
 * The `slug` is the stable, URL-safe identifier shared across services.
 * It must be lowercase, match `/^[a-z0-9-]{2,32}$/`, and is globally unique.
 *
 * `ownerId` references `auth_users._id` (stringified). Special value
 * `'system'` is used for apps created by seed scripts.
 *
 * `createdBy` is either a userId string OR a system tag such as
 * `'system-seed'` or `'migration-P6'` — useful for idempotent bootstrap
 * scripts and data provenance audits.
 *
 * `theme` + `themeEnabled` back the white-label feature (EZAuth Pro). The
 * UI for editing the theme is always shown in the dashboard, but
 * `themeEnabled` is gated at activation time (require a Pro subscription
 * via billing — see `subscription-event.ts`). When disabled, the theme is
 * stored but NOT applied by SSR — the app falls back to the default CSS
 * preset for `data-app="<slug>"`.
 */
export interface ApplicationDocument extends Document {
  slug: string
  name: string
  description?: string
  ownerId: string
  metadata?: Record<string, unknown>
  createdBy?: string
  status: ApplicationStatus
  theme?: ApplicationTheme
  themeEnabled: boolean
  /**
   * Marks an Application as platform-owned (dogfood).
   *
   * `true` → owned by EzStart LLC itself. Pro/paid features bypass the billing
   * plan check when evaluated through {@link hasFeature} — the platform never
   * needs to pay itself for its own capabilities. Toggled ON by the
   * `seed:platform-owned` script for each of the 8 EzStart-owned apps
   * (ezauth, ezpay, ezstart, ezbill, green-pulse, fengshui, asc-tcd,
   * gacha-analyzer).
   *
   * `false` (default) → regular tenant. Feature availability is driven by the
   * app's Plan (`grantsFeatures[]`) or the user's app role (`pro` role).
   *
   * This flag is intentionally NOT exposed via the self-service dashboard. It
   * can only be flipped by a superadmin (future: API route + UI) or by the
   * seed script. Persisted on the Application so cross-service checks (EZPay,
   * future services) can read it without a secondary lookup.
   */
  isPlatformOwned: boolean
  /**
   * Composable email-verification gate (Clerk / Vercel pattern).
   *
   * `false` (default) → login stays open, consumers selectively gate critical
   * features client-side via `<RequireEmailVerified>` or server-side via the
   * `requireEmailVerified` Express middleware. Recommended for most apps.
   *
   * `true` → consumer opts-in to a global gate. Reserved for tenant-level
   * enforcement; does not block login itself, but signals to consumers that
   * the tenant requires verified emails for any meaningful API call.
   *
   * Persisted on the Application so cross-service code (EZPay, future
   * services) can read it without a secondary lookup.
   */
  requireEmailVerification: boolean
  /**
   * Stripe-pattern test/live partition (see `standard-saas-data.md` §4).
   *
   * `false` (default) → live record, visible to live API keys (`ez_pk_live_*`,
   * `ez_sk_live_*`) and to cookie-auth dashboard requests.
   * `true` → test record, visible only to test API keys
   * (`ez_pk_test_*`, `ez_sk_test_*`).
   *
   * Auto-injected on read by the per-app `testModeScopePlugin` Mongoose hook,
   * which inspects `req.derivedMode` (propagated via `AsyncLocalStorage`).
   * Writes MUST set this field explicitly — handlers read `req.derivedMode`
   * and assign accordingly. The field is indexed for the inevitable
   * `{ applicationId, isTestMode }` lookups.
   */
  isTestMode: boolean
  /**
   * Per-Application HMAC-SHA256 webhook secret (Stripe `whsec_*` pattern).
   *
   * Auto-generated on document creation as `whsec_<64-hex>` and used by
   * cross-service senders (currently EZPay → EZAuth subscription webhook) to
   * sign payloads. The signature is verified server-side by the webhook
   * receiver — see `routes/subscriptions/webhook.ts`.
   *
   * `select: false` — Mongoose excludes the field from default `find()` /
   * `findById()` projections. Routes that need the value MUST opt-in with
   * `.select('+webhookSecret')`. This treat-as-secret default keeps the value
   * out of any API response that simply forwards the document shape.
   *
   * Rotation: a new secret can be generated via the dashboard
   * (`POST /api/applications/:id/regenerate-webhook-secret`). The old value
   * is overwritten in-place — there is no grace period. Consumers MUST
   * update their signing key immediately after rotation.
   *
   * Backfill: existing Applications created before this field was introduced
   * receive a secret via `pnpm --filter api-ezauth seed:webhook-secrets`.
   */
  webhookSecret: string
  /**
   * Optional override for the URL where outbound webhooks are delivered.
   *
   * When `null` (default) the sender uses a service-specific default — for
   * example `notifyEzauthSubscription()` falls back to
   * `${getApiUrl('ezauth')}/api/subscriptions/webhook`. Setting an explicit
   * URL allows the consumer to host their own receiver and route ezpay
   * notifications there instead of the canonical ezauth endpoint. Reserved
   * for future external consumers.
   */
  webhookEndpointUrl: string | null
  /**
   * Marks an Application as a platform-internal reserved slug (e.g. the
   * `_docs-demo` sandbox). Toggled ON by seed scripts; the
   * route layer additionally enforces that only superadmins can create
   * `_*` slugs (see `routes/applications/create.ts`). Reserved Apps are
   * exempt from billing flows and may carry hard usage quotas (see
   * {@link ApplicationDocument.quotas}).
   *
   * `false` (default) → regular tenant Application.
   */
  reservedSlug?: boolean
  /**
   * Optional hard quotas used by sandbox Applications (typically the
   * `_docs-demo` sandbox powering /docs/components live previews). When set,
   * the demo-quotas middleware enforces `maxUsers` (signup gate) and
   * `maxEventsPerDay` (auth event gate) and returns 429 when exceeded.
   *
   * Regular tenant Applications leave this `null` (or undefined) — quota
   * enforcement is plan-driven for them, not per-Application.
   */
  quotas?: {
    /** Hard cap on `apps: ['<slug>']` AuthUser count. 0 = unlimited. */
    maxUsers?: number
    /** Hard cap on audit log entries scoped to this app over a 24h window. */
    maxEventsPerDay?: number
  } | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Generate a fresh webhook secret in Stripe `whsec_<hex>` format.
 *
 * 32 random bytes → 64 hex chars → 256 bits of entropy. Matches the entropy
 * of Stripe's own webhook secret format and is plenty for HMAC-SHA256.
 *
 * Exported so the regenerate route + the seed script can reuse it without
 * pulling in `crypto` everywhere.
 */
export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(32).toString('hex')
}

/**
 * Slug validation regex — lowercase letters, digits, hyphens. 2–32 chars.
 * An OPTIONAL leading underscore is allowed for platform-reserved slugs
 * (e.g. `_docs-demo`). The API route layer enforces that only superadmins
 * may create slugs starting with `_` — see
 * `routes/applications/create.ts` `RESERVED_SLUG_PREFIX`. Persisting the
 * permission via storage-level whitelist alone would be insufficient: the
 * route layer is the one that knows the caller's role.
 *
 * Exported for reuse in route validation (Zod `.regex()`).
 */
export const APPLICATION_SLUG_REGEX: RegExp = /^(?:_[a-z0-9-]{1,31}|[a-z0-9-]{2,32})$/

/**
 * Max length for any inline theme token value (CSS color string). Used as a
 * cheap defence against accidentally large payloads; the Zod layer enforces
 * stricter semantic validation (color format) at request time.
 */
export const APPLICATION_THEME_TOKEN_MAX = 64

/**
 * Max length for the `theme.logo` URL. Blob/S3 URLs comfortably fit in 2KB.
 */
export const APPLICATION_THEME_LOGO_MAX = 2048

const applicationThemeSchema = new Schema<ApplicationTheme>(
  {
    primary: { type: String, required: false, trim: true, maxlength: APPLICATION_THEME_TOKEN_MAX },
    background: {
      type: String,
      required: false,
      trim: true,
      maxlength: APPLICATION_THEME_TOKEN_MAX,
    },
    foreground: {
      type: String,
      required: false,
      trim: true,
      maxlength: APPLICATION_THEME_TOKEN_MAX,
    },
    accent: { type: String, required: false, trim: true, maxlength: APPLICATION_THEME_TOKEN_MAX },
    logo: { type: String, required: false, trim: true, maxlength: APPLICATION_THEME_LOGO_MAX },
  },
  { _id: false }
)

const applicationSchema = new Schema<ApplicationDocument>(
  {
    slug: {
      // `unique: true` would add a duplicate index alongside the explicit
      // `schema.index({ slug: 1 }, { unique: true })` below — keeping just
      // one declaration avoids Mongoose's duplicate-index warning.
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: APPLICATION_SLUG_REGEX,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
    createdBy: {
      type: String,
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    theme: {
      type: applicationThemeSchema,
      required: false,
      default: undefined,
    },
    themeEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    isPlatformOwned: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    requireEmailVerification: {
      type: Boolean,
      required: true,
      default: false,
    },
    isTestMode: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    webhookSecret: {
      type: String,
      required: true,
      // `select: false` — never returned by default `find*` projections; routes
      // that need it MUST opt-in via `.select('+webhookSecret')`. This is the
      // same pattern Mongoose recommends for password hashes — defensive against
      // accidental leak through a generic serializer.
      select: false,
      default: generateWebhookSecret,
    },
    webhookEndpointUrl: {
      type: String,
      required: false,
      default: null,
      trim: true,
      maxlength: 2048,
    },
    reservedSlug: {
      type: Boolean,
      required: false,
      default: false,
      index: true,
    },
    quotas: {
      type: new Schema(
        {
          maxUsers: { type: Number, required: false, min: 0 },
          maxEventsPerDay: { type: Number, required: false, min: 0 },
        },
        { _id: false }
      ),
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'applications',
    bufferCommands: false,
  }
)

// Slug is already unique via schema; explicit index keeps intent obvious.
applicationSchema.index({ slug: 1 }, { unique: true })

/**
 * Archive query guard — auto-injects `{ status: { $ne: 'archived' } }` into
 * every read/update query so archived (soft-deleted) Applications never leak
 * into normal flows.
 *
 * Opt-out: pass `{ includeArchived: true }` as the query option to bypass the
 * filter. Examples of legitimate opt-outs:
 *   - Slug uniqueness check on create — must see archived to surface a clean
 *     409 instead of a raw Mongoose duplicate-key error.
 *   - Archive / restore endpoint — must see archived to operate on them.
 *   - Admin "include archived" toggle on the Applications list page.
 *
 * Mongoose 8 — the hook reads `this.getOptions()` to inspect the per-query
 * options bag. Caller-provided `status` filters are honored verbatim
 * (caller knows best); we only inject when the field is absent from the
 * filter AND `includeArchived` is not set.
 *
 * Standard ref: `.claude/rules/standard-saas-data.md` §5 (soft delete).
 *
 * @internal
 */
function filterMentionsStatus(filter: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(filter, 'status')) return true
  for (const op of ['$or', '$and', '$nor'] as const) {
    const arr = filter[op]
    if (Array.isArray(arr)) {
      for (const clause of arr) {
        if (
          clause &&
          typeof clause === 'object' &&
          filterMentionsStatus(clause as Record<string, unknown>)
        ) {
          return true
        }
      }
    }
  }
  return false
}

function injectArchiveFilter(
  this: Query<unknown, ApplicationDocument>,
  next: (err?: Error) => void
): void {
  const opts = this.getOptions() as { includeArchived?: boolean }
  if (opts.includeArchived === true) return next()

  const filter = this.getFilter() as Record<string, unknown>
  // Caller is being explicit about status anywhere in the filter (top level
  // OR nested inside $or/$and/$nor) — respect that intent and skip the
  // auto-injection to avoid double constraints / redundant clauses.
  if (filterMentionsStatus(filter)) return next()

  this.where({ status: { $ne: 'archived' } })
  next()
}

applicationSchema.pre('find', injectArchiveFilter)
applicationSchema.pre('findOne', injectArchiveFilter)
applicationSchema.pre('findOneAndUpdate', injectArchiveFilter)
applicationSchema.pre('findOneAndDelete', injectArchiveFilter)
applicationSchema.pre('findOneAndReplace', injectArchiveFilter)
applicationSchema.pre('countDocuments', injectArchiveFilter)
applicationSchema.pre('updateOne', injectArchiveFilter)
applicationSchema.pre('updateMany', injectArchiveFilter)
applicationSchema.pre('distinct', injectArchiveFilter)

// Stripe-pattern test/live partition (`standard-saas-data.md` §4) — auto-scope
// every read by `req.derivedMode` propagated via AsyncLocalStorage.
applicationSchema.plugin(testModeScopePlugin)

/**
 * Factory function to get the Application model attached to the shared
 * ezauth connection. Safe to call multiple times — relies on Mongoose's
 * `models` cache to avoid schema redefinition warnings in tests.
 *
 * @example
 * const Application = await getApplicationModel()
 * const app = await Application.findOne({ slug: 'acme' })
 */
export async function getApplicationModel(): Promise<Model<ApplicationDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.Application ||
    mongoose.model<ApplicationDocument>('Application', applicationSchema)
  )
}
