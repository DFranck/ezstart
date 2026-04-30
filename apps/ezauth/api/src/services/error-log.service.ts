/**
 * ErrorLog persistence service — Sentry-free stopgap.
 *
 * Writes unhandled errors captured by the api-core global error handler to
 * a local Mongo `error_logs` collection so the admin dashboard can browse
 * production errors without depending on a third-party tracker.
 *
 * Design contract (from `ErrorPersistCallback` in @ezstart/api-core):
 *
 * 1. **Defensive — never throws.** A bug in the persistence layer must NOT
 *    cascade through the request lifecycle. Every failure is swallowed
 *    locally (logger.warn + continue). The error handler middleware fires
 *    this in best-effort mode.
 * 2. **Fire-and-forget.** The middleware does not await — slow MongoDB
 *    writes do not delay the user-facing response.
 * 3. **No PII.** We capture `userId` (opaque), `ip` and `userAgent` (legit
 *    forensic context) but NEVER request bodies, headers payload, or query
 *    string params (which may contain tokens / passwords). Do NOT extend
 *    this without reviewing `standard-saas-security.md` §9.
 */

import type { Request } from 'express'
import { logger } from '@ezstart/logger/server'
import { getErrorLogModel, type ErrorLogLevel } from '../models/error-log.js'

const MAX_MESSAGE_LEN = 2000
const MAX_STACK_LEN = 8000
const MAX_USER_AGENT_LEN = 500

export interface LogErrorToDbInput {
  /** Original throwable. Coerced to `Error` if it isn't one already. */
  err: unknown
  /** Express request — used to capture URL, method, IP, user, UA. */
  req?: Request
  /** Severity (default `'error'`). */
  level?: ErrorLogLevel
  /** Free-form caller-supplied context (test mode flag, app slug, …). */
  context?: Record<string, unknown>
  /**
   * Optional explicit status code override. When omitted we look at
   * `res.statusCode` (only meaningful when called from a post-response
   * hook, since the api-core error handler runs BEFORE the response is
   * sent).
   */
  statusCode?: number
}

function truncate(input: string | undefined, maxLen: number): string | undefined {
  if (!input) return undefined
  return input.length <= maxLen ? input : input.slice(0, maxLen)
}

function extractStatusCode(req?: Request, override?: number): number | undefined {
  if (typeof override === 'number') return override
  // The error handler runs BEFORE res.status() is called, so this is
  // typically undefined for unhandled exceptions — kept for symmetry with
  // post-response invocations (e.g. caught 4xx that we still want logged).
  const status = (req as (Request & { res?: { statusCode?: number } }) | undefined)?.res?.statusCode
  return typeof status === 'number' && status >= 400 ? status : undefined
}

function extractUserId(req?: Request): string | undefined {
  if (!req) return undefined
  if (typeof req.userId === 'string' && req.userId.length > 0) return req.userId
  const userObj = req.user as { userId?: string } | undefined
  return typeof userObj?.userId === 'string' ? userObj.userId : undefined
}

function extractUserAgent(req?: Request): string | undefined {
  if (!req) return undefined
  // `req.get` may not exist in unit tests with bare mock requests — guard.
  const ua = typeof req.get === 'function' ? req.get('user-agent') : undefined
  return truncate(ua ?? undefined, MAX_USER_AGENT_LEN)
}

function extractReleaseSha(): string | undefined {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    undefined
  )
}

function extractEnv(): string | undefined {
  return process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? undefined
}

/**
 * Persist an error to the local `error_logs` Mongo collection.
 *
 * Defensive — guaranteed to never throw. Designed to be wired as the
 * `persistError` callback of `createErrorHandler` (or `startServer`).
 *
 * @example
 * ```ts
 * await startServer(app, {
 *   // ...
 *   persistError: (err, req) => logErrorToDb({ err, req }),
 * })
 * ```
 */
export async function logErrorToDb(input: LogErrorToDbInput): Promise<void> {
  try {
    const ErrorLog = await getErrorLogModel()
    const e = input.err instanceof Error ? input.err : new Error(String(input.err))

    const doc: Record<string, unknown> = {
      timestamp: new Date(),
      level: input.level ?? 'error',
      message: truncate(e.message, MAX_MESSAGE_LEN) ?? '(no message)',
      errorName: e.name,
    }

    const stack = truncate(e.stack, MAX_STACK_LEN)
    if (stack) doc.stack = stack

    if (input.req) {
      const url = input.req.originalUrl ?? input.req.url
      if (url) doc.url = url
      if (input.req.method) doc.method = input.req.method
      const ip = input.req.ip
      if (typeof ip === 'string') doc.ip = ip
      const ua = extractUserAgent(input.req)
      if (ua) doc.userAgent = ua
      const userId = extractUserId(input.req)
      if (userId) doc.userId = userId
    }

    const statusCode = extractStatusCode(input.req, input.statusCode)
    if (statusCode !== undefined) doc.statusCode = statusCode

    const releaseSha = extractReleaseSha()
    if (releaseSha) doc.releaseSha = releaseSha

    const env = extractEnv()
    if (env) doc.env = env

    if (input.context && Object.keys(input.context).length > 0) {
      doc.context = input.context
    }

    await ErrorLog.create(doc)
  } catch (persistErr) {
    // Swallow — the whole point of this service is to STORE errors, not to
    // become a new source of errors. Log at warn level so an SRE can still
    // notice if persistence is broken.
    logger.warn('[error-log.service] failed to persist error to DB', {
      err: persistErr instanceof Error ? persistErr.message : String(persistErr),
    })
  }
}
