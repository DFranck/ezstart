/**
 * `createApiServer` — factory that wires an Express app with the defaults
 * expected from an `@ezstart`-compatible API (CORS, JSON parser, trust proxy,
 * health/root endpoints, optional global rate limiting).
 *
 * The returned object exposes the raw `app` so callers can attach their own
 * routers/middlewares before handing it off to `startServer`.
 */

import express, { type Express } from 'express'
import './express-aug.js'
import { createCorsMiddleware } from './middleware/cors.js'
import {
  createModerateRateLimiter,
  createRateLimiter,
  createStrictRateLimiter,
  createVeryStrictRateLimiter,
} from './middleware/rate-limit.js'
import { silentLogger } from './internal/logger.js'
import type { ApiServer, RateLimitPreset, ServerConfig, ServerLogger } from './types.js'

const HEALTH_PATH_DEFAULT = '/api/health'
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
 * Build a fully-wired Express app.
 *
 * @example
 * ```ts
 * import { createApiServer, startServer } from '@ezstart/api-core'
 *
 * const { app, logger } = createApiServer({
 *   port: 3000,
 *   serviceName: 'myapp',
 *   cors: { origins: ['https://myapp.example.com'] },
 *   rateLimit: { preset: 'standard' },
 * })
 *
 * app.get('/api/hello', (_req, res) => res.json({ ok: true }))
 * ```
 */
export function createApiServer(config: ServerConfig): ApiServer {
  const logger: ServerLogger = config.logger ?? silentLogger
  const serviceName = config.serviceName ?? 'API'

  const app: Express = express()

  // Required behind reverse proxies (Railway / Vercel) so the real client IP
  // is exposed via X-Forwarded-For — critical for rate limiting.
  app.set('trust proxy', true)

  // CORS (default: open — caller should override in production).
  app.use(createCorsMiddleware(config.cors ?? '*'))

  // Raw body routes (webhooks) must be registered BEFORE the JSON parser.
  if (config.rawBodyRoutes) {
    for (const route of config.rawBodyRoutes) {
      app.use(route, express.raw({ type: 'application/json' }))
    }
  }

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health + root endpoints — mounted BEFORE global rate limiting so they
  // remain reachable even under heavy load (the limiter's `skipPaths` also
  // default to `/api/health`).
  const healthPath = config.healthPath ?? HEALTH_PATH_DEFAULT
  const rootPath = config.rootPath ?? ROOT_PATH_DEFAULT

  app.get(healthPath, (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    })
  })

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
