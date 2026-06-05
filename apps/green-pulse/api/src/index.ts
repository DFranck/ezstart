// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import { bootApi, createVersionedRouter } from '@ezstart/api-core'
import routes, { globalRegistry } from './routes/index.js'

// No cookie-auth routes: green-pulse consumes EZAuth for identity, no own cookies.
// Tier 1/2 permissive CORS applies globally (see .claude/rules/standard-saas-cors.md).
let app: import('@ezstart/api-core').Express
try {
  ;({ app } = await bootApi('green-pulse', {
    mongoDbName: 'greenpulse',
    // Raw body capture for the ESG webhook receiver. The HMAC signature from
    // the upstream ESG SaaS is computed over the EXACT bytes sent on the wire
    // — re-serializing via `JSON.stringify(req.body)` is a future engine
    // upgrade time-bomb (Bun/Deno/V8 spec drift could change key ordering and
    // silently break every webhook). Both the unversioned and `/v1/` mount
    // points must be listed because `createVersionedRouter` exposes the route
    // at `/api/webhooks/esg-report` AND `/api/v1/webhooks/esg-report`.
    rawBodyRoutes: ['/api/webhooks/esg-report', '/api/v1/webhooks/esg-report'],
    cookieAuthRoutes: [],
    onReady: ({ app }) => {
      // Routes available at /api/* and /api/v1/*
      app.use(createVersionedRouter('/api', routes))
    },
    serverConfig: {
      routes,
      registries: globalRegistry,
      basePath: '/api',
      serviceName: 'GreenPulse',
    },
  }))
} catch (err) {
  logger.error('Failed to start GreenPulse API', err)
  process.exit(1)
}

export { app }
