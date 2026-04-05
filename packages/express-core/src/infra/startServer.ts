import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { logger } from '@ezstart/logger/server'
import * as swaggerUi from 'swagger-ui-express'

type StartServerOptions = {
  routes: express.Router
  registries?: OpenAPIRegistry[]
  basePath?: string
  serviceName?: string
  port?: number
  onHttpServerReady?: (server: HTTPServer) => void
}

export function startServer(app: express.Express, opts: StartServerOptions): HTTPServer {
  const {
    routes,
    registries = [],
    basePath = '',
    serviceName = 'API',
    port = 6100,
    onHttpServerReady,
  } = opts

  app.use(basePath || '/', routes)

  if (registries.length > 0) {
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

    const pathsCount = Object.keys(openApiDoc.paths || {}).length
    const operationsCount = Object.values(openApiDoc.paths || {}).reduce(
      (total, path) =>
        total +
        Object.keys(path).filter(k => ['get', 'post', 'put', 'patch', 'delete'].includes(k)).length,
      0
    )

    logger.info('📏 [OpenAPI] Documentation generated')
    logger.debug(`   Modules: ${registries.length}`)
    logger.debug(`   Paths: ${pathsCount}`)
    logger.debug(`   Operations: ${operationsCount}`)

    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc))
  }

  const server = createServer(app)
  server.listen(port, () => {
    const url = `http://localhost:${port}`
    logger.info(`🚀 [${serviceName}] Server started`)
    logger.info(`   URL: ${url}`)
    if (registries.length > 0) {
      logger.info(`   Docs: ${url}/docs`)
    }
  })

  // Graceful shutdown handling
  const signals = ['SIGINT', 'SIGTERM'] as const
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`📴 [${serviceName}] Gracefully shutting down server (${signal})`)
      server.close(err => {
        if (err) {
          logger.error('❌ Error during server shutdown', err)
          process.exit(1)
        }
        logger.info('✅ Server closed successfully')
        process.exit(0)
      })
    })
  })

  if (onHttpServerReady) {
    onHttpServerReady(server)
  }

  return server
}
