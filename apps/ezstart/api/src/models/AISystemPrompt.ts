import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type PromptType = 'general' | 'extraction' | 'validation' | 'vision' | 'custom'
export type ProviderTarget = 'all' | 'gemini' | 'openai' | 'anthropic'

/**
 * Wildcard sentinel used in `apps[]` to mean "applies to every app" (god-level).
 */
export const APPS_WILDCARD = '*'
/**
 * Wildcard sentinel used in `providers[]` to mean "applies to every provider".
 */
export const PROVIDERS_WILDCARD = 'all'

export interface PromptConfig {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  rules?: string[]
  constraints?: {
    maxResponseLength?: number
    allowedTopics?: string[]
    forbiddenTopics?: string[]
    requiredFormat?: string
  }
  safety?: {
    blockThreshold?: 'none' | 'low' | 'medium' | 'high'
    filterLevel?: number
  }
}

export interface IPromptProvider {
  providerId: string
  priority: number
}

export interface IAISystemPrompt {
  key: string
  /**
   * List of apps this prompt targets. Use `['*']` for god-level prompts that apply
   * to every app. Multiple values compose (multi-app assignment).
   */
  apps: string[]
  /**
   * List of providers this prompt targets. Use `['all']` to apply to every provider.
   * Multiple values compose (multi-provider assignment).
   */
  providers: string[]
  name: string
  description?: string
  content: string
  config?: PromptConfig
  type: PromptType
  isActive: boolean
  isDefault: boolean
  /**
   * Optional ordering hint when composing multiple prompts (higher = injected later).
   * Default 0.
   */
  priority?: number
  /**
   * Per-provider assignments with priority (legacy detailed mapping kept for UI).
   */
  providerAssignments?: IPromptProvider[]
  variables?: string[]
  updatedBy?: string
  // ────────────────────────────────────────────────────────────────────────────
  // Legacy fields — kept optional for backward compatibility while old documents
  // are progressively migrated. New code MUST read from `apps[]` / `providers[]`.
  // ────────────────────────────────────────────────────────────────────────────
  /** @deprecated Use `apps[]`. Old single-app field. */
  appName?: string
  /** @deprecated Use `providers[]`. Old single-provider field. */
  provider?: ProviderTarget
  createdAt: Date
  updatedAt: Date
}

const aiSystemPromptSchema = new Schema<IAISystemPrompt>(
  {
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-_]+$/,
    },
    apps: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'apps must contain at least one entry (use ["*"] for all apps)',
      },
    },
    providers: {
      type: [String],
      required: true,
      default: ['all'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'providers must contain at least one entry (use ["all"] for all providers)',
      },
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
      // 50k chars — large enough for a rich system prompt (persona + rules +
      // examples + constraints) without silently truncating conversational
      // agents like GP.A. 10k was too tight and caused shallow replies when
      // admins saved long prompts.
      maxlength: 50000,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      enum: ['general', 'extraction', 'validation', 'vision', 'custom'],
      default: 'general',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    providerAssignments: {
      type: [
        {
          providerId: { type: String, required: true },
          priority: { type: Number, default: 1 },
        },
      ],
      default: [],
    },
    variables: {
      type: [String],
      default: [],
    },
    updatedBy: {
      type: String,
    },
    // Legacy fields — preserved so old DB docs stay readable until migration.
    appName: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      enum: ['all', 'gemini', 'openai', 'anthropic'],
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// Primary lookup: find prompts that target a given app + type and are active.
aiSystemPromptSchema.index({ apps: 1, type: 1, isActive: 1 })
// Secondary: provider filtering during composition.
aiSystemPromptSchema.index({ providers: 1 })
// Uniqueness: a key is unique within its `apps` scope. Mongo's multikey index
// on `apps` lets any array entry collide with another doc that shares it, which
// is exactly what we want (one `key` per (key, app) pair).
aiSystemPromptSchema.index({ key: 1, apps: 1 }, { unique: true })

/**
 * Backward-compat normalizer for documents that still hold the legacy
 * `appName` / `provider` singular fields without populating the new arrays.
 * Returns a shallow-cloned plain object with `apps[]` / `providers[]` always
 * set so callers can rely on the new shape regardless of DB state.
 */
export function normalizeLegacyPrompt<T extends Partial<IAISystemPrompt>>(doc: T): T {
  if (!doc) return doc
  const out: T = { ...doc }
  if ((!out.apps || out.apps.length === 0) && out.appName) {
    out.apps = [out.appName]
  }
  if ((!out.providers || out.providers.length === 0) && out.provider) {
    out.providers = [out.provider]
  }
  if (!out.apps || out.apps.length === 0) out.apps = [APPS_WILDCARD]
  if (!out.providers || out.providers.length === 0) out.providers = [PROVIDERS_WILDCARD]
  return out
}

export const AISystemPrompt: Model<IAISystemPrompt> =
  models.AISystemPrompt || model<IAISystemPrompt>('AISystemPrompt', aiSystemPromptSchema)
