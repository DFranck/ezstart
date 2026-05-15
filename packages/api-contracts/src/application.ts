/**
 * Application — multi-tenant entity wire contracts.
 *
 * Canonical wire shape for an `Application` (the multi-tenant root entity
 * shared between EZAuth, EZPay, and any other service that scopes data by
 * `applicationId`). Source of truth lives in the EZAuth DB; other services
 * reference it by `id`.
 *
 * Lives in `@ezstart/api-contracts` (and not in `@ezstart/auth-sdk`) so that
 * any client/server in the monorepo — including ones that don't depend on
 * auth-sdk — can speak the exact same shape.
 *
 * @see standard-architecture.md §1 (Tier 1 SaaS services)
 * @see standard-saas-keys.md §1-2 (per-Application scoping)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ApplicationTheme — white-label tokens
// ---------------------------------------------------------------------------

/**
 * White-label theme tokens persisted on an Application.
 *
 * All fields are optional — an Application can override as few or as many
 * design tokens as it wants. Unset tokens inherit the default EZAuth theme
 * (or the CSS preset keyed on `data-app="<slug>"`).
 *
 * Values are CSS color strings (hex, `oklch()`, `hsl()`, or `rgb()`). `logo`
 * is a full `https:` URL to the tenant's logo asset.
 *
 * @example
 * ```ts
 * const theme: ApplicationTheme = {
 *   primary: 'oklch(0.6 0.2 250)',
 *   logo: 'https://cdn.example.com/logo.png',
 * }
 * ```
 */
export const ApplicationThemeSchema = z
  .object({
    primary: z.string().optional(),
    background: z.string().optional(),
    foreground: z.string().optional(),
    accent: z.string().optional(),
    logo: z.string().optional(),
  })
  .describe('White-label theme tokens persisted on an Application')

/** TypeScript type for {@link ApplicationThemeSchema}. */
export type ApplicationTheme = z.infer<typeof ApplicationThemeSchema>

// ---------------------------------------------------------------------------
// ApplicationStatus
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of an Application.
 *
 * - `active` — fully operational, can issue keys and receive traffic
 * - `archived` — soft-deleted, kept for audit / restore
 */
export const ApplicationStatusSchema = z
  .enum(['active', 'archived'])
  .describe('Application lifecycle status')

/** TypeScript union for {@link ApplicationStatusSchema}. */
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>

// ---------------------------------------------------------------------------
// Application — wire shape
// ---------------------------------------------------------------------------

/**
 * Application tenant — source of truth lives in EZAuth DB; other services
 * (EZPay, etc.) reference it by `id`.
 *
 * `theme` + `themeEnabled` back the EZAuth Pro white-label feature.
 * `themeEnabled` is shown as a toggle in the dashboard and gated on plan
 * activation — when `false`, SSR falls back to the default preset.
 *
 * @example
 * ```ts
 * const app: Application = ApplicationSchema.parse({
 *   id: 'app_abc123',
 *   slug: 'acme',
 *   name: 'Acme Corp',
 *   ownerId: 'user_xyz789',
 *   status: 'active',
 *   createdAt: '2026-01-01T00:00:00.000Z',
 *   updatedAt: '2026-01-01T00:00:00.000Z',
 * })
 * ```
 */
export const ApplicationSchema = z
  .object({
    id: z.string().describe('Application id (Mongo ObjectId hex string)'),
    slug: z.string().describe('URL-safe slug (`acme`, `myapp`)'),
    name: z.string().describe('Human-readable display name'),
    description: z.string().optional(),
    ownerId: z.string().describe('User id of the Application owner'),
    metadata: z.record(z.unknown()).optional().describe('Free-form key/value metadata'),
    status: ApplicationStatusSchema,
    theme: ApplicationThemeSchema.nullable().optional(),
    themeEnabled: z.boolean().optional(),
    /**
     * Platform-owned flag (dogfood). `true` for the apps owned by the
     * platform operator — grants free access to paid features.
     */
    isPlatformOwned: z.boolean().optional(),
    /**
     * Composable email-verification gate (Clerk / Vercel pattern). When
     * `true`, downstream features should require a verified email. Login
     * itself is never blocked.
     */
    requireEmailVerification: z.boolean().optional(),
    /**
     * Optional override for the URL where outbound webhooks are delivered.
     * `null` means "use the service-specific default".
     */
    webhookEndpointUrl: z.string().nullable().optional(),
    /**
     * Set to true for applications in test/sandbox mode. Pay-sdk uses this
     * to dispatch to test Stripe keys; auth-sdk uses it to scope test-data
     * isolation.
     *
     * Stripe-pattern test/live partition (cf. `standard-saas-data.md` §4).
     * Mirrors the server-side `ApplicationDocument.isTestMode` field — when
     * a request is authenticated with a test key, the API auto-injects this
     * filter so test applications never leak into live listings.
     *
     * Optional on the wire: legacy applications created before the
     * test/live partition rollout do not have the field; consumers should
     * treat `undefined` as "live" (the default partition).
     */
    isTestMode: z.boolean().optional(),
    /**
     * Per-Application HMAC-SHA256 webhook secret in Stripe `whsec_<hex>`
     * format. **Treat as a credential** — only emitted by the API right
     * after `regenerate-webhook-secret` and via S2S admin lookup.
     */
    webhookSecret: z.string().optional(),
    createdAt: z.string().describe('ISO 8601 timestamp'),
    updatedAt: z.string().describe('ISO 8601 timestamp'),
  })
  .describe('Application — multi-tenant entity wire shape')

/** TypeScript type for {@link ApplicationSchema}. */
export type Application = z.infer<typeof ApplicationSchema>

// ---------------------------------------------------------------------------
// Application request bodies
// ---------------------------------------------------------------------------

/** Body for `POST /applications`. */
export const CreateApplicationRequestSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .describe('Body for POST /applications')

/** TypeScript type for {@link CreateApplicationRequestSchema}. */
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequestSchema>

/** Body for `PATCH /applications/:id`. */
export const UpdateApplicationRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    requireEmailVerification: z.boolean().optional(),
  })
  .describe('Body for PATCH /applications/:id')

/** TypeScript type for {@link UpdateApplicationRequestSchema}. */
export type UpdateApplicationRequest = z.infer<typeof UpdateApplicationRequestSchema>

/**
 * Body for `PATCH /applications/:id/theme`.
 *
 * Either field may be sent on its own — callers can toggle `themeEnabled`
 * without touching the tokens, or update the tokens while leaving the
 * enable flag alone. Passing `theme: null` clears the saved tokens.
 */
export const UpdateApplicationThemeRequestSchema = z
  .object({
    theme: ApplicationThemeSchema.nullable().optional(),
    themeEnabled: z.boolean().optional(),
  })
  .describe('Body for PATCH /applications/:id/theme')

/** TypeScript type for {@link UpdateApplicationThemeRequestSchema}. */
export type UpdateApplicationThemeRequest = z.infer<typeof UpdateApplicationThemeRequestSchema>

/** Response from `GET /applications/resolve?key=ez_pk_live_*`. */
export const ApplicationResolveResponseSchema = z
  .object({
    applicationId: z.string(),
    slug: z.string(),
    name: z.string(),
    type: z.enum(['publishable', 'secret']).optional(),
    env: z.enum(['live', 'test']).optional(),
    scope: z.enum(['admin', 'user', 'readonly']).optional(),
  })
  .describe('Response from GET /applications/resolve')

/** TypeScript type for {@link ApplicationResolveResponseSchema}. */
export type ApplicationResolveResponse = z.infer<typeof ApplicationResolveResponseSchema>
