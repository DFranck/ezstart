import mongoose, { Model } from 'mongoose'

const { Schema, model, models } = mongoose

export type ProviderType = 'gemini' | 'openai' | 'anthropic'

export interface IAppProviderConfig {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface IAppProvider {
  /** Apps this provider is scoped to. Use '*' to target every app. */
  apps: string[]
  /** @deprecated Legacy single-app field — kept for backward-compat on old docs. */
  appName?: string
  providerId: string
  providerType: ProviderType
  enabled: boolean
  priority: number
  config?: IAppProviderConfig
  createdAt: Date
  updatedAt: Date
}

const appProviderSchema = new Schema<IAppProvider>(
  {
    apps: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (value: unknown) => Array.isArray(value) && value.length > 0,
        message: 'apps must contain at least one entry (use "*" for all apps)',
      },
    },
    // Legacy field — still accepted from old docs, normalized to `apps` at read time.
    appName: {
      type: String,
      required: false,
      trim: true,
    },
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    providerType: {
      type: String,
      required: true,
      enum: ['gemini', 'openai', 'anthropic'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    config: {
      type: new Schema(
        {
          model: { type: String },
          temperature: { type: Number, min: 0, max: 2 },
          maxTokens: { type: Number, min: 1 },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
)

// Unique compound — one provider config per (providerId, apps[]) tuple.
// Multikey on `apps` lets a same providerId exist multiple times when scoped to
// different app sets, but blocks true duplicates for identical scopes.
appProviderSchema.index({ providerId: 1, apps: 1 }, { unique: true })
// Fast lookup: enabled providers for an app, ordered by priority.
appProviderSchema.index({ apps: 1, enabled: 1, priority: 1 })

export const AppProvider: Model<IAppProvider> =
  models.AppProvider || model<IAppProvider>('AppProvider', appProviderSchema)

/**
 * Normalize a raw AppProvider document to always expose `apps: string[]`.
 * Converts legacy `appName: string` docs into `apps: [appName]` at read time.
 * Safe for both lean docs and full mongoose docs (accessed via `.toObject()`).
 */
export function normalizeLegacyAppProvider<T extends Record<string, unknown>>(
  doc: T
): T & { apps: string[] } {
  const apps = Array.isArray(doc.apps)
    ? (doc.apps.filter((a): a is string => typeof a === 'string' && a.length > 0) as string[])
    : []
  if (apps.length > 0) {
    return { ...doc, apps }
  }
  if (typeof doc.appName === 'string' && doc.appName.length > 0) {
    return { ...doc, apps: [doc.appName] }
  }
  return { ...doc, apps: [] }
}
