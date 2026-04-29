import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model, type Query } from 'mongoose'

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
  createdAt: Date
  updatedAt: Date
}

/**
 * Slug validation regex — lowercase letters, digits, hyphens. 2–32 chars.
 * Exported for reuse in route validation (Zod `.regex()`).
 */
export const APPLICATION_SLUG_REGEX: RegExp = /^[a-z0-9-]{2,32}$/

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
