// Updated: 2025-11-15 - App-specific roles support
// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  createApp,
  createRateLimiter,
  startServer,
  connectToMongo,
  getApiPort,
  createSocketServer,
  createVersionedRouter,
  addVersionHeader,
} from '@ezstart/express-core'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { routes, registries, setScheduler } from './routes/index.js'
import { HealthCheckScheduler } from './services/healthCheckScheduler.js'
import { initializeAIProviders } from './config/ai-providers.js'
import { seedDefaultPrompts, seedDefaultAppProviders } from './services/ai-prompt.service.js'
import { seedGlobalProviders } from './services/provider-access.service.js'
import type { Server as IOServer } from 'socket.io'

const PORT = getApiPort('ezstart')

// Create Express app with CORS auto-configured
// Monitoring API is called by ALL web apps (dashboard in EZStart)
const app = createApp({ apiApp: 'ezstart' })

// ✅ Rate limiting protection (100 req/15min per IP, excludes /api/health)
app.use(createRateLimiter())

// ✅ Add API version headers to all responses
app.use(addVersionHeader('v1'))

// Get CORS origins for Socket.IO (all web apps can connect)
const socketCorsOrigins = getAllowedOrigins('ezstart')

// Store Socket.IO instance to be used by scheduler
let io: IOServer

// Initialize health check scheduler
const healthCheckScheduler = new HealthCheckScheduler()

// Expose scheduler to routes
setScheduler(healthCheckScheduler)

// Health check endpoint (non-versioned for simplicity)
app.get('/api/health', (_, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'monitoring-api',
    timestamp: new Date().toISOString(),
    scheduler: healthCheckScheduler.getStatus(),
  })
})

// ✅ API routes with versioning support (supports both /api and /api/v1)
app.use(createVersionedRouter('/api', routes))

// Sentry error handler (called automatically by expressIntegration)
// MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Connect to MongoDB and start server
// Wait for MongoDB to be fully ready before starting scheduler
connectToMongo('ezstart')
  .then(() => {
    // Initialize AI providers after MongoDB is ready
    initializeAIProviders()

    // Seed default AI prompts and app providers if none exist (for each known app)
    seedDefaultPrompts('ezstart').catch(() => {
      /* non-blocking */
    })
    seedDefaultAppProviders('ezstart').catch(() => {
      /* non-blocking */
    })
    seedGlobalProviders().catch(() => {
      /* non-blocking */
    })

    return startServer(app, {
      routes,
      registries,
      serviceName: 'Monitoring API',
      port: PORT,
      onHttpServerReady: httpServer => {
        // Create Socket.IO server with CORS matching Express CORS
        io = createSocketServer(httpServer, {
          corsOrigins: socketCorsOrigins,
          onConnection: socket => {
            logger.info(`📡 [Socket.IO] Client connected from monitoring dashboard`)

            socket.on('disconnect', () => {
              logger.info(`📡 [Socket.IO] Client disconnected`)
            })
          },
        })

        // Pass Socket.IO instance to scheduler for real-time updates
        healthCheckScheduler.setSocketIO(io)
      },
    })
  })
  .then(() => {
    logger.info('✅ [Scheduler] Starting health check scheduler...')
    // Start background health check scheduler ONLY after MongoDB is ready
    healthCheckScheduler.start()
  })
  .catch(err => {
    logger.error('❌ Failed to start Monitoring API', err)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('⏰ [Scheduler] SIGTERM received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('⏰ [Scheduler] SIGINT received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})
// trigger deploy
