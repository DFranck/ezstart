/**
 * Mongoose schema factory for SaaS audit log collections.
 *
 * Every @ezstart SaaS service (ezauth, ezpay, ezbill, …) needs a per-service
 * audit log collection so we can satisfy `standard-saas-security.md` §3 (audit
 * logs on sensitive actions). Hand-rolling the same schema in every service
 * leads to drift (different indexes, different TTL, different field types).
 *
 * `createAuditLogSchema` returns a fully-configured `Schema<AuditLogDocument>`
 * that:
 * - Uses the canonical `audit_logs` collection name (single source of truth
 *   across services — each service connects to its own DB so no collision).
 * - Persists `userId`, `appName`, `action`, `metadata`, `createdAt`,
 *   `expiresAt`, `isTestMode`.
 * - Indexes the high-traffic query shapes (`userId`, `userId+createdAt desc`,
 *   `userId+action+createdAt desc`).
 * - Installs a MongoDB TTL index on `expiresAt` (`expireAfterSeconds: 0`) so
 *   expired entries auto-delete.
 * - Plugs in `testModeScopePlugin` for Stripe-pattern test/live partition
 *   (cf. `standard-saas-data.md` §4).
 *
 * Each consumer passes its own `actions` enum — keeps action types service-
 * specific and type-safe at the model layer (the enum is enforced both at
 * Mongoose validation and at TypeScript narrowing time).
 *
 * @module @ezstart/api-core/audit-log/schema
 */

import { Schema } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

/** Free-form metadata bag attached to every audit entry. */
export interface AuditLogMetadata {
  /** Source IP of the request (best-effort, post-proxy). */
  ip?: string | null
  /** Raw `User-Agent` header. */
  userAgent?: string | null
  /** Optional resolved geo location string (e.g. `'Paris, FR'`). */
  location?: string | null
  /** Free-form action-specific details — caller-defined. */
  [key: string]: unknown
}

/** Canonical document shape produced by `createAuditLogSchema`. */
export interface AuditLogDocument {
  userId: string
  appName: string
  action: string
  metadata: AuditLogMetadata
  createdAt: Date
  expiresAt: Date
  /**
   * Stripe-pattern test/live partition. Inherited from `req.derivedMode` at
   * write time so test mode actions stay isolated from live audit logs.
   */
  isTestMode: boolean
}

/** Options accepted by {@link createAuditLogSchema}. */
export interface CreateAuditLogSchemaOptions {
  /**
   * Per-service action enum — Mongoose validation rejects any value outside
   * this list. Use a `readonly string[]` (or `as const` tuple) so callers can
   * derive a TypeScript union from the same source of truth.
   */
  actions: readonly string[]
  /**
   * Default retention window in days. Stored as schema-level metadata only —
   * the actual `expiresAt` is computed by the service layer at write time
   * (see `createAuditLogService`). Default `90`.
   */
  defaultRetentionDays?: number
}

/**
 * Build a fully-configured Mongoose audit-log schema.
 *
 * The generic `TDoc` lets each consumer narrow the document type to its
 * service-specific action union (e.g. `extends Document` with a literal
 * `action: 'login' | 'logout' | …`). Defaults to {@link AuditLogDocument}
 * when the consumer is happy with the generic shape.
 *
 * @example
 * ```ts
 * import { createAuditLogSchema } from '@ezstart/api-core'
 *
 * const ACTIONS = ['login', 'logout', 'password_change'] as const
 * type Action = (typeof ACTIONS)[number]
 * interface MyAuditLog extends Document { action: Action; … }
 *
 * const schema = createAuditLogSchema<MyAuditLog>({ actions: ACTIONS })
 * ```
 */
export function createAuditLogSchema<TDoc = AuditLogDocument>(
  opts: CreateAuditLogSchemaOptions
): Schema<TDoc> {
  const { actions } = opts

  // The schema definition body is shared across all consumers — generics
  // only narrow the produced `Schema<TDoc>` type for downstream `mongoose
  // .model<TDoc>('Name', schema)` ergonomics. We cast the definition through
  // `unknown` to bridge the generic-vs-concrete `SchemaDefinition` mismatch.
  const definition = {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      // Mongoose accepts a readonly tuple — we cast to mutable to satisfy
      // the legacy enum signature without leaking `any` into the public API.
      enum: actions as unknown as string[],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isTestMode: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  } as unknown as ConstructorParameters<typeof Schema<TDoc>>[0]

  const schema = new Schema<TDoc>(definition, {
    // We manage `createdAt` manually so the TTL window aligns with it —
    // opting out of mongoose's auto timestamps avoids a duplicate
    // `updatedAt` field nobody reads.
    timestamps: false,
    collection: 'audit_logs',
    bufferCommands: false,
  })

  // Compound index for the most frequent listing query: a user's recent
  // activity, optionally filtered by action.
  schema.index({ userId: 1, createdAt: -1 })
  schema.index({ userId: 1, action: 1, createdAt: -1 })

  // MongoDB TTL index — auto-cleanup once the document passes its
  // `expiresAt`. `expireAfterSeconds: 0` tells Mongo to use the date in the
  // field as the absolute deletion time.
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

  // Stripe-pattern test/live partition (`standard-saas-data.md` §4) — auto-
  // scope every read by `req.derivedMode` propagated via AsyncLocalStorage.
  schema.plugin(testModeScopePlugin)

  return schema
}

/**
 * Default retention window (days) used by the service layer when neither the
 * caller nor the schema specifies a per-entry retention.
 */
export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 90

/**
 * Compute the `expiresAt` deadline for a new audit log entry given a retention
 * window in days.
 *
 * @example
 * ```ts
 * const expiresAt = computeAuditLogExpiry(30)
 * ```
 */
export function computeAuditLogExpiry(
  retentionDays: number = DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  now: Date = new Date()
): Date {
  return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)
}
