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

const server = createEzstartServer('green-pulse')
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

// Start server with MongoDB
connectToMongo('greenpulse')
  .then(() =>
    startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GreenPulse',
      port: server.config.port,
      logger: server.logger,
    })
  )
  .catch(err => {
    logger.error('Failed to start GreenPulse API', err)
    process.exit(1)
  })

export { app }
