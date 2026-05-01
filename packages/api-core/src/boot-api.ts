/**
 * `bootApi` — unified API boot ceremony for the @ezstart monorepo.
 *
 * Wraps the canonical sequence every API performs at startup so each app's
 * `index.ts` shrinks to a thin descriptor (routes + per-app warmup) instead
 * of re-implementing the same orchestration:
 *
 *   1. `createApiServer(slug, options)` — pre-configured Express app with
 *      port resolution, 3-tier CORS and rate limiting.
 *   2. Mount `addVersionHeader('v1')` on every response.
 *   3. Optionally mount `attachDerivedMode` + `withRequestContextMiddleware`
 *      (Stripe-pattern test/live partition — required only for APIs that
 *      consume publishable/secret keys: EZAuth, EZPay).
 *   4. `connectToMongo(mongoDbName)`.
 *   5. Await the optional `onReady({ app, mongoose })` hook so callers can
 *      warm Mongoose models, seed defaults, etc. — runs BEFORE listen so
 *      first-request latency stays low and any error aborts boot cleanly.
 *   6. `startServer(app, ...)` and return `{ app, server }`.
 *
 * The helper is OPT-IN: existing `index.ts` files keep working unchanged.
 * Migrate apps incrementally — risk is low because the underlying primitives
 * (`createApiServer`, `connectToMongo`, `startServer`) are unchanged.
 *
 * @example
 * ```ts
 * import { bootApi } from '@ezstart/api-core'
 * import routes, { globalRegistry } from './routes/index.js'
 *
 * await bootApi('ezbill', {
 *   mongoDbName: 'ezbill',
 *   serverConfig: {
 *     routes,
 *     registries: [globalRegistry],
 *     basePath: '/api',
 *     serviceName: 'EZBill',
 *   },
 * })
 * ```
 *
 * @example With model warmup
 * ```ts
 * await bootApi('ezauth', {
 *   mongoDbName: 'ezauth',
 *   useDerivedMode: true,
 *   onReady: async () => {
 *     await getAuthUserModel()
 *     await getApiKeyModel()
 *   },
 *   serverConfig: { routes, registries, serviceName: 'EZAuth' },
 * })
 * ```
 */

import type { Express } from 'express'
import type { Server as HttpServer } from 'http'

import type { AppName } from '@ezstart/config/urls'

import { connectToMongo } from './connect-to-mongo.js'
import { createApiServer, type ApiServerOptions } from './create-api-server.js'
import { attachDerivedMode, withRequestContextMiddleware } from './core/middleware/derive-mode.js'
import { startServer, type StartServerOptions } from './core/server.js'
import type { ApiServer, ServerLogger } from './core/types.js'
import { addVersionHeader } from './core/versioning.js'

/**
 * Subset of {@link StartServerOptions} that the caller controls. `port` and
 * `logger` are filled in by `bootApi` from the resolved `ApiServer` so the
 * caller never has to re-thread them.
 */
export type BootServerConfig = Omit<StartServerOptions, 'port' | 'logger'> & {
  /**
   * Override the port resolved by `createApiServer`. Rare — tests or ad-hoc
   * deployments only.
   */
  port?: number
  /** Override the logger injected by `createApiServer`. */
  logger?: StartServerOptions['logger']
}

/**
 * Hook invoked AFTER `connectToMongo` resolves and BEFORE `startServer`
 * binds the listener. Use it to warm Mongoose models (so the first request
 * does not pay the schema-compilation cost), seed default rows, or mount
 * extra routes that need the version-header middleware in front of them.
 *
 * Errors thrown here abort boot — they bubble up to the caller's `catch`
 * and the process exits with code 1.
 */
export type OnReadyHook = (deps: { app: Express; logger: ServerLogger }) => Promise<void> | void

/**
 * Options accepted by `bootApi`.
 */
export interface BootApiOptions extends ApiServerOptions {
  /**
   * MongoDB database name passed to `connectToMongo`. Most apps map 1:1 to
   * their slug (`'ezauth'`, `'ezpay'`, ...) but some intentionally diverge
   * (e.g. `gacha-analyzer` uses `'game-analyzer'`).
   */
  mongoDbName: string
  /**
   * Mount `attachDerivedMode` + `withRequestContextMiddleware` so the
   * Stripe-pattern test/live partition is enforced on every request.
   *
   * Default `false`. Enable on APIs that consume publishable / secret API
   * keys (`ez_pk_*` / `ez_sk_*`) so live keys never read test data and
   * vice versa. See `.claude/rules/standard-saas-data.md` §4.
   */
  useDerivedMode?: boolean
  /**
   * Hook invoked between `connectToMongo` and `startServer`. Awaited — any
   * thrown error aborts boot.
   */
  onReady?: OnReadyHook
  /**
   * `startServer` configuration. `port` and `logger` are inherited from the
   * resolved {@link createApiServer} result when omitted.
   */
  serverConfig: BootServerConfig
}

/**
 * Result of {@link bootApi}.
 */
export interface BootApiResult {
  /** The underlying Express app (escape hatch for ad-hoc wiring). */
  app: Express
  /** The bound HTTP server returned by `startServer`. */
  server: HttpServer
  /**
   * Resolved {@link ApiServer} surface — exposes the bound logger and config
   * so callers can keep using the same logger instance for post-listen wiring
   * (e.g. Socket.IO, schedulers).
   */
  apiServer: ApiServer
}

/**
 * Run the unified API boot ceremony. Returns once the HTTP listener is bound.
 *
 * @example
 * ```ts
 * import { bootApi } from '@ezstart/api-core'
 *
 * await bootApi('ezbill', {
 *   mongoDbName: 'ezbill',
 *   serverConfig: { routes, registries: [globalRegistry], serviceName: 'EZBill' },
 * })
 * ```
 */
export async function bootApi(slug: AppName, options: BootApiOptions): Promise<BootApiResult> {
  const { mongoDbName, useDerivedMode = false, onReady, serverConfig, ...createOptions } = options

  const apiServer = createApiServer(slug, createOptions)
  const { app } = apiServer

  // API version headers on every response — mounted unconditionally so all
  // monorepo APIs surface the same `API-Version` / `X-API-Version` headers.
  app.use(addVersionHeader('v1'))

  // Stripe-pattern test/live partition. Only required for APIs that consume
  // `ez_pk_*` / `ez_sk_*` keys — opting in by default would tag cookie-auth
  // dashboard requests with a `derivedMode` they don't need.
  if (useDerivedMode) {
    app.use(attachDerivedMode)
    app.use(withRequestContextMiddleware)
  }

  await connectToMongo(mongoDbName)

  if (onReady) {
    await onReady({ app, logger: apiServer.logger })
  }

  const server = await startServer(app, {
    ...serverConfig,
    port: serverConfig.port ?? apiServer.config.port,
    logger: serverConfig.logger ?? apiServer.logger,
  })

  return { app, server, apiServer }
}
