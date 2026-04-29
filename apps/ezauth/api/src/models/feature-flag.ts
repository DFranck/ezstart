import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Scope a feature flag applies to.
 *
 * - `'global'` — applies to every app and every user platform-wide
 *   (e.g. "enable-new-billing-flow"). Default scope.
 * - `'app'` — applies only to a specific app slug. The `appName` field MUST
 *   be set when scope is `'app'` (Mongoose schema validation enforces this).
 */
export type FeatureFlagScope = 'global' | 'app'

/**
 * Mongoose document for a runtime feature flag.
 *
 * Feature flags are platform-wide toggles that allow superadmins to enable
 * or disable features WITHOUT requiring a redeploy. They are read at runtime
 * by the relevant services and acted upon (e.g. show/hide a UI section, gate
 * a code path).
 *
 * `key` is the stable, dot-or-dash-separated identifier (e.g.
 * `billing.new-checkout`, `auth.passkey-login`). It must be unique within
 * the same `scope` + `appName` combination — the schema-level compound index
 * `(key, scope, appName)` enforces this.
 *
 * `enabled` is the source-of-truth value flipped by the admin UI.
 *
 * `description` is a free-form text shown in the admin UI to remind humans
 * what the flag controls. Optional but strongly encouraged.
 */
export interface FeatureFlagDocument extends Document {
  key: string
  enabled: boolean
  scope: FeatureFlagScope
  /** When `scope === 'app'`, the app slug this flag applies to. */
  appName?: string
  description?: string
  /** Provenance — userId of the last admin to flip it, or `'system-seed'`. */
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

/** Validation: feature-flag keys are lowercase letters, digits, dot, dash. */
export const FEATURE_FLAG_KEY_REGEX: RegExp = /^[a-z0-9][a-z0-9.-]{1,63}$/

const featureFlagSchema = new Schema<FeatureFlagDocument>(
  {
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: FEATURE_FLAG_KEY_REGEX,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    scope: {
      type: String,
      enum: ['global', 'app'],
      required: true,
      default: 'global',
      index: true,
    },
    appName: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    updatedBy: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'feature_flags',
    bufferCommands: false,
  }
)

// A flag key must be unique within the same scope/appName tuple.
// Sparse index so docs without `appName` (scope='global') don't collide on `null`.
featureFlagSchema.index({ key: 1, scope: 1, appName: 1 }, { unique: true })

/**
 * Factory function to get the FeatureFlag model attached to the shared
 * ezauth connection. Safe to call multiple times.
 *
 * @example
 * const FeatureFlag = await getFeatureFlagModel()
 * const flags = await FeatureFlag.find({ scope: 'global' })
 */
export async function getFeatureFlagModel(): Promise<Model<FeatureFlagDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.FeatureFlag ||
    mongoose.model<FeatureFlagDocument>('FeatureFlag', featureFlagSchema)
  )
}
