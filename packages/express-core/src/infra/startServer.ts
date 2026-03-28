import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import express from 'express'
import { createServer, Server as HTTPServer } from 'http'
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
    port = 5000,
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
      (total, path: any) => total + Object.keys(path).filter(k => ['get', 'post', 'put', 'patch', 'delete'].includes(k)).length,
      0
    )

    console.log('📏 [OpenAPI] Documentation generated')
    console.log(`   Modules: ${registries.length}`)
    console.log(`   Paths: ${pathsCount}`)
    console.log(`   Operations: ${operationsCount}`)

    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc))
  }

  const server = createServer(app)
  server.listen(port, () => {
    const url = `http://localhost:${port}`
    console.log(`🚀 [${serviceName}] Server started`)
    console.log(`   URL: ${url}`)
    if (registries.length > 0) {
      console.log(`   Docs: ${url}/docs`)
    }
  })

  // Graceful shutdown handling
  const signals = ['SIGINT', 'SIGTERM'] as const
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`\n📴 [${serviceName}] Gracefully shutting down server (${signal})`)
      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown', err)
          process.exit(1)
        }
        console.log('✅ Server closed successfully')
        process.exit(0)
      })
    })
  })

  if (onHttpServerReady) {
    onHttpServerReady(server)
  }

  return server
}
