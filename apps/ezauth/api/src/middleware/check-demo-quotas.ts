/**
 * Demo quotas middleware — enforces hard caps on the `_docs-demo` sandbox
 * Application (DOCS_DEMO_SANDBOX_BACKEND-001).
 *
 * Visitors of /docs/components can sign up / sign in with REAL components,
 * but the sandbox MUST not be abusable as a free auth backend. Two caps are
 * enforced:
 *
 *  1. **`maxUsers`** — total `apps: ['_docs-demo']` AuthUser count. Once
 *     reached, signup returns 429 with a clear "Demo capacity reached"
 *     message. Reset every 24h by the cron.
 *
 *  2. **`maxEventsPerDay`** — count of `audit_logs` with
 *     `appName: '_docs-demo'` over the last 24h. Once reached, login /
 *     signup return 429 with a "Demo daily limit reached" message.
 *
 * The middleware is a no-op for any request that did NOT authenticate via
 * the docs-demo API key. This keeps the cost outside the docs-demo path
 * literally zero — `req.apiKeyAppName` is read once and the handler returns
 * immediately. The real DB lookups only fire when we know we're inside the
 * sandbox.
 *
 * @module apps/ezauth/api/src/middleware/check-demo-quotas
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { DOCS_DEMO_APP_SLUG } from '../scripts/seed-docs-demo-app.js'
import { getApplicationModel } from '../models/application.js'
import { getAuthUserModel } from '../models/auth-user.js'
import { getAuditLogModel } from '../models/audit-log.js'

/**
 * Cache the docs-demo Application document for 60s to avoid hitting Mongo on
 * every demo request. Quotas change rarely (only via the seed script or
 * superadmin patch) — a stale 60s window is acceptable.
 *
 * @internal
 */
let cachedApp: {
  expiresAt: number
  data: {
    applicationId: string
    maxUsers: number
    maxEventsPerDay: number
  } | null
} | null = null

const CACHE_TTL_MS = 60_000

/**
 * Reset the in-memory cache. Exposed for tests so each case starts fresh
 * regardless of the previous one.
 */
export function _resetDemoQuotaCacheForTests(): void {
  cachedApp = null
}

async function loadDemoAppQuotas(): Promise<{
  applicationId: string
  maxUsers: number
  maxEventsPerDay: number
} | null> {
  const now = Date.now()
  if (cachedApp && cachedApp.expiresAt > now) {
    return cachedApp.data
  }

  const Application = await getApplicationModel()
  const doc = await Application.findOne({ slug: DOCS_DEMO_APP_SLUG }).lean()
  if (!doc) {
    cachedApp = { expiresAt: now + CACHE_TTL_MS, data: null }
    return null
  }

  const data = {
    applicationId: doc._id.toString(),
    maxUsers: doc.quotas?.maxUsers ?? 0,
    maxEventsPerDay: doc.quotas?.maxEventsPerDay ?? 0,
  }
  cachedApp = { expiresAt: now + CACHE_TTL_MS, data }
  return data
}

/**
 * Detect whether the incoming request targets the docs-demo sandbox. Two
 * detection vectors are supported:
 *
 *  1. **API key auth** — `req.apiKeyAppName === '_docs-demo'`. Set by the
 *     API key middleware when a `_docs-demo` key is presented.
 *  2. **Request body** — `req.body.app === '_docs-demo'`. Used by public
 *     `/auth/register` + `/auth/login` routes which don't currently
 *     validate an API key but accept the `app` field as the tenant
 *     identifier.
 *
 * Both vectors are needed because the auth flow today doesn't gate signup
 * behind an API key (the publishable key is consumed client-side by the
 * SDK). A future refactor could route every public auth call through the
 * key middleware; until then the body-field path is the primary detector.
 *
 * @internal
 */
function isDocsDemoRequest(req: Request): boolean {
  if (req.apiKeyAppName === DOCS_DEMO_APP_SLUG) return true
  const bodyApp = (req.body as { app?: unknown } | undefined)?.app
  if (bodyApp === DOCS_DEMO_APP_SLUG) return true
  return false
}

/**
 * Express middleware that enforces docs-demo quotas. No-op unless the
 * incoming request targets the `_docs-demo` sandbox (detected via API key
 * OR `req.body.app`).
 *
 * Caller SHOULD mount this AFTER any API key middleware (so
 * `req.apiKeyAppName` is populated) and AFTER `express.json()` (so
 * `req.body.app` is parsed). Mount BEFORE the route handler that creates
 * users (signup) or writes audit logs (login).
 *
 * @example
 * router.post('/auth/register', registerRateLimiter, checkDemoQuotas, registerHandler)
 */
export async function checkDemoQuotas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // No-op fast path — strict no-op for any request that did NOT target the
  // docs-demo namespace. We do NOT want to penalise the live path with a
  // Mongo lookup on every request.
  if (!isDocsDemoRequest(req)) {
    return next()
  }

  try {
    const quotas = await loadDemoAppQuotas()
    if (!quotas) {
      // Demo Application missing — fail safe (block the request rather than
      // silently allowing it through unscoped). The seed script was probably
      // skipped in this environment.
      logger.warn(
        { path: req.path, slug: DOCS_DEMO_APP_SLUG },
        'Docs-demo request denied: sandbox Application not seeded'
      )
      sendError(res, 'Documentation demo sandbox is not available', 503)
      return
    }

    // 1. User count gate — only enforced on signup-type routes (POST). For
    //    GET requests we let the request through (read-only path doesn't
    //    create users). The route layer can additionally short-circuit.
    if (quotas.maxUsers > 0 && req.method === 'POST') {
      const AuthUser = await getAuthUserModel()
      const userCount = await AuthUser.countDocuments({ apps: DOCS_DEMO_APP_SLUG })
      if (userCount >= quotas.maxUsers) {
        logger.warn(
          {
            userCount,
            limit: quotas.maxUsers,
            path: req.path,
          },
          'Docs-demo signup denied: max users reached'
        )
        sendError(res, 'Demo capacity reached. Try again later (resets every 24h).', 429)
        return
      }
    }

    // 2. Event count gate — sliding 24h window over the audit log scoped to
    //    the demo app. Catches login + signup spam alike.
    if (quotas.maxEventsPerDay > 0) {
      const AuditLog = await getAuditLogModel()
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const eventCount = await AuditLog.countDocuments({
        appName: DOCS_DEMO_APP_SLUG,
        createdAt: { $gte: cutoff },
      })
      if (eventCount >= quotas.maxEventsPerDay) {
        logger.warn(
          {
            eventCount,
            limit: quotas.maxEventsPerDay,
            path: req.path,
          },
          'Docs-demo request denied: max events per day reached'
        )
        sendError(res, 'Demo daily limit reached. Try again tomorrow.', 429)
        return
      }
    }

    next()
  } catch (err) {
    logger.error({ err, path: req.path }, 'Docs-demo quota check failed')
    // Fail closed — never let a check-error flow through into an unmetered
    // signup. Returns 503 (transient) rather than 500 so retries are
    // encouraged.
    sendError(res, 'Documentation demo sandbox temporarily unavailable', 503)
  }
}
