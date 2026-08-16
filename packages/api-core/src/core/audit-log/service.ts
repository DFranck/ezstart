/**
 * Fire-and-forget audit log writer for SaaS services.
 *
 * Pairs with {@link createAuditLogSchema} (`./schema.ts`). Each consumer wires
 * its own `getModel` factory + per-service `defaultAppName` and gets a typed
 * `AuditLogService<TAction>` whose `create()` and `createFromRequest()`
 * helpers persist entries into the per-service `audit_logs` collection.
 *
 * Failures NEVER bubble up to the calling route — audit logging is best-
 * effort. The optional `logger` is invoked on failure (defaults to a silent
 * no-op so the service stays publishable on npm without forcing
 * `@ezstart/logger` as a dep).
 *
 * @module @ezstart/api-core/audit-log/service
 */

import type { Request } from 'express'
import {
  computeAuditLogExpiry,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  type AuditLogMetadata,
} from './schema.js'

/**
 * Minimal Mongoose model surface required by the writer service. We avoid
 * importing the full `Model<T>` type here so consumers can pass any narrowed
 * `Model<MyAuditLogDoc>` without a covariance dance — `Model<T>` is invariant
 * in `T` so a `Model<MyDoc>` does not assign to `Model<BaseDoc>`. The structural
 * shape below is all we actually use.
 */
export interface AuditLogModelLike {
  create(doc: Record<string, unknown>): Promise<unknown>
}

/** Minimal logger shape — accepts anything Pino-flavoured (and `console`). */
export interface AuditLogLogger {
  warn(msg: string, ...rest: unknown[]): void
  error(msg: string, ...rest: unknown[]): void
}

/** Options accepted by {@link createAuditLogService}. */
export interface CreateAuditLogServiceOptions {
  /**
   * Async factory returning the Mongoose model bound to the service's DB
   * connection. Typically `() => getAuditLogModel()` from the per-app model
   * file. Typed as a minimal structural shape ({@link AuditLogModelLike}) so
   * any narrowed `Model<MyAuditLogDoc>` assigns directly without covariance
   * gymnastics.
   */
  getModel: () => Promise<AuditLogModelLike>
  /**
   * App-name slug attached to every entry when the caller does not provide
   * its own `appName`. E.g. `'ezauth'`, `'ezpay'`.
   */
  defaultAppName: string
  /**
   * Optional silent-by-default logger used when persistence fails. The
   * service NEVER throws — it warns and returns.
   */
  logger?: AuditLogLogger
  /**
   * Default retention window (days) used when the caller does not supply one
   * via {@link CreateAuditLogInput.retentionDays}. Defaults to
   * {@link DEFAULT_AUDIT_LOG_RETENTION_DAYS} (90).
   */
  defaultRetentionDays?: number
}

/** Input shape accepted by {@link AuditLogService.create}. */
export interface CreateAuditLogInput<TAction extends string = string> {
  /**
   * Caller user id (stringified Mongo `_id`). Optional because some flows
   * (system jobs, anonymous failures) have no authenticated user — in that
   * case pass `null` and the entry will still persist.
   */
  userId?: string | null
  /** Action type — must be one of the schema's `actions` enum at write time. */
  action: TAction
  /** Optional resource identifier (rarely set — most callers use metadata). */
  resource?: string
  /** Optional resource id. */
  resourceId?: string
  /** Free-form metadata bag. */
  metadata?: AuditLogMetadata
  /** Override the service's `defaultAppName` for cross-tenant events. */
  appName?: string
  /**
   * Override the service's `defaultRetentionDays` for this entry. Used by
   * apps that have per-plan retention (free=30d, pro=365d, …).
   */
  retentionDays?: number
}

/** Public surface returned by {@link createAuditLogService}. */
export interface AuditLogService<TAction extends string = string> {
  /** Persist a new audit log entry. Returns `void` even on failure. */
  create(input: CreateAuditLogInput<TAction>): Promise<void>
  /**
   * Convenience wrapper that derives `ip` + `userAgent` from the Express
   * request and merges them into the metadata before calling {@link create}.
   * `userId` is auto-extracted from `req.userId` when not provided in input.
   */
  createFromRequest(
    req: Request,
    input: Omit<CreateAuditLogInput<TAction>, 'userId'> & {
      /** Override the request-derived userId. */
      userId?: string | null
    }
  ): Promise<void>
}

/**
 * Extract the best-effort source IP from a request.
 *
 * Uses Express's proxy-aware `req.ip`, which respects the `trust proxy` setting
 * configured by `createBaseApiServer` (via the `TRUST_PROXY_HOPS` env var,
 * default 2 = Railway+Fastly). With trust proxy set correctly, `req.ip` is the
 * leftmost untrusted IP in the `X-Forwarded-For` chain — i.e. the real client.
 *
 * Falls back to `req.socket.remoteAddress` (the direct TCP peer) when no
 * proxy header is trusted by Express. Returns `null` only if no source can be
 * resolved at all.
 *
 * Prior implementations read `X-Forwarded-For` directly, which is forgeable by
 * clients (XFF is appended at each proxy hop — the leftmost value is the one
 * the attacker controls). This was hacker finding M2 (2026-05-15).
 *
 * @internal
 */
function extractIp(req: Request): string | null {
  return req.ip ?? req.socket?.remoteAddress ?? null
}

/**
 * Build a service-specific audit log writer. Each call returns a fresh object
 * — no module-level state — so multiple SaaS services can co-exist in the
 * same process during tests.
 *
 * @example
 * ```ts
 * import { createAuditLogService } from '@ezstart/api-core'
 * import { logger } from '@ezstart/logger/server'
 * import { getAuditLogModel } from '../models/audit-log.js'
 *
 * export const AuditLogService = createAuditLogService({
 *   getModel: getAuditLogModel,
 *   defaultAppName: 'ezauth',
 *   logger,
 * })
 * ```
 */
export function createAuditLogService<TAction extends string = string>(
  opts: CreateAuditLogServiceOptions
): AuditLogService<TAction> {
  const {
    getModel,
    defaultAppName,
    logger,
    defaultRetentionDays = DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  } = opts

  async function create(input: CreateAuditLogInput<TAction>): Promise<void> {
    try {
      const Model = await getModel()
      const metadata: AuditLogMetadata = { ...(input.metadata ?? {}) }
      if (input.resource !== undefined) metadata.resource = input.resource
      if (input.resourceId !== undefined) metadata.resourceId = input.resourceId

      await Model.create({
        userId: input.userId ?? null,
        appName: input.appName ?? defaultAppName,
        action: input.action,
        metadata,
        createdAt: new Date(),
        expiresAt: computeAuditLogExpiry(input.retentionDays ?? defaultRetentionDays),
      })
    } catch (err) {
      logger?.warn('[audit-log] failed to write entry', {
        action: input.action,
        userId: input.userId ?? null,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function createFromRequest(
    req: Request,
    input: Omit<CreateAuditLogInput<TAction>, 'userId'> & { userId?: string | null }
  ): Promise<void> {
    const ua = req.headers['user-agent']
    const requestMeta: AuditLogMetadata = {
      ip: extractIp(req),
      userAgent: typeof ua === 'string' ? ua : null,
    }
    // Caller-supplied metadata wins over auto-extracted values.
    const merged: AuditLogMetadata = { ...requestMeta, ...input.metadata }

    // Auto-derive userId from req.userId when not explicitly provided.
    const reqUser = (req as Request & { userId?: string }).userId
    const userId = input.userId !== undefined ? input.userId : (reqUser ?? null)

    return create({
      ...input,
      userId,
      metadata: merged,
    } as CreateAuditLogInput<TAction>)
  }

  return { create, createFromRequest }
}
