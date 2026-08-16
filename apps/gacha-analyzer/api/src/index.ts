// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  assertCriticalDeps,
  bootApi,
  createGeminiCheck,
  createMongoosePingCheck,
  createVersionedRouter,
  type HealthCheck,
} from '@ezstart/api-core'
import mongoose from 'mongoose'
import routes, { globalRegistry } from './routes/index.js'

// 🔒 Boot-time critical-deps gate (hacker-A8 V3 + A8.5 V5). Mongo + JWT
// are non-negotiable. GEMINI_API_KEY gates the core AI analyzer feature
// so it MUST be present in prod — without it the /health/deep probe
// silently skips its check and the status page shows "operational"
// while the analyzer is broken. Throws in prod, warns in dev. See
// `.claude/rules/standard-saas-observability.md` §4.
assertCriticalDeps({
  app: 'gacha-analyzer',
  required: ['MONGO_URL', 'JWT_SECRET', 'GEMINI_API_KEY'],
  logger,
})

// Deep-health checks executed by GET /health/deep. See
// `.claude/rules/standard-saas-observability.md` §4.
const deepHealthChecks: HealthCheck[] = [createMongoosePingCheck(mongoose)]
if (process.env.GEMINI_API_KEY) {
  deepHealthChecks.push(createGeminiCheck(process.env.GEMINI_API_KEY))
}

// No cookie-auth routes: gacha-analyzer consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('gacha-analyzer', {
    mongoDbName: 'game-analyzer',
    cookieAuthRoutes: [],
    deepHealthChecks,
    onReady: ({ app }) => {
      // Routes available at /api/* and /api/v1/*
      app.use(createVersionedRouter('/api', routes))
    },
    serverConfig: {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GachaAnalyzer',
    },
  }))
} catch (err) {
  logger.error('Failed to start Gacha Analyzer API', err)
  process.exit(1)
}

export { app }
