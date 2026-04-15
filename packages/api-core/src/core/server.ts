/**
 * `startServer` — bind an Express app to a port, mount the OpenAPI routers
 * and docs endpoint, and wire a graceful-shutdown handler.
 */

import { OpenApiGeneratorV3, type OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { Express, Router } from 'express'
import { createServer, type Server as HttpServer } from 'http'
import * as swaggerUi from 'swagger-ui-express'
import { silentLogger } from './internal/logger.js'
import type { DbConnector } from './internal/db-connector.js'
import type { ServerLogger } from './types.js'

/**
 * Options accepted by `startServer`.
 */
export type StartServerOptions = {
  /** Main router — mounted at `basePath` (or `/`). */
  routes: Router
  /** OpenAPI registries to flush into the generated document. */
  registries?: OpenAPIRegistry[]
  /** Prefix where `routes` is mounted. Default `''` (root). */
  basePath?: string
  /** Human-readable service name used in logs & the OpenAPI title. */
  serviceName?: string
  /** Port to listen on. Required. */
  port: number
  /** Optional DB connector — awaited before the listener starts. */
  db?: DbConnector
  /** Hook invoked once the HTTP server is created (pre-listen). */
  onHttpServerReady?: (server: HttpServer) => void
  /** Hook invoked once the listener is bound. */
  onReady?: (server: HttpServer) => void
  /** Hook invoked during graceful shutdown (after `server.close`, before `process.exit`). */
  onShutdown?: () => Promise<void> | void
  /** Logger override. Default is silent (no-op). */
  logger?: ServerLogger
}

function mountOpenApi(
  app: Express,
  registries: OpenAPIRegistry[],
  basePath: string,
  serviceName: string,
  logger: ServerLogger
): void {
  if (registries.length === 0) return

  const allDefinitions = registries.flatMap(r => r.definitions)
  const generator = new OpenApiGeneratorV3(allDefinitions)
  const openApiDoc = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: `${serviceName} API`,
      version: '1.0.0',
      description: `Auto-generated docs for ${serviceName}`,
    },
    servers: [{ url: basePath || '/' }],
  })

  const pathsCount = Object.keys(openApiDoc.paths ?? {}).length
  const operationsCount = Object.values(openApiDoc.paths ?? {}).reduce<number>(
    (total, path) =>
      total +
      Object.keys(path as Record<string, unknown>).filter(k =>
        ['get', 'post', 'put', 'patch', 'delete'].includes(k)
      ).length,
    0
  )

  logger.info('[OpenAPI] Documentation generated', {
    modules: registries.length,
    paths: pathsCount,
    operations: operationsCount,
  })

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc))
}

/**
 * Start an HTTP server bound to an Express app.
 *
 * @example
 * ```ts
 * import { Router } from 'express'
 * import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
 * import { createApiServer, startServer } from '@ezstart/api-core'
 *
 * const { app } = createApiServer({ port: 3000 })
 * const registry = new OpenAPIRegistry()
 * const routes = Router()
 *
 * await startServer(app, {
 *   routes,
 *   registries: [registry],
 *   port: 3000,
 *   serviceName: 'MyApp',
 * })
 * ```
 */
export async function startServer(app: Express, opts: StartServerOptions): Promise<HttpServer> {
  const {
    routes,
    registries = [],
    basePath = '',
    serviceName = 'API',
    port,
    db,
    onHttpServerReady,
    onReady,
    onShutdown,
    logger = silentLogger,
  } = opts

  if (db) {
    await db.connect()
  }

  app.use(basePath || '/', routes)
  mountOpenApi(app, registries, basePath, serviceName, logger)

  const server = createServer(app)
  onHttpServerReady?.(server)

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => {
      server.off('error', reject)
      const url = `http://localhost:${port}`
      logger.info(`[${serviceName}] Server started`, { url })
      if (registries.length > 0) {
        logger.info(`[${serviceName}] Docs`, { url: `${url}/docs` })
      }
      resolve()
    })
  })

  onReady?.(server)

  const signals = ['SIGINT', 'SIGTERM'] as const
  for (const signal of signals) {
    process.on(signal, () => {
      logger.info(`[${serviceName}] Gracefully shutting down (${signal})`)
      server.close(err => {
        const finalize = async (): Promise<void> => {
          try {
            if (onShutdown) await onShutdown()
            if (db) await db.disconnect()
          } catch (shutdownErr) {
            logger.error('Error during shutdown hook', shutdownErr)
          }
        }
        finalize()
          .then(() => {
            if (err) {
              logger.error('Error during server shutdown', err)
              process.exit(1)
            }
            logger.info('Server closed successfully')
            process.exit(0)
          })
          .catch(() => {
            process.exit(1)
          })
      })
    })
  }

  return server
}
