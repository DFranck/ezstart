// Updated: 2025-11-15 - App-specific roles support
// Import Sentry FIRST (instrument.mts initializes Sentry before anything else)
import './instrument.mjs'
import { Sentry } from './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  addVersionHeader,
  connectToMongo,
  createEzstartServer,
  createSocketServer,
  createVersionedRouter,
  startServer,
} from '@ezstart/api-core'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { routes, registries, setScheduler } from './routes/index.js'
import { HealthCheckScheduler } from './services/healthCheckScheduler.js'
import { initializeAIProviders } from './config/ai-providers.js'
import { seedDefaultPrompts, seedDefaultAppProviders } from './services/ai-prompt.service.js'
import { seedGlobalProviders } from './services/provider-access.service.js'
import type { Server as IOServer } from 'socket.io'

// Create pre-configured Express app (CORS auto-wired for ezstart hub)
const server = createEzstartServer('ezstart')
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// CORS origins for Socket.IO (all web apps can connect to the monitoring hub)
const socketCorsOrigins = getAllowedOrigins('ezstart')

// Store Socket.IO instance to be used by scheduler
let io: IOServer

// Initialize health check scheduler
const healthCheckScheduler = new HealthCheckScheduler()

// Expose scheduler to routes
setScheduler(healthCheckScheduler)

// Health check endpoint (non-versioned, returns scheduler status too)
// Note: createEzstartServer already mounts GET /api/health with the basic
// payload — this one overrides it with the scheduler snapshot, mounted BEFORE
// versioned routes so it wins in the middleware chain.
app.get('/api/health', (_, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'monitoring-api',
    timestamp: new Date().toISOString(),
    scheduler: healthCheckScheduler.getStatus(),
  })
})

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Sentry error handler MUST be AFTER all routes/controllers
Sentry.setupExpressErrorHandler(app)

// Connect to MongoDB and start server.
// Scheduler MUST start only after MongoDB is ready.
connectToMongo('ezstart')
  .then(() => {
    initializeAIProviders()

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
      port: server.config.port,
      logger: server.logger,
      onHttpServerReady: httpServer => {
        // createSocketServer is async in api-core — fire-and-forget wire-up
        // keeps the HTTP listener available immediately; the Socket.IO layer
        // attaches as soon as the dynamic `socket.io` import resolves.
        createSocketServer(httpServer, {
          corsOrigins: socketCorsOrigins,
          onConnection: socket => {
            logger.info('[Socket.IO] Client connected from monitoring dashboard')
            socket.on('disconnect', () => {
              logger.info('[Socket.IO] Client disconnected')
            })
          },
          logger: server.logger,
        })
          .then(instance => {
            io = instance
            healthCheckScheduler.setSocketIO(io)
          })
          .catch(err => {
            logger.error('[Socket.IO] Failed to initialize', err)
          })
      },
    })
  })
  .then(() => {
    logger.info('[Scheduler] Starting health check scheduler...')
    healthCheckScheduler.start()
  })
  .catch(err => {
    logger.error('Failed to start Monitoring API', err)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[Scheduler] SIGTERM received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('[Scheduler] SIGINT received, stopping scheduler...')
  healthCheckScheduler.stop()
  process.exit(0)
})

export { app }
