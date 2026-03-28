// Updated: 2025-11-15 - App-specific roles support + AI SDK integration
// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  connectToMongo,
  createApp,
  createRateLimiter,
  startServer,
  Router,
  getApiPort,
  createVersionedRouter,
  addVersionHeader
} from '@ezstart/express-core'
import routes, { globalRegistry } from './routes/index.js'
import { initializeAIProviders } from './config/ai-providers.js'
import { seedDefaultPrompts } from './services/prompt.service.js'

export const app = createApp({ apiApp: 'green-pulse' })
const PORT = getApiPort('green-pulse')

// ✅ Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// ✅ API routes with versioning support (supports both /api and /api/v1)
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes
Sentry.setupExpressErrorHandler(app)

// Initialize AI providers
initializeAIProviders()

// Start server with MongoDB
connectToMongo('greenpulse')
  .then(async () => {
    // Seed default prompts if database is empty
    await seedDefaultPrompts()

    return startServer(app, {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GreenPulse',
      port: PORT,
    })
  })
  .catch(err => {
    logger.error('❌ Failed to start GreenPulse API', err)
    process.exit(1)
  })