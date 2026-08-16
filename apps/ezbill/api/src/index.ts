// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  assertCriticalDeps,
  bootApi,
  createMongoosePingCheck,
  createResendCheck,
  createVersionedRouter,
  type HealthCheck,
} from '@ezstart/api-core'
import mongoose from 'mongoose'
import routes, { globalRegistry } from './routes/index.js'

// 🔒 Boot-time critical-deps gate (hacker-A8 V3 + A8.5 V5). EZBill is a
// consumer of ezauth + ezpay so RESEND_API_KEY is the only outbound
// integration — but it gates email flows (invoice email, reminders) so
// missing it in prod = silent skip → status page shows "operational"
// while emails are dead. Mongo + JWT are non-negotiable. Throws in prod,
// warns in dev. See `.claude/rules/standard-saas-observability.md` §4.
assertCriticalDeps({
  app: 'ezbill',
  required: ['MONGO_URL', 'JWT_SECRET', 'RESEND_API_KEY'],
  logger,
})

// Deep-health checks executed by GET /health/deep. See
// `.claude/rules/standard-saas-observability.md` §4.
const deepHealthChecks: HealthCheck[] = [createMongoosePingCheck(mongoose)]
if (process.env.RESEND_API_KEY) {
  deepHealthChecks.push(createResendCheck(process.env.RESEND_API_KEY))
}

// No cookie-auth routes: EZBill consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('ezbill', {
    mongoDbName: 'ezbill',
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
      serviceName: 'EZBill',
    },
  }))
} catch (err) {
  logger.error('Failed to start EZBill API', err)
  process.exit(1)
}

export { app }
