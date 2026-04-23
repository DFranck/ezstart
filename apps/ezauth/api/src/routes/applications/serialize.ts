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
  createdAt: string
  updatedAt: string
}

/**
 * Convert a hydrated OR lean Application document to the wire shape.
 * Accepts both because `findById(...).lean()` returns a POJO and `.save()`
 * returns a hydrated doc.
 */
export function serializeApplication(
  app:
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
        createdAt: Date
        updatedAt: Date
      }
): SerializedApplication {
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
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }
}
