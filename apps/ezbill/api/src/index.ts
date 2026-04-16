// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
// Updated: 2025-11-15 - App-specific roles support
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

const server = createEzstartServer('ezbill')
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

connectToMongo('ezbill')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'EZBill',
      port: server.config.port,
      logger: server.logger,
    })
  )
  .catch(err => {
    logger.error('Failed to start EZBill API', err)
    process.exit(1)
  })

export { app }
