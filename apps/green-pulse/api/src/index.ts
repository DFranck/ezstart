// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import { bootApi, createVersionedRouter } from '@ezstart/api-core'
import { ensureEsgWebhookEventIndexes } from './models/EsgWebhookEvent.js'
import { assertWebhookSecretConfigured } from './services/esg.service.js'
import routes, { globalRegistry } from './routes/index.js'

// 🔒 Fail-closed boot check (hacker A1b — V1): refuse to start in deployed
// environments when WEBHOOK_SIGNING_SECRET is unset. An empty secret would
// fall through to `crypto.createHmac('sha256', '')` and let any attacker
// forge ESG webhook signatures. In local dev / test this logs a warn and
// the handler returns 503 on every call.
assertWebhookSecretConfigured()

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
    onReady: async ({ app }) => {
      // 🔒 Build the EsgWebhookEvent unique `eventKey` index BEFORE accepting
      // traffic (hacker A1b — E2). `bootApi` runs `onReady` after
      // `connectToMongo` resolves and before `startServer` binds the
      // listener, so this guarantees the index exists before the first
      // webhook can be claimed. Without it, Mongoose's lazy/async index
      // build races the first deliveries → two inserts of the same
      // `eventKey` both succeed → duplicate side-effects.
      await ensureEsgWebhookEventIndexes()

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
