// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
// Updated: 2025-11-15 - App-specific roles support
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  getApiPort,
  startServer,
  createVersionedRouter,
  addVersionHeader,
} from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'
import { logger } from '@ezstart/logger/server'

export const app = createApp({ apiApp: 'ezbill' })
const PORT = getApiPort('ezbill')

// ✅ Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// ✅ API routes with versioning support (supports both /api and /api/v1)
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
      port: Number(PORT),
    })
  )
  .catch(err => {
    logger.error('❌ Failed to start EZBill API', err)
    process.exit(1)
  })
// trigger deploy
