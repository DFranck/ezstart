// Updated: 2025-11-15 - App-specific roles support
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
import routes, { registries } from './routes/index.js'

// Create pre-configured server with Stripe webhook raw-body route
const server = createEzstartServer('ezpay', {
  rawBodyRoutes: ['/api/webhooks/stripe'],
})
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Start server
connectToMongo('ezpay')
  .then(() =>
    startServer(app, {
      routes,
      registries,
      serviceName: 'EZPay',
      port: server.config.port,
      logger: server.logger,
    })
  )
  .catch(err => {
    logger.error('Failed to start EZPay API', err)
    process.exit(1)
  })

export { app }
