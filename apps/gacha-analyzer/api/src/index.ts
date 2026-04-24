// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  addVersionHeader,
  connectToMongo,
  createEzstartServer,
  createVersionedRouter,
  startServer,
} from '@ezstart/api-core'
import routes, { globalRegistry } from './routes/index.js'

// No cookie-auth routes: gacha-analyzer consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
const server = createEzstartServer('gacha-analyzer', { cookieAuthRoutes: [] })
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

// Start server with MongoDB
// NOTE: routes are already mounted above via createVersionedRouter — pass an
// empty Router() to startServer so it doesn't mount them a second time, while
// still generating the OpenAPI doc at /docs.
connectToMongo('game-analyzer')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GachaAnalyzer',
      port: server.config.port,
      logger: server.logger,
    })
  )
  .catch(err => {
    logger.error('Failed to start Gacha Analyzer API', err)
    process.exit(1)
  })

export { app }
