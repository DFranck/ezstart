// Updated: 2025-11-15 - App-specific roles support
// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  getApiPort,
  startServer,
  createVersionedRouter,
  addVersionHeader
} from '@ezstart/express-core'
import routes, { registries } from './routes/index.js'

const PORT = getApiPort('ezpay')

// Create app with raw body routes for webhook signature verification
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
  apiApp: 'ezpay',
})

// ✅ Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// ✅ API routes with versioning support (supports both /api and /api/v1)
app.use(createVersionedRouter('/api', routes))

// Sentry error handler (called automatically by expressIntegration)
// MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Start server
connectToMongo('ezpay')
  .then(() =>
    startServer(app, {
      routes,
      registries,
      serviceName: 'EZPay',
      port: PORT,
    })
  )
  .catch(err => {
    logger.error('❌ Failed to start EZPay API', err)
    process.exit(1)
  })
