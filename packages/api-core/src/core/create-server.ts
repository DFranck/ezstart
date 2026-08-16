/**
 * `createBaseApiServer` — low-level agnostic factory that wires an Express
 * app with the defaults expected from a production-grade SaaS API (CORS,
 * JSON parser, trust proxy, health/root endpoints, optional global rate
 * limiting).
 *
 * Zero coupling to the `@ezstart` monorepo — publishable on npm as-is.
 *
 * The returned object exposes the raw `app` so callers can attach their own
 * routers/middlewares before handing it off to `startServer`.
 *
 * Most monorepo consumers should use the higher-level `createApiServer`
 * (in `../create-api-server.ts`) which pre-wires `@ezstart/config` and
 * `@ezstart/logger`.
 */

import express, { type Express } from 'express'
import helmet from 'helmet'
import './express-aug.js'
import { createDeepHealthHandler } from './health.js'
import {
  createCorsMiddleware,
  createPermissiveCorsMiddleware,
  createStrictCorsMiddleware,
} from './middleware/cors.js'
import { createErrorHandler } from './middleware/error-handler.js'
import {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
} from './middleware/rate-limit.js'
import { silentLogger } from './internal/logger.js'
import type { ApiServer, RateLimitPreset, ServerConfig, ServerLogger } from './types.js'

const HEALTH_PATH_DEFAULT = '/health'
const HEALTH_PATH_LEGACY = '/api/health'
const HEALTH_DEEP_PATH_DEFAULT = '/health/deep'
const ROOT_PATH_DEFAULT = '/'

function resolveRateLimiter(preset: RateLimitPreset | undefined) {
  switch (preset) {
    case 'strict':
      return createStrictRateLimiter
    case 'very-strict':
      return createVeryStrictRateLimiter
    case 'moderate':
      return createModerateRateLimiter
    case 'standard':
    case undefined:
      return createRateLimiter
  }
}

/**
 * Build a fully-wired Express app from an explicit `ServerConfig`.
 *
 * @example
 * ```ts
 * import { createBaseApiServer, startServer } from '@ezstart/api-core'
 *
 * const { app, logger } = createBaseApiServer({
 *   port: 3000,
 *   serviceName: 'myapp',
 *   cors: { origins: ['https://myapp.example.com'] },
 *   rateLimit: { preset: 'standard' },
 * })
 *
 * app.get('/api/hello', (_req, res) => res.json({ ok: true }))
 * ```
 */
export function createBaseApiServer(config: ServerConfig): ApiServer {
  const logger: ServerLogger = config.logger ?? silentLogger
  const serviceName = config.serviceName ?? 'API'

  const app: Express = express()

  // Defense in depth (Wave B Lot 1 — H1 CORS case-fold bypass fix):
  // Express defaults `case sensitive routing` to `false`, which would route
  // `POST /api/auth/Login` (capital L) to the lower-cased `/api/auth/login`
  // handler. Combined with the case-sensitive `isCookiePath()` check below,
  // an attacker could land in the auth handler (cookie issued) while the
  // permissive CORS middleware also ran (origin reflected) — a full CSRF
  // login bypass on every cookie-auth route.
  //
  // Forcing case-sensitive routing makes mismatched-case URLs return 404,
  // so even if a future caller forgets the lowercase normalization in
  // `isCookiePath`, the auth handler never executes for the spoofed path.
  //
  // REST URLs in this monorepo are lowercase by convention — no consumer
  // route relies on mixed-case path matching.
  app.set('case sensitive routing', true)

  // Trust proxy hops — defaults to 2 (Railway edge → Fastly CDN). Express picks
  // the real client IP from X-Forwarded-For (last N IPs are stripped as
  // trusted), not the LB IP. CRITICAL for accurate per-IP rate limiting on
  // anonymous routes.
  //
  // Wave B Lot 3 (H5): hop count is now env-configurable to survive infra
  // changes (adding Cloudflare → 3 hops, removing Fastly → 1 hop). A bad
  // hardcoded value silently lets attackers spoof `req.ip` via crafted XFF.
  //
  // Precedence: `config.trustProxyHops` > `TRUST_PROXY_HOPS` env > 2.
  // - Numeric (`'2'`, `'3'`, `'0'`) → trust that many rightmost hops.
  // - `'true'` → trust ALL hops (dangerous, only for tests behind known LBs).
  // - `0` → disable trust entirely (`req.ip` = direct socket address).
  // - Unparseable / negative → log error, fall back to 2.
  const trustProxyEnv = process.env.TRUST_PROXY_HOPS
  let trustProxy: number | boolean = 2
  if (config.trustProxyHops !== undefined) {
    trustProxy = config.trustProxyHops
  } else if (trustProxyEnv !== undefined) {
    if (trustProxyEnv === 'true') {
      trustProxy = true
    } else {
      const parsed = Number.parseInt(trustProxyEnv, 10)
      if (Number.isFinite(parsed) && parsed >= 0) {
        trustProxy = parsed
      } else {
        logger.error(`[api-core] Invalid TRUST_PROXY_HOPS=${trustProxyEnv}, falling back to 2`)
        trustProxy = 2
      }
    }
  }
  app.set('trust proxy', trustProxy)

  // Security headers (Helmet). Opt-out via `config.security: false` for
  // services that need to set their own helmet config (rare).
  //
  // Wave B Lot 4 (H9, 2026-05-16): `crossOriginResourcePolicy` reverted to
  // helmet's default `same-origin` per
  // `.claude/rules/standard-saas-security.md` §1. The previous `cross-origin`
  // setting weakened browser isolation — combined with the (now-fixed) H1 CORS
  // case-fold bypass, a hostile origin could fetch the API JSON response body
  // and read session-establishment payloads or error-message-based
  // password-enumeration oracles. With `same-origin`, the browser blocks the
  // body read regardless of CORS, restoring defense-in-depth.
  //
  // Callers that genuinely need to embed API JSON cross-origin (rare — most
  // public reads should sit on a CDN with its own CORP policy) can opt out by
  // passing `security: false` and mounting their own helmet config.
  //
  // CSP stays disabled — Next.js consumers ship per-route CSPs via
  // `vercel.json` / middleware. The boot-time warning below (H8) catches the
  // operator footgun if a new service forgets to layer one on top.
  if (config.security !== false) {
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'same-origin' },
        contentSecurityPolicy: false,
      })
    )

    // Wave B Lot 3 (H8): Helmet's CSP is intentionally disabled — Next.js
    // consumers ship per-route CSPs via `vercel.json` / middleware, and API
    // services typically need none. BUT if a new service forgets to layer
    // one on top, defense-in-depth against XSS (Swagger UI schema injection,
    // adjacent static content, etc.) is silently lost.
    //
    // Emit a single warn at boot when running in production unless the
    // caller explicitly acknowledges via `disableCspWarning: true`. Skipped
    // in non-prod to keep dev / vitest output quiet.
    if (process.env.NODE_ENV === 'production' && config.disableCspWarning !== true) {
      logger.warn(
        '[api-core] Content-Security-Policy disabled and no override detected. ' +
          'XSS mitigation reduced. Mount a CSP middleware in the consumer app ' +
          '(helmet.contentSecurityPolicy) or set `disableCspWarning: true` if intentional.'
      )
    }
  }

  // CORS — 3-tier policy (see .claude/rules/standard-saas-cors.md).
  //
  // 1. Permissive CORS (`ACAO: *`, `credentials: false`) applies to every
  //    path NOT listed in `cookieAuthRoutes`. Safe for Tier 1 (public /
  //    publishable-key) and Tier 2 (Bearer-auth) endpoints because neither
  //    relies on cookies.
  //
  // 2. Strict CORS applies ONLY to paths matching a `cookieAuthRoutes`
  //    prefix: reflects origin only when it matches `cookieAuthAllowlist`,
  //    sends `credentials: true`. Required for Tier 3 (cookie-auth) to
  //    block CSRF from arbitrary origins.
  //
  // The two middlewares are mutually exclusive per-path — they never stack
  // on the same request. Stacking would cause the permissive `ACAO: *`
  // header to leak into rejected strict responses.
  //
  // The legacy `cors` option is honored for backcompat: when provided, it
  // wins over the 3-tier defaults (single middleware applied globally). New
  // code should use `cookieAuthRoutes` + `cookieAuthAllowlist` instead.
  if (config.cors !== undefined) {
    // Legacy path — single global CORS middleware.
    app.use(createCorsMiddleware(config.cors))
  } else {
    const cookieRoutes = config.cookieAuthRoutes ?? []
    const cookieAllowlist = config.cookieAuthAllowlist ?? []

    if (cookieRoutes.length > 0 && cookieAllowlist.length === 0) {
      logger.warn(
        '[api-core] cookieAuthRoutes set but cookieAuthAllowlist is empty — all cross-origin cookie requests will be rejected',
        { cookieAuthRoutes: cookieRoutes }
      )
    }

    // Register strict middlewares FIRST so they claim cookie-auth paths
    // before the permissive fallback ever runs.
    for (const prefix of cookieRoutes) {
      app.use(prefix, createStrictCorsMiddleware({ allowlist: cookieAllowlist, logger }))
    }

    // Permissive fallback — only runs when no strict middleware already
    // handled the response (i.e. the path is not under `cookieAuthRoutes`).
    //
    // Defense in depth (Wave B Lot 1 — H1): the prefix match is done on a
    // lower-cased copy of both the URL and the configured prefixes. Even
    // though `app.set('case sensitive routing', true)` above turns the
    // mismatched-case attack into a 404, this lowercase compare prevents
    // any future Express-routing-setting drift from re-opening the bypass.
    // Both layers must hold for the bypass to be possible.
    const permissive = createPermissiveCorsMiddleware()
    const lowerCookieRoutes = cookieRoutes.map(p => p.toLowerCase())
    const isCookiePath = (url: string): boolean => {
      const lower = url.toLowerCase()
      return lowerCookieRoutes.some(prefix => lower === prefix || lower.startsWith(`${prefix}/`))
    }
    app.use((req, res, next) => {
      if (cookieRoutes.length > 0 && isCookiePath(req.path)) return next()
      permissive(req, res, next)
    })
  }

  // Raw body routes (webhooks) must be registered BEFORE the JSON parser.
  if (config.rawBodyRoutes) {
    for (const route of config.rawBodyRoutes) {
      app.use(route, express.raw({ type: 'application/json' }))
    }
  }

  app.use(express.json({ limit: '100kb' }))
  app.use(express.urlencoded({ extended: true, limit: '100kb' }))

  // Health + root endpoints — mounted BEFORE global rate limiting so they
  // remain reachable even under heavy load (the limiter's `skipPaths` also
  // defaults to `['/health', '/api/health']`).
  const healthPath = config.healthPath ?? HEALTH_PATH_DEFAULT
  const rootPath = config.rootPath ?? ROOT_PATH_DEFAULT

  // Wave B Lot 4 (M4, 2026-05-16): `/health` is unauthenticated by design
  // (Railway/Vercel liveness probes hit it without credentials). Surfacing
  // `service` + `timestamp` in production gives attackers a free recon
  // signal — curl /health on every Railway subdomain to map the entire
  // deployment ('ezauth' / 'ezpay' / etc.). In production we now respond
  // with the bare `{ status: 'ok' }` k8s/Railway need and nothing more.
  // Dev/staging keep the richer payload so operators can sanity-check which
  // service answered.
  const isProductionEnv = process.env.NODE_ENV === 'production'
  const healthHandler: express.RequestHandler = (_req, res) => {
    if (isProductionEnv) {
      res.status(200).json({ status: 'ok' })
      return
    }
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    })
  }

  app.get(healthPath, healthHandler)

  // Legacy `/api/health` kept for backwards compatibility with clients that
  // already target the old path.  Skipped when the caller explicitly set
  // `healthPath` to something custom (they own the mapping).
  if (!config.healthPath && healthPath !== HEALTH_PATH_LEGACY) {
    app.get(HEALTH_PATH_LEGACY, healthHandler)
  }

  // Deep health (readiness probe) — pings the DB connector + every
  // caller-supplied check in parallel. 200 on `ok | degraded`, 503 on `down`.
  // Mounted unconditionally: when no DB and no checks are configured, the
  // endpoint just returns the uptime / version snapshot — still useful for
  // status-page polling. See `.claude/rules/standard-saas-observability.md` §4.
  //
  // Wave B Lot 4 (M5, 2026-05-16): the deep handler is fronted by a strict
  // rate-limiter (5 req/min) AND a 1-second response cache to neutralise the
  // DoS vector reported in the hacker audit — `ab -n 1000 -c 100 /health/deep`
  // previously opened 100 concurrent Mongoose pool slots, starving real
  // requests. The cache means status pages polling every few seconds still
  // get fresh data, while a flood of concurrent pings collapses to a single
  // backing check per second. Each rate-limit token is independent of the
  // global limiter so legitimate user traffic isn't affected.
  const deepHealthPath = config.deepHealthPath ?? HEALTH_DEEP_PATH_DEFAULT
  app.get(
    deepHealthPath,
    createStrictRateLimiter({ skipPaths: [] }),
    createDeepHealthHandler({
      serviceName,
      db: config.db,
      checks: config.deepHealthChecks,
      cacheMs: 1_000,
    })
  )

  app.get(rootPath, (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    })
  })

  // Global rate limiting — opt-in via `rateLimit` config.
  if (config.rateLimit) {
    const factory = resolveRateLimiter(config.rateLimit.preset)
    app.use(factory(config.rateLimit.options))
    logger.debug('[api-core] Rate limiter applied globally', {
      preset: config.rateLimit.preset ?? 'standard',
    })
  }

  return {
    app,
    config: { ...config, port: config.port, serviceName },
    logger,
  }
}
