import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Application lifecycle status.
 *
 * - `active` — default, visible in listings, keys can be created against it.
 * - `archived` — soft-deleted, hidden from default listings, keys revoked (or
 *   blocked unless `?cascade=true` was used at archive time).
 */
export type ApplicationStatus = 'active' | 'archived'

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
 */
export interface ApplicationDocument extends Document {
  slug: string
  name: string
  description?: string
  ownerId: string
  metadata?: Record<string, unknown>
  createdBy?: string
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Slug validation regex — lowercase letters, digits, hyphens. 2–32 chars.
 * Exported for reuse in route validation (Zod `.regex()`).
 */
export const APPLICATION_SLUG_REGEX: RegExp = /^[a-z0-9-]{2,32}$/

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
