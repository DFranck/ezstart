// Updated: 2025-11-15 - App-specific roles support
// Load env BEFORE anything else (instrument.mts populates MONGO_URL etc.)
import './instrument.mjs'
import { logger } from '@ezstart/logger/server'
import {
  addVersionHeader,
  connectToMongo,
  createEzstartServer,
  createVersionedRouter,
  startServer,
} from '@ezstart/api-core'
import routes, { registries } from './routes/index.js'

// Fail-fast in production if the S2S key for ezauth cross-service validation
// is missing — without it `POST /api/keys` can't validate Applications against
// ezauth and Phase G seed flows silently 404. In dev/staging a warn is enough.
if (process.env.NODE_ENV === 'production' && !process.env.EZPAY_SERVER_EZAUTH_KEY) {
  logger.error('EZPAY_SERVER_EZAUTH_KEY is required in production. Aborting boot.')
  process.exit(1)
} else if (!process.env.EZPAY_SERVER_EZAUTH_KEY) {
  logger.warn(
    'EZPAY_SERVER_EZAUTH_KEY not set — cross-service Application validation will fail on POST /api/keys'
  )
}

// Create pre-configured server with Stripe webhook raw-body routes.
// No cookie-auth routes: EZPay is a pure Bearer/publishable-key API — it
// consumes EZAuth JWTs but never sets its own cookies. Tier 1/2 permissive
// CORS (ACAO: *) applies to every endpoint.
// See .claude/rules/standard-saas-cors.md.
const server = createEzstartServer('ezpay', {
  rawBodyRoutes: ['/api/webhooks/stripe', '/api/webhooks/stripe-connect'],
  cookieAuthRoutes: [],
})
const { app } = server

// API version headers on every response
app.use(addVersionHeader('v1'))

// Routes available at /api/* and /api/v1/*
app.use(createVersionedRouter('/api', routes))

// Start server
connectToMongo('ezpay')
  .then(() =>
    startServer(app, {
      routes,
      registries,
      serviceName: 'EZPay',
      port: server.config.port,
      logger: server.logger,
    })
  )
  .catch(err => {
    logger.error('Failed to start EZPay API', err)
    process.exit(1)
  })

export { app }
