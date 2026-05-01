// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import { bootApi, createVersionedRouter } from '@ezstart/api-core'
import routes, { globalRegistry } from './routes/index.js'

// No cookie-auth routes: EZBill consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('ezbill', {
    mongoDbName: 'ezbill',
    cookieAuthRoutes: [],
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
