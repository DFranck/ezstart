// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  bootApi,
  createAnthropicCheck,
  createGeminiCheck,
  createMongoosePingCheck,
  createOpenAICheck,
  createResendCheck,
  createSocketServer,
  createVersionedRouter,
  type HealthCheck,
} from '@ezstart/api-core'
import mongoose from 'mongoose'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { routes, registries, setScheduler } from './routes/index.js'
import { HealthCheckScheduler } from './services/healthCheckScheduler.js'
import { initializeAIProviders } from './config/ai-providers.js'
import { seedDefaultPrompts, seedDefaultAppProviders } from './services/ai-prompt.service.js'
import { seedGlobalProviders } from './services/provider-access.service.js'
import type { Server as IOServer } from 'socket.io'

// CORS origins for Socket.IO (all web apps can connect to the monitoring hub)
const socketCorsOrigins = getAllowedOrigins('ezstart')

// Initialize health check scheduler. Captured Socket.IO instance lives in
// closure scope so the `onHttpServerReady` hook can attach it later without
// touching module-level mutable state.
const healthCheckScheduler = new HealthCheckScheduler()
setScheduler(healthCheckScheduler)

// Deep-health checks executed by GET /health/deep. AI providers are
// gated on their respective env vars so the readiness probe never reports
// `down` on a dependency that's intentionally unconfigured. EZStart is the
// platform hub, so it surfaces the multi-provider AI gateway state on the
// status page. See `.claude/rules/standard-saas-observability.md` §4.
const deepHealthChecks: HealthCheck[] = [createMongoosePingCheck(mongoose)]
if (process.env.RESEND_API_KEY) {
  deepHealthChecks.push(createResendCheck(process.env.RESEND_API_KEY))
}
if (process.env.OPENAI_API_KEY) {
  deepHealthChecks.push(createOpenAICheck(process.env.OPENAI_API_KEY))
}
if (process.env.ANTHROPIC_API_KEY) {
  deepHealthChecks.push(createAnthropicCheck(process.env.ANTHROPIC_API_KEY))
}
if (process.env.GEMINI_API_KEY) {
  deepHealthChecks.push(createGeminiCheck(process.env.GEMINI_API_KEY))
}

// No cookie-auth routes: EZStart hub consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('ezstart', {
    mongoDbName: 'ezstart',
    cookieAuthRoutes: [],
    deepHealthChecks,
    onReady: ({ app }) => {
      // Health check endpoint (non-versioned, returns scheduler status too).
      // Mounted BEFORE versioned routes so it wins in the middleware chain.
      // createApiServer already mounts a basic GET /api/health — this overrides
      // it with the scheduler snapshot.
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

      // Seed AI providers + default prompts. AI providers init is sync;
      // seeders are fire-and-forget (non-blocking — errors are surfaced via
      // the seeders' own catch handlers).
      initializeAIProviders()
      seedDefaultPrompts('ezstart').catch(() => {
        /* non-blocking */
      })
      seedDefaultAppProviders().catch(() => {
        /* non-blocking */
      })
      seedGlobalProviders().catch(() => {
        /* non-blocking */
      })
    },
    serverConfig: {
      routes,
      registries,
      serviceName: 'Monitoring API',
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
          logger: {
            info: (msg, data) => (data !== undefined ? logger.info(msg, data) : logger.info(msg)),
            warn: (msg, data) => (data !== undefined ? logger.warn(msg, data) : logger.warn(msg)),
            error: (msg, data) =>
              data !== undefined ? logger.error(msg, data) : logger.error(msg),
            debug: (msg, data) =>
              data !== undefined ? logger.debug(msg, data) : logger.debug(msg),
          },
        })
          .then((instance: IOServer) => {
            healthCheckScheduler.setSocketIO(instance)
          })
          .catch(err => {
            logger.error('[Socket.IO] Failed to initialize', err)
          })
      },
    },
  }))
} catch (err) {
  logger.error('Failed to start Monitoring API', err)
  process.exit(1)
}

logger.info('[Scheduler] Starting health check scheduler...')
healthCheckScheduler.start()

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
