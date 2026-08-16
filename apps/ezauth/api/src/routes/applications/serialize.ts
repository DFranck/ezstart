/**
 * Shared serializer for Application documents.
 *
 * Keeping the shape centralized avoids drift between `create`, `get`, `list`,
 * `update`, and the new `update-theme` routes, especially now that theme
 * fields must be exposed consistently for the dashboard UI.
 */

import type { ApplicationDocument } from '../../models/application.js'

/** Shape returned to API consumers — matches the Zod response schemas. */
export interface SerializedApplication {
  id: string
  slug: string
  name: string
  description: string | null
  ownerId: string
  metadata: Record<string, unknown> | null
  status: 'active' | 'archived'
  theme: {
    primary?: string
    background?: string
    foreground?: string
    accent?: string
    logo?: string
  } | null
  themeEnabled: boolean
  /**
   * Platform-owned (dogfood) flag. True for the 8 EzStart-owned apps — grants
   * free access to paid features via {@link hasFeature}. Safe to expose in API
   * responses: it is a trust signal, not a secret.
   */
  isPlatformOwned: boolean
  /**
   * Composable email-verification gate (Clerk / Vercel pattern). When `true`
   * the consumer opts-in to a tenant-level signal that downstream features
   * should require a verified email. Login itself is never blocked.
   */
  requireEmailVerification: boolean
  /**
   * Optional override for the URL where outbound webhooks (currently
   * EZPay → EZAuth subscription notifications) are delivered. `null` means
   * "use the service-specific default" (canonical ezauth subscriptions
   * webhook endpoint). Reserved for future external consumers.
   *
   * Safe to expose: this is a public configuration field, not a secret.
   */
  webhookEndpointUrl: string | null
  /**
   * Webhook secret in Stripe `whsec_<hex>` format.
   *
   * **NEVER** populated by the default serializer — only the dedicated
   * regenerate endpoint (which has just generated a fresh value) and the
   * S2S `?include=webhookSecret` view (admin scope only) include the actual
   * value. All other endpoints set this to `undefined` so it is omitted
   * from the JSON response entirely.
   *
   * Set the field via {@link serializeApplicationWithSecret} if you need to
   * surface it explicitly.
   */
  webhookSecret?: string
  createdAt: string
  updatedAt: string
}

/**
 * Lean shape accepted by {@link serializeApplication}. Keeps the input loose
 * (both `.lean()` POJOs and hydrated docs) while still typed enough to catch
 * obvious shape regressions.
 */
type SerializableApplication =
  | ApplicationDocument
  | {
      _id: unknown
      slug: string
      name: string
      description?: string
      ownerId: string
      metadata?: Record<string, unknown>
      status: 'active' | 'archived'
      theme?: {
        primary?: string
        background?: string
        foreground?: string
        accent?: string
        logo?: string
      }
      themeEnabled?: boolean
      isPlatformOwned?: boolean
      requireEmailVerification?: boolean
      webhookEndpointUrl?: string | null
      webhookSecret?: string
      createdAt: Date
      updatedAt: Date
    }

/**
 * Convert a hydrated OR lean Application document to the wire shape.
 * Accepts both because `findById(...).lean()` returns a POJO and `.save()`
 * returns a hydrated doc.
 *
 * **Excludes the `webhookSecret`** — see
 * {@link serializeApplicationWithSecret} when you actually want to surface
 * the value (only after a regenerate, or for an S2S admin lookup).
 */
export function serializeApplication(app: SerializableApplication): SerializedApplication {
  const theme = app.theme
    ? {
        ...(app.theme.primary ? { primary: app.theme.primary } : {}),
        ...(app.theme.background ? { background: app.theme.background } : {}),
        ...(app.theme.foreground ? { foreground: app.theme.foreground } : {}),
        ...(app.theme.accent ? { accent: app.theme.accent } : {}),
        ...(app.theme.logo ? { logo: app.theme.logo } : {}),
      }
    : null
  const hasTheme = theme && Object.keys(theme).length > 0
  return {
    id: String(app._id),
    slug: app.slug,
    name: app.name,
    description: app.description ?? null,
    ownerId: app.ownerId,
    metadata: app.metadata ?? null,
    status: app.status,
    theme: hasTheme ? theme : null,
    themeEnabled: app.themeEnabled ?? false,
    isPlatformOwned: app.isPlatformOwned ?? false,
    requireEmailVerification: app.requireEmailVerification ?? false,
    webhookEndpointUrl: app.webhookEndpointUrl ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }
}

/**
 * Serialize an Application with its webhook secret included.
 *
 * Caller MUST have explicitly loaded the secret via `.select('+webhookSecret')`
 * — otherwise `app.webhookSecret` is `undefined` and the wire shape will omit
 * the field entirely (which would defeat the purpose of calling this helper).
 *
 * Reserved for the regenerate endpoint and for the S2S admin `?include=webhookSecret`
 * lookup. Both audit-log the access; no other code path should consume this
 * helper.
 */
export function serializeApplicationWithSecret(
  app: SerializableApplication
): SerializedApplication {
  const base = serializeApplication(app)
  if (app.webhookSecret) {
    base.webhookSecret = app.webhookSecret
  }
  return base
}
